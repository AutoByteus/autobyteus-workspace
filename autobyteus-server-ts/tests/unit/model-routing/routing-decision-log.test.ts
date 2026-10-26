import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoutingDecisionRecord } from "../../../src/model-routing/domain/model-routing-types.js";
import { RoutingStatistics } from "../../../src/model-routing/services/routing-statistics.js";
import { RoutingDecisionLog } from "../../../src/model-routing/stores/routing-decision-log.js";

const dirs: string[] = [];
afterEach(async () => { await Promise.all(dirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); vi.restoreAllMocks(); });
const tempDir = async () => { const dir = await fs.mkdtemp(path.join(os.tmpdir(), "routing-log-")); dirs.push(dir); return dir; };

/** A synthesized record (REQ-012 fields); a delegation is its time, delegating run and copy. */
const record = (overrides: Partial<RoutingDecisionRecord>): RoutingDecisionRecord => ({
  recordedAt: "2026-10-26T09:00:00.000Z", taskId: "task-1", taskKey: "autobyteus-1", projectId: "project-1", taskTitle: "First Task",
  delegatingRunId: "pm_run", delegatingAgentName: "project_task_manager", fromNode: null,
  copyAddress: "/set", copyKind: "agent_team", agentAddress: "/set/implementation_engineer",
  runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", source: "model_router", taskKind: "implementation",
  choiceReason: "Codex fits.", routerFailure: null, notes: [],
  ...overrides,
});

describe("RoutingDecisionLog (REQ-012, D1, D2)", () => {
  it("appends records and reads them back; an unreadable line is skipped with a warning (DESIGN.md rule 7)", async () => {
    const dir = await tempDir();
    const log = new RoutingDecisionLog({ dir });
    await log.record([record({}), record({ agentAddress: "/set/code_reviewer", source: "team_default", taskKind: null, choiceReason: null })]);
    await fs.appendFile(path.join(dir, "decisions_active.jsonl"), "{not json}\n{\"half\":");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect((await log.readAll()).map((entry) => entry.agentAddress)).toEqual(["/set/implementation_engineer", "/set/code_reviewer"]);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("decisions_active.jsonl line 3 is skipped (not valid JSON)"));
    // The unfinished last line is cut off by the next append; the new record reads.
    await log.record([record({ recordedAt: "2026-10-26T10:00:00.000Z" })]);
    expect(await log.readAll()).toHaveLength(3);
  });

  it("groups by Task, newest delegation first; the source filter is applied before paging; `before` continues", async () => {
    const log = new RoutingDecisionLog({ dir: await tempDir() });
    await log.record([
      record({}),
      record({ agentAddress: "/set/code_reviewer", source: "team_default", taskKind: null, choiceReason: null }),
    ]);
    await log.record([record({ recordedAt: "2026-10-26T11:00:00.000Z", taskId: "task-2", taskKey: "autobyteus-2", taskTitle: "Second Task",
      copyAddress: "/writer", copyKind: "agent", agentAddress: "/writer", source: "agent_default", taskKind: null, choiceReason: null })]);
    await log.record([record({ recordedAt: "2026-10-26T12:00:00.000Z", copyAddress: "/reviewer", copyKind: "agent", agentAddress: "/reviewer" })]);
    const all = await log.listTaskGroups({ limit: 10 });
    expect(all.totalTasks).toBe(2);
    expect(all.groups.map((group) => [group.taskKey, group.latestAt, group.delegations.length])).toEqual([
      ["autobyteus-1", "2026-10-26T12:00:00.000Z", 2], ["autobyteus-2", "2026-10-26T11:00:00.000Z", 1],
    ]);
    const routed = await log.listTaskGroups({ limit: 10, source: "router" });
    expect(routed.totalTasks).toBe(1);
    expect(routed.groups[0]!.delegations.map((delegation) => delegation.records.map((entry) => entry.agentAddress))).toEqual([["/reviewer"], ["/set/implementation_engineer"]]);
    const page = await log.listTaskGroups({ limit: 1 });
    expect((await log.listTaskGroups({ limit: 1, before: page.groups[0]!.latestAt })).groups.map((group) => group.taskKey)).toEqual(["autobyteus-2"]);
  });

  it("a copy started for a peer whose Task did not exist yet is its own group", async () => {
    const log = new RoutingDecisionLog({ dir: await tempDir() });
    await log.record([record({ taskId: null, taskKey: null, projectId: null, delegatingRunId: null, fromNode: "desktop", taskTitle: "Publish it." })]);
    await log.record([record({ recordedAt: "2026-10-26T09:05:00.000Z", taskId: null, taskKey: null, projectId: null, delegatingRunId: null, fromNode: "desktop" })]);
    expect((await log.listTaskGroups({ limit: 10 })).totalTasks).toBe(2);
  });

  it("seals the active file at the rotation limit; sealed files read first", async () => {
    const dir = await tempDir();
    const log = new RoutingDecisionLog({ dir, rotationLimitBytes: 200 });
    await log.record([record({})]);
    await log.record([record({ recordedAt: "2026-10-26T10:00:00.000Z" })]);
    expect((await fs.readdir(dir)).sort()).toEqual(["decisions_000001.jsonl", "decisions_000002.jsonl"]);
    expect((await log.readAll()).map((entry) => entry.recordedAt)).toEqual(["2026-10-26T09:00:00.000Z", "2026-10-26T10:00:00.000Z"]);
  });
});

