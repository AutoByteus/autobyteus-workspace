import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// autobyteus-461 C14-01 (code review round 14): every history list read reads each listed Team's and Org's rows, and each
// delegated child's own file, through RunViewChildren.read() (listed-team-rows.ts, collaboration-root-history.ts); the web
// re-reads the list every 5 s while quiet. This measures the two list reads the web polls (ListWorkspaceRunHistory and
// ListCollaborationRootHistory, the web's own query texts) with no delegated runs and with many delegated runs under listed
// Teams and Orgs, through the real Studio HTTP/GraphQL server and real delegations (scoped MCP `delegate_task`, scripted AGY).
// A measurement, so it is gated: RUN_AGY_FAILURE_E2E=1 RUN_HISTORY_LIST_TIMING=1 (scripted AGY CLI as the other suites).
// HISTORY_LIST_TIMING_OUT=<file> writes the measurement as JSON.
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_HISTORY_LIST_TIMING"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "c14-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && process.env.RUN_HISTORY_LIST_TIMING === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const ROOTS_PER_KIND = Number(process.env.HISTORY_LIST_TIMING_ROOTS ?? 3);
const AGENTS_PER_ROOT = Number(process.env.HISTORY_LIST_TIMING_AGENTS ?? 10);
const TEAMS_PER_ROOT = Number(process.env.HISTORY_LIST_TIMING_TEAMS ?? 2);
const READS = 15;

// The web's own list queries (autobyteus-web graphql/queries/runHistoryQueries.ts, collaborationRootHistoryQueries.ts).
const LIST_WORKSPACE_RUN_HISTORY = `query ListWorkspaceRunHistory($limitPerAgent: Int = 6) { listWorkspaceRunHistory(limitPerAgent: $limitPerAgent) {
  workspaceRootPath workspaceName
  agentDefinitions { agentDefinitionId agentName runs { runId summary createdAt lastActivityAt archivedAt terminatedAt status isActive shouldConnectStream statusSource hasCollaboration } }
  teamDefinitions { teamDefinitionId teamDefinitionName runs { teamRunId teamDefinitionId teamDefinitionName coordinatorAddress workspaceRootPath summary createdAt lastActivityAt archivedAt terminatedAt isActive rootTeam
    members { memberAddress displayName agentRunId status runtimeKind workspaceRootPath } } } } }`;
const LIST_COLLABORATION_ROOT_HISTORY = `query ListCollaborationRootHistory { listCollaborationRootHistory { __typename
  ... on AgentOrgRootHistoryObject { root_subject_kind root_run_id created_at last_activity_at archived_at is_active summary org closed_task_executions }
  ... on AgentTeamRootHistoryObject { root_subject_kind root_run_id } } }`;

const stats = (ms: number[]) => {
  const sorted = [...ms].sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
  return { reads: ms.length, p50: Math.round(at(0.5)), p95: Math.round(at(0.95)), max: Math.round(sorted.at(-1)!), min: Math.round(sorted[0]!) };
};

suite("C14-01: the history list reads' time with many delegated runs under listed Teams and Orgs (real HTTP/GraphQL, scoped MCP, scripted AGY)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const measurement: Rec = { rootsPerKind: ROOTS_PER_KIND, agentsPerRoot: AGENTS_PER_ROOT, teamsPerRoot: TEAMS_PER_ROOT, reads: READS };

  beforeAll(async () => {
    h = await startCollaborationHarness("c14-e2e");
    const suffix = Math.random().toString(16).slice(2, 8);
    for (const key of ["manager", "mate", "worker"]) ids[key] = await h.agentDefinition(`C14 ${key} ${suffix}`);
    ids.workerName = `C14 worker ${suffix}`;
    ids.team = await h.teamDefinition(`C14 Team ${suffix}`, [["manager", ids.manager], ["mate", ids.mate]], "manager");
    ids.squadName = `C14 Squad ${suffix}`;
    ids.squad = await h.teamDefinition(ids.squadName, [["lead", ids.mate], ["peer", ids.worker]], "lead");
    ids.org = await h.orgDefinition(`C14 Org ${suffix}`, [{ memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" }], []);
  }, 180_000);

  afterAll(async () => {
    const out = process.env.HISTORY_LIST_TIMING_OUT;
    if (out) fs.writeFileSync(out, `${JSON.stringify(measurement, null, 2)}\n`);
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 600_000);

  /** READS sequential reads of each list query, as the quiet poll issues them; wall time per read in ms. */
  const timeReads = async () => {
    const run = async (query: string) => {
      const ms: number[] = [];
      for (let i = 0; i < READS; i += 1) {
        const started = performance.now();
        await h.graphql(query);
        ms.push(performance.now() - started);
      }
      return stats(ms);
    };
    return { listWorkspaceRunHistory: await run(LIST_WORKSPACE_RUN_HISTORY), listCollaborationRootHistory: await run(LIST_COLLABORATION_ROOT_HISTORY) };
  };
  const rowsIn = (value: unknown): number => {
    let count = 0;
    const visit = (v: unknown) => {
      if (Array.isArray(v)) { v.forEach(visit); return; }
      if (!v || typeof v !== "object") return;
      const r = v as Rec;
      if ((r.startedAt ?? r.started_at) && (r.agentRunId ?? r.agent_run_id ?? r.teamRunId ?? r.team_run_id)) count += 1;
      Object.values(r).forEach(visit);
    };
    visit(value);
    return count;
  };

  it("times the two list reads before and after many delegations under listed Teams and Orgs", async () => {
    const roots: Array<Awaited<ReturnType<CollaborationHarness["startRoot"]>>> = [];
    for (let i = 0; i < ROOTS_PER_KIND; i += 1) { roots.push(await h.startRoot("team", ids)); roots.push(await h.startRoot("org", ids)); }
    // The first list reads warm the server's caches as a running app has them.
    await timeReads();
    measurement.before = await timeReads();

    // Each root's manager delegates through its real scoped MCP tool (its runtime capsule exists once it has run a turn).
    let delegated = 0;
    for (const root of roots) {
      await root.sendTo(root.managerRunId, "Reply OK.");
      await until(async () => h.promptOf(root.managerRunId).then(() => true, () => false), `manager of ${root.rootId} started`, 60_000);
      for (let i = 0; i < AGENTS_PER_ROOT + TEAMS_PER_ROOT; i += 1) {
        const team = i >= AGENTS_PER_ROOT;
        const address = `/${String(team ? ids.squadName : ids.workerName).toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
        const result = await h.mcpCall(root.managerRunId, "delegate_task", { recipient_address: address, description: `Reply OK. C14 ${i}` });
        expect(result.isError, result.text).toBe(false);
        expect(result.text).toContain('"delegated":true');
        delegated += 1;
      }
    }
    measurement.delegated = delegated;
    // The listed rows show every delegated run before the second measurement.
    await until(async () => {
      const team = rowsIn(await h.graphql(LIST_WORKSPACE_RUN_HISTORY));
      const org = rowsIn(await h.graphql(LIST_COLLABORATION_ROOT_HISTORY));
      measurement.rowsListed = { team, org };
      return team + org >= delegated;
    }, "every delegated run listed under its Team or Org", 180_000);
    await timeReads();
    measurement.after = await timeReads();
    console.log(`C14-01 measurement: ${JSON.stringify(measurement)}`);
    expect(measurement.rowsListed).toBeTruthy();
  }, 1_800_000);
});
