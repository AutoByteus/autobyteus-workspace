import { currentTaskOf, openChildrenOf } from "../../helpers/delegation-index-of.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { taskRunResources } from "../../helpers/task-run-resources.js";

const host = { kind: "agent_team", runId: "manager-root" };
const entry = (agentRun: Record<string, string>, linkedAt: string, closedAt: string | null, extra: Record<string, unknown> = {}) => ({
  role: "assigned", recipientAddress: "/worker", delegatedFrom: { delegatingRun: host, delegatorAgentRunId: "manager" }, agentRun, linkedAt, start: "started", closedAt, ...extra });
const team = { kind: "team", teamRunId: "review-team", coordinatorAgentRunId: "lead" };

/** The one owner of the current-entry rule: open entry, else the latest `linkedAt` (tie: greater Task ID). */
describe("TaskExecutionResourceService current entry", () => {
  let appData: string, layout: ProjectsLayout, service: TaskExecutionResourceService;
  const write = async (taskId: string, agentRunResources: unknown[]) => {
    const file = layout.taskExecutionResourcesFile("project_P", taskId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({ taskId, agentRunResources }));
  };
  const boot = async () => {
    service = taskRunResources(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))));
    await service.load();
    return service;
  };

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "current-entry-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("a reused run's closed sub-work from its earlier Task is its own run's Task work, never a cross-Task conflict", async () => {
    await write("task_A", [entry(team, "2026-10-09T10:00:00.000Z", "2026-10-09T11:00:00.000Z"),
      { role: "subWork", recipientAddress: "/worker", delegatedFrom: { delegatingRun: { kind: "agent_team", runId: "review-team" }, delegatorAgentRunId: "lead" },
        agentRun: { kind: "agent", agentRunId: "sub-work" }, linkedAt: "2026-10-09T10:30:00.000Z", start: "started", closedAt: "2026-10-09T11:00:00.000Z" }]);
    await write("task_B", [entry(team, "2026-10-09T12:00:00.000Z", null)]);
    await boot();
    // The sub-work run is its own run: its own Task work decides.
    expect(currentTaskOf(service, { agentRunId: "sub-work" })).toMatchObject({ taskId: "task_A", role: "subWork", open: false });
    expect(currentTaskOf(service, { teamRunId: "review-team" })).toMatchObject({ taskId: "task_B", open: true });
    expect(openChildrenOf(service, { rootSubjectKind: "agent_team", rootRunId: "review-team" })).toEqual([]);
    expect(service.releasable("task_A")).toEqual([{ run: { agentRunId: "sub-work" } }]);
    expect(service.releasable("task_B")).toEqual([]);
    expect(service.rootTaskLocationOf({ teamRunId: "review-team" })).toEqual({ projectId: "project_P", taskId: "task_B" });
  });

  it("with no open entry, the latest linkedAt is current; a tie goes to the greater Task ID", async () => {
    await write("task_A", [entry(team, "2026-10-09T10:00:00.000Z", "2026-10-09T11:00:00.000Z")]);
    await write("task_B", [entry(team, "2026-10-09T12:00:00.000Z", "2026-10-09T13:00:00.000Z")]);
    await write("task_C", [entry({ kind: "agent", agentRunId: "twin" }, "2026-10-09T09:00:00.000Z", "2026-10-09T09:30:00.000Z")]);
    await write("task_D", [entry({ kind: "agent", agentRunId: "twin" }, "2026-10-09T09:00:00.000Z", "2026-10-09T09:30:00.000Z")]);
    await boot();
    expect(service.locationOf({ teamRunId: "review-team" })).toEqual({ projectId: "project_P", taskId: "task_B" });
    // With no open entry left, a (repeated) close of any of its Tasks asks to stop it.
    expect(service.releasable("task_A")).toEqual([{ run: { teamRunId: "review-team" } }]);
    expect(service.releasable("task_B")).toEqual([{ run: { teamRunId: "review-team" } }]);
    expect(service.locationOf({ agentRunId: "twin" })).toEqual({ projectId: "project_P", taskId: "task_D" });
    expect(service.earlierTaskLocationsOf({ teamRunId: "review-team" })).toEqual([{ projectId: "project_P", taskId: "task_A" }]);
  });

  it("a copy may hold several open entries: the newest is current, none is logged, it is open and never releasable (task-agent-several-tasks)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await write("task_A", [entry(team, "2026-10-09T10:00:00.000Z", null)]);
    await write("task_B", [entry(team, "2026-10-09T12:00:00.000Z", null)]);
    await write("task_C", [entry(team, "2026-10-09T08:00:00.000Z", "2026-10-09T09:00:00.000Z")]);
    await boot();
    expect(service.locationOf({ teamRunId: "review-team" })).toEqual({ projectId: "project_P", taskId: "task_B" });
    expect(service.isOpen({ teamRunId: "review-team" })).toBe(true);
    expect(service.openTaskIdsOf({ teamRunId: "review-team" })).toEqual(["task_A", "task_B"]);
    for (const taskId of ["task_A", "task_B", "task_C"]) expect(service.releasable(taskId)).toEqual([]);
    expect(error).not.toHaveBeenCalled();
  });

  it("a copy's history spans every Task file: it ever started when any period started", async () => {
    await write("task_A", [entry(team, "2026-10-09T10:00:00.000Z", "2026-10-09T11:00:00.000Z")]);
    await write("task_B", [entry(team, "2026-10-09T12:00:00.000Z", "2026-10-09T13:00:00.000Z", { start: "failed", startError: { code: "X", message: "m" } })]);
    await boot();
    expect(service.historyOf({ teamRunId: "review-team" })).toEqual({ currentTaskId: "task_B", everStarted: true,
      current: expect.objectContaining({ start: "failed", linkedAt: "2026-10-09T12:00:00.000Z" }) });
    expect(service.historyOf({ agentRunId: "never-linked" })).toBeNull();
  });
});
