import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// `agentRunCollaborationMemberFileChanges(hostRunId, memberAddress, agentRunId)` (delegated-copies-slow-open D-3, REQ-004,
// AC-009, review R-B) over the real Studio HTTP/GraphQL server, on hubs made by real Agent roots (scripted AGY actor; no
// inference). Hub A delegates a task agent that produces a real generated-output artifact (`GENERATE_IMAGE:` directive of
// tests/fixtures/agy-failure-cli.mjs) and a two-member Team copy; hub B delegates the same task agent.
// - running hub: the task agent's artifact is listed from the live member projection; the run-id query, which serves
//   standalone runs only (run-file-change-owner-scoped-reads REQ-005, AC-007), gives the running copy nothing; the Team
//   copy's members answer with their (empty) lists;
// - a child of another hub, a wrong address, an unknown hub and a blank hub id are rejected with the hub-scoped error;
// - stopped hub: the same artifact is listed from the child's stored `file_changes.json`.
// Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts --no-watch
// About 1 minute.
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted AGY actor's files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "member-file-changes-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const ARTIFACT = "copy-artifact.png";
const NOT_FOUND = /was not found among the delegated copies of Agent run/;
type Child = { host: string; address: string; agentRunId: string };

suite("agentRunCollaborationMemberFileChanges over real GraphQL (hubs made by real Agent roots)", () => {
  let h: CollaborationHarness;
  let hubA!: Awaited<ReturnType<CollaborationHarness["startRoot"]>>;
  let worker!: Child;
  let foreignWorker!: Child;
  let teamMembers: Child[] = [];

  const scoped = async (host: string, address: string, agentRunId: string) => {
    try {
      const data = await h.graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberFileChanges(hostRunId:$h,memberAddress:$a,agentRunId:$r){id runId path type status sourceTool}}`,
        { h: host, a: address, r: agentRunId });
      return { entries: data.agentRunCollaborationMemberFileChanges as Rec[], error: null as string | null };
    } catch (error) { return { entries: null, error: String((error as Error).message) }; }
  };
  const generic = async (runId: string) => (await h.graphql(`query($r:String!){getRunFileChanges(runId:$r){id runId path type status sourceTool}}`, { r: runId })).getRunFileChanges as Rec[];
  const artifactOf = (child: Child) => ({ id: `${child.agentRunId}:${ARTIFACT}`, runId: child.agentRunId, path: ARTIFACT, type: "image", status: "available", sourceTool: "generated_output" });

  beforeAll(async () => {
    h = await startCollaborationHarness("member-file-changes-e2e");
    const suffix = Math.random().toString(16).slice(2, 8);
    const manager = await h.agentDefinition(`MFC host ${suffix}`);
    const workerName = `MFC worker ${suffix}`;
    const lead = await h.agentDefinition(`MFC lead ${suffix}`);
    const mate = await h.agentDefinition(`MFC mate ${suffix}`);
    await h.agentDefinition(workerName);
    const teamName = `MFC team ${suffix}`;
    await h.teamDefinition(teamName, [["lead", lead], ["mate", mate]], "lead");

    hubA = await h.startRoot("agent", { manager });
    const delegated = await hubA.calls(hubA.managerRunId, "/", callTool("delegate_task", {
      recipient_address: `/${segment(workerName)}`, description: `GENERATE_IMAGE:${path.join(h.workspace, ARTIFACT)} \nProduce the image.` }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
    await hubA.waitForTaskAgent(delegated.target_agent_run_id as string);
    worker = { host: hubA.rootId, address: `/${segment(workerName)}`, agentRunId: delegated.target_agent_run_id as string };
    const team = await hubA.calls(hubA.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(teamName)}`, description: "Reply OK." }));
    expect(team, JSON.stringify(team)).toMatchObject({ delegated: true });
    await until(async () => (await hubA.taskAgents()).some((agent) => agent.teamRunId && agent.members.length === 2), "Team copy recorded", 60_000);
    teamMembers = (await hubA.taskAgents()).find((agent) => agent.teamRunId)!.members
      .map((member) => ({ host: hubA.rootId, address: member.address, agentRunId: member.agentRunId }));

    const hubB = await h.startRoot("agent", { manager });
    const other = await hubB.calls(hubB.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(workerName)}`, description: "Reply OK." }));
    expect(other, JSON.stringify(other)).toMatchObject({ delegated: true });
    await hubB.waitForTaskAgent(other.target_agent_run_id as string);
    foreignWorker = { host: hubB.rootId, address: `/${segment(workerName)}`, agentRunId: other.target_agent_run_id as string };
    hubB.close();
    await h.terminate("agent", hubB.rootId);
  }, 300_000);

  afterAll(async () => {
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  it("running hub: lists the copy's live artifact; the run-id query gives the copy nothing", async () => {
    let result: Awaited<ReturnType<typeof scoped>> = { entries: null, error: null };
    await until(async () => (result = await scoped(worker.host, worker.address, worker.agentRunId)).entries?.length === 1, "live artifact listed", 60_000);
    expect(result.error).toBeNull();
    expect(result.entries).toEqual([artifactOf(worker)]);
    expect(await generic(worker.agentRunId)).toEqual([]);
    // The Team copy's members (coordinator and a never-started member) answer with their own (empty) lists.
    expect(teamMembers).toHaveLength(2);
    for (const member of teamMembers) expect(await scoped(member.host, member.address, member.agentRunId)).toEqual({ entries: [], error: null });
  });

  it("rejects a child of another hub, a wrong address, an unknown hub and a blank hub id", async () => {
    const cases: Array<[string, string, string, RegExp]> = [
      [worker.host, foreignWorker.address, foreignWorker.agentRunId, NOT_FOUND],
      [foreignWorker.host, worker.address, worker.agentRunId, NOT_FOUND],
      [worker.host, "/not_a_member", worker.agentRunId, NOT_FOUND],
      [worker.host, teamMembers[0]!.address, worker.agentRunId, NOT_FOUND],
      ["unknown-hub-run", worker.address, worker.agentRunId, NOT_FOUND],
      [" ", worker.address, worker.agentRunId, /hostRunId is required/],
    ];
    for (const [host, address, agentRunId, message] of cases) {
      const result = await scoped(host, address, agentRunId);
      expect(result.entries, `${host} ${address} ${agentRunId}`).toBeNull();
      expect(result.error, `${host} ${address} ${agentRunId}`).toMatch(message);
    }
  });

  it("stopped hub: lists the same artifact from the copy's stored file", async () => {
    hubA.close();
    await h.terminate("agent", hubA.rootId);
    const result = await scoped(worker.host, worker.address, worker.agentRunId);
    expect(result).toEqual({ entries: [artifactOf(worker)], error: null });
    expect(await generic(worker.agentRunId)).toEqual([]);
    // The stored source: the server-written file_changes.json in the copy's own memory folder.
    const stored = await findFile(path.join(h.dataDir, "memory"), worker.agentRunId, "file_changes.json");
    expect(stored, "stored file_changes.json of the copy").toBeTruthy();
    expect(JSON.parse(await fsp.readFile(stored!, "utf8")).entries.map((entry: Rec) => entry.path)).toEqual([ARTIFACT]);
  });
});

/** The `<name>` file inside the folder named `<runId>` under `root`. */
const findFile = async (root: string, runId: string, name: string): Promise<string | null> => {
  for (const entry of await fsp.readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory()) continue;
    const full = path.join(root, entry.name);
    if (entry.name === runId && fs.existsSync(path.join(full, name))) return path.join(full, name);
    const found = await findFile(full, runId, name);
    if (found) return found;
  }
  return null;
};
