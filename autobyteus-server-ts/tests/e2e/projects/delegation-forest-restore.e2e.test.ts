import "reflect-metadata";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, objectsIn, segment, startCollaborationHarness, stringsOf, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// remove-nested-task-team AC-003 (REQ-001, REQ-004): delegation keeps working now that a team's members are agents only.
// A delegation forest — a member delegates a task agent team, a member of that task team delegates another task agent team,
// whose member delegates a task agent — is built through the real Studio HTTP/WebSocket/GraphQL server, the Team, Agent and
// Org roots, scoped MCP tools and the AGY backend (only the external AGY CLI is scripted: `CALL_TOOL:{...}` makes an agent call
// the real tool). Each root: every team record in the stored tree has agent members only and the forest is recorded through
// task executions; after Stop → reopen (a message restores the root) the same forest is restored and its deepest task agent
// is reached by run id from the restored task team member that delegated it. In the Org root the first task team is a copy of a
// mounted team (an organization's team), which stays unchanged (REQ-004).
// Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegation-forest-restore.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "df-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Root = Awaited<ReturnType<CollaborationHarness["startRoot"]>>;

/** Every team record of a tree (camelCase or snake_case): a record with a team run id and members. */
const teamRecords = (tree: unknown) => objectsIn(tree).filter((record) => (record.teamRunId ?? record.team_run_id) && Array.isArray(record.members));
/** The forest as comparable edges: delegator run id → task execution id (agent run id or team run id), with its address. */
const forestEdges = (tree: unknown): string[] => objectsIn(tree).flatMap((record) => {
  const startedAt = record.startedAt ?? record.started_at;
  const id = record.teamRunId ?? record.team_run_id ?? record.agentRunId ?? record.agent_run_id;
  const delegator = record.delegatorAgentRunId ?? record.delegator_agent_run_id;
  return typeof startedAt === "string" && id && delegator ? [`${delegator} -> ${record.address} ${id}`] : [];
}).sort();