describe("RoutingStatistics (D4: agents, not Tasks; this node's records only)", () => {
  it("counts sources, per task kind (ignoring letter case) runtimes and models, not routed, and router failures for a period", async () => {
    const records = [
      record({ recordedAt: "2026-10-25T09:00:00.000Z" }),
      record({ recordedAt: "2026-10-25T09:00:00.000Z", agentAddress: "/set/b", taskKind: "Implementation", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet" }),
      record({ recordedAt: "2026-10-25T09:00:00.000Z", agentAddress: "/set/c", taskKind: "code review" }),
      record({ recordedAt: "2026-10-25T09:00:00.000Z", agentAddress: "/set/d", source: "agent_default", taskKind: null, choiceReason: null }),
      record({ recordedAt: "2026-10-25T09:00:00.000Z", agentAddress: "/set/e", source: "inherited", taskKind: null, choiceReason: null,
        routerFailure: "no valid answer within 40 seconds", runtimeKind: "claude_agent_sdk", llmModelIdentifier: "opus" }),
      record({ recordedAt: "2026-09-01T09:00:00.000Z", agentAddress: "/old" }),
    ];
    const statistics = new RoutingStatistics({ readAll: async () => records }, () => Date.parse("2026-10-26T09:00:00.000Z"));
    const week = await statistics.forPeriod(7);
    expect(week).toMatchObject({
      totalAgents: 5,
      sources: { model_router: 3, agent_default: 1, team_default: 0, inherited: 1 },
      routerFailures: 1,
      notRouted: { count: 2 },
    });
    expect(week.taskKinds).toEqual([
      // One "implementation" and one "Implementation" this week: one kind, shown with the newest spelling on a tie.
      { taskKind: "Implementation", count: 2,
        runtimes: [{ runtimeKind: "claude_agent_sdk", count: 1 }, { runtimeKind: "codex_app_server", count: 1 }],
        models: [{ runtimeKind: "claude_agent_sdk", llmModelIdentifier: "sonnet", count: 1 }, { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", count: 1 }] },
      { taskKind: "code review", count: 1, runtimes: [{ runtimeKind: "codex_app_server", count: 1 }],
        models: [{ runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-sol", count: 1 }] },
    ]);
    expect((await statistics.forPeriod("all")).totalAgents).toBe(6);
    expect(await statistics.taskKindsInUse()).toEqual([{ taskKind: "implementation", count: 3 }, { taskKind: "code review", count: 1 }]);
  });
});
