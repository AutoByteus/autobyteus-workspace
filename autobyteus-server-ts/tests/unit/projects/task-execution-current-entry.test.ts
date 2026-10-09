import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";

const host = { kind: "agent_team", runId: "manager-root" };
const entry = (agentRun: Record<string, string>, linkedAt: string, closedAt: string | null, extra: Record<string, unknown> = {}) => ({
  role: "assigned", assignedBy: "manager", hostRoot: host, agentRun, linkedAt, start: "started", closedAt, ...extra });
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
    service = new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))));
    await service.load();
    return service;
  };

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "current-entry-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("a reused copy's closed sub-work from its earlier Task is decided by the innermost element, never a cross-Task conflict", async () => {
    await write("task_A", [entry(team, "2026-10-09T10:00:00.000Z", "2026-10-09T11:00:00.000Z"),
      { role: "delegated", hostRoot: host, agentRun: { kind: "agent", agentRunId: "sub-work" }, linkedAt: "2026-10-09T10:30:00.000Z", start: "started", closedAt: "2026-10-09T11:00:00.000Z" }]);
    await write("task_B", [entry(team, "2026-10-09T12:00:00.000Z", null)]);
    await boot();
    // An agent of the sub-work copy hosted inside the Team copy: chain innermost first.
    expect(service.ownerOf([{ agentRunId: "sub-work" }, { teamRunId: "review-team" }])).toEqual({ taskId: "task_A", execution: { agentRunId: "sub-work" }, open: false });
    expect(service.ownerOf([{ teamRunId: "review-team" }])).toEqual({ taskId: "task_B", execution: { teamRunId: "review-team" }, open: true });
    expect(service.closedTaskExecutionsIn({ rootSubjectKind: "agent_team", rootRunId: "manager-root" })).toEqual([{ agentRunId: "sub-work" }]);
    expect(service.releasableByHostRoot("task_A")).toEqual([{ hostRoot: { rootSubjectKind: "agent_team", rootRunId: "manager-root" }, executions: [{ agentRunId: "sub-work" }] }]);
    expect(service.releasableByHostRoot("task_B")).toEqual([]);
    expect(service.rootTaskLocationOf({ teamRunId: "review-team" })).toEqual({ projectId: "project_P", taskId: "task_B" });
  });

  it("with no open entry, the latest linkedAt is current; a tie goes to the greater Task ID", async () => {
    await write("task_A", [entry(team, "2026-10-09T10:00:00.000Z", "2026-10-09T11:00:00.000Z")]);
    await write("task_B", [entry(team, "2026-10-09T12:00:00.000Z", "2026-10-09T13:00:00.000Z")]);
    await write("task_C", [entry({ kind: "agent", agentRunId: "twin" }, "2026-10-09T09:00:00.000Z", "2026-10-09T09:30:00.000Z")]);
    await write("task_D", [entry({ kind: "agent", agentRunId: "twin" }, "2026-10-09T09:00:00.000Z", "2026-10-09T09:30:00.000Z")]);
    await boot();
    expect(service.locationOf({ teamRunId: "review-team" })).toEqual({ projectId: "project_P", taskId: "task_B" });
    expect(service.releasableByHostRoot("task_A")).toEqual([]);
    expect(service.releasableByHostRoot("task_B")).toEqual([expect.objectContaining({ executions: [{ teamRunId: "review-team" }] })]);
    expect(service.locationOf({ agentRunId: "twin" })).toEqual({ projectId: "project_P", taskId: "task_D" });
    expect(service.earlierTaskLocationsOf({ teamRunId: "review-team" })).toEqual([{ projectId: "project_P", taskId: "task_A" }]);
  });

  it("two open entries can only come from damaged data: the latest is current and the conflict is logged", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await write("task_A", [entry(team, "2026-10-09T10:00:00.000Z", null)]);
    await write("task_B", [entry(team, "2026-10-09T12:00:00.000Z", null)]);
    await boot();
    expect(service.locationOf({ teamRunId: "review-team" })).toEqual({ projectId: "project_P", taskId: "task_B" });
    expect(error).toHaveBeenCalledWith("TASK_AGENT_RESOURCE_CONFLICT", { execution: "team:review-team", openTasks: expect.arrayContaining(["task_A", "task_B"]) });
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