suite("Delegation forest through Stop → reopen (real HTTP/WS/GraphQL/scoped MCP, scripted AGY actor)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("df-e2e");
    const suffix = Math.random().toString(16).slice(2, 8);
    for (const key of ["manager", "mate", "lead", "peer", "builder", "checker", "helper"]) { names[key] = `DF ${key} ${suffix}`; ids[key] = await h.agentDefinition(names[key]); }
    names.team = `DF Team ${suffix}`;
    ids.team = await h.teamDefinition(names.team, [["manager", ids.manager], ["mate", ids.mate]], "manager");
    names.squad = `DF Squad ${suffix}`;
    ids.squad = await h.teamDefinition(names.squad, [["lead", ids.lead], ["peer", ids.peer]], "lead");
    names.crew = `DF Crew ${suffix}`;
    ids.crew = await h.teamDefinition(names.crew, [["builder", ids.builder], ["checker", ids.checker]], "builder");
    ids.org = await h.orgDefinition(`DF Org ${suffix}`, [
      { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
      { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }], []);
  }, 180_000);

  afterAll(async () => {
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  /** Builds the forest from `from` (run id, address) delegating `firstAddress`; returns the run ids of each level. */
  const buildForest = async (root: Root, from: string, fromAddress: string, firstAddress: string) => {
    const first = await root.calls(from, fromAddress, callTool("delegate_task", { recipient_address: firstAddress, description: "Level 1." }));
    expect(first, JSON.stringify(first)).toMatchObject({ delegated: true, target_kind: "team" });
    const t1 = await root.waitForTaskAgent(first.target_team_run_id as string);
    const t1Coordinator = first.target_team_coordinator_agent_run_id as string;
    const t1CoordinatorAddress = t1.members.find((member) => member.agentRunId === t1Coordinator)!.address;
    const second = await root.calls(t1Coordinator, t1CoordinatorAddress, callTool("delegate_task", { recipient_address: `/${segment(names.crew)}`, description: "Level 2." }));
    expect(second, JSON.stringify(second)).toMatchObject({ delegated: true, target_kind: "team" });
    const t2 = await root.waitForTaskAgent(second.target_team_run_id as string);
    const t2Coordinator = second.target_team_coordinator_agent_run_id as string;
    const t2CoordinatorAddress = t2.members.find((member) => member.agentRunId === t2Coordinator)!.address;
    const third = await root.calls(t2Coordinator, t2CoordinatorAddress, callTool("delegate_task", { recipient_address: `/${segment(names.helper)}`, description: "Level 3." }));
    expect(third, JSON.stringify(third)).toMatchObject({ delegated: true, target_kind: "agent" });
    await root.waitForTaskAgent(third.target_agent_run_id as string);
    return { t1: first.target_team_run_id as string, t2: second.target_team_run_id as string, t2Coordinator, t2CoordinatorAddress, leaf: third.target_agent_run_id as string };
  };

  /** Agent-only members in every team record, and the three levels recorded under their delegators. */
  const expectForest = (tree: unknown, forest: Awaited<ReturnType<typeof buildForest>>, label: string) => {
    const teams = teamRecords(tree);
    expect(teams.length, `${label}: team records`).toBeGreaterThanOrEqual(2);
    for (const team of teams) {
      for (const member of team.members as Rec[]) {
        expect(member.agentRunId ?? member.agent_run_id, `${label}: member ${member.address} of ${team.address} is an agent`).toBeTruthy();
        expect(member.teamRunId ?? member.team_run_id ?? member.members, `${label}: member ${member.address} of ${team.address} is not a team`).toBeUndefined();
      }
    }
    const edges = forestEdges(tree).join("\n");
    for (const id of [forest.t1, forest.t2, forest.leaf]) expect(edges, `${label}: ${id} recorded`).toContain(id);
    expect(edges, `${label}: the leaf is delegated by the level-2 coordinator`).toContain(`${forest.t2Coordinator} -> /${segment(names.helper)} ${forest.leaf}`);
  };

  const stopReopenAndReach = async (root: Root, forest: Awaited<ReturnType<typeof buildForest>>, label: string) => {
    const before = forestEdges(await root.liveTree());
    root.close();
    await h.terminate(root.kind, root.rootId);
    const reopened = await h.reopenRoot(root);
    // The restored level-2 coordinator reaches its own task agent by run id.
    const reached = await reopened.calls(forest.t2Coordinator, forest.t2CoordinatorAddress, callTool("send_message_to", { target_agent_run_id: forest.leaf, content: "Still there?" }));
    expect(reached, `${label}: ${JSON.stringify(reached)}`).toMatchObject({ accepted: true });
    await until(async () => stringsOf(await reopened.conversationOf(forest.leaf, `/${segment(names.helper)}`)).some((text) => text.includes("Still there?")),
      `${label}: the restored leaf receives the message`, 60_000);
    const after = await reopened.liveTree();
    expect(forestEdges(after), `${label}: the same forest after reopen`).toEqual(before);
    expectForest(after, forest, `${label} after reopen`);
    reopened.close();
    await h.terminate(root.kind, root.rootId);
  };

  it("DF-1 Team root: a member delegates a task team that delegates a task team that delegates a task agent; restored after Stop", async () => {
    const root = await h.startRoot("team", ids);
    const forest = await buildForest(root, root.managerRunId, "/manager", `/${segment(names.squad)}`);
    expectForest(await root.liveTree(), forest, "team root");
    await stopReopenAndReach(root, forest, "team root");
  }, 400_000);

  it("DF-2 Agent root: the agent the user started heads the same forest; restored after Stop", async () => {
    const root = await h.startRoot("agent", ids);
    const forest = await buildForest(root, root.managerRunId, "/", `/${segment(names.squad)}`);
    expectForest(await root.liveTree(), forest, "agent root");
    await stopReopenAndReach(root, forest, "agent root");
  }, 400_000);

  it("DF-3 Org root: the direct agent delegates a copy of the mounted team, which heads the forest; the mounted team is unchanged; restored after Stop", async () => {
    const root = await h.startRoot("org", ids);
    const mountedBefore = JSON.stringify(objectsIn(await root.liveTree()).find((record) => record.address === "/squad" && Array.isArray(record.members))?.members ?? null);
    const forest = await buildForest(root, root.managerRunId, "/manager", "/squad");
    const tree = await root.liveTree();
    expectForest(tree, forest, "org root");
    const mounted = objectsIn(tree).find((record) => record.address === "/squad" && Array.isArray(record.members) && !(record.startedAt ?? record.started_at));
    expect(mounted, "the mounted team stays in the organization").toBeTruthy();
    expect(JSON.stringify(mounted!.members), "the mounted team's members are unchanged").toBe(mountedBefore);
    await stopReopenAndReach(root, forest, "org root");
  }, 400_000);
});
