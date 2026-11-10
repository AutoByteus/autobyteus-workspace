import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";

/**
 * autobyteus-469 D-1: a top run's local delegated runs are asked of the Task records: the copies whose current entry
 * names the top run and is open (U-008: whatever its start). The closed ones are found by ingress or reference.
 */
const manager = { kind: "agent", runId: "manager" };
const entry = (agentRun: Record<string, string>, extra: Record<string, unknown> = {}) => ({
  role: "assigned", assignedBy: "manager", hostRoot: manager, agentRun, linkedAt: "2026-11-01T10:00:00.000Z",
  start: "started", closedAt: null, ...extra });
const agent = (agentRunId: string) => ({ kind: "agent", agentRunId });
const team = { kind: "team", teamRunId: "review-team", coordinatorAgentRunId: "lead" };

describe("TaskExecutionResourceService open delegated runs (autobyteus-469)", () => {
  let appData: string, layout: ProjectsLayout, service: TaskExecutionResourceService;
  const write = async (taskId: string, agentRunResources: unknown) => {
    const file = layout.taskExecutionResourcesFile("project_P", taskId);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, typeof agentRunResources === "string" ? agentRunResources : JSON.stringify({ taskId, agentRunResources }));
  };
  const boot = async () => {
    service = new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))));
    await service.load();
  };

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "open-delegated-runs-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
  });
  afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("throws before the Task records are loaded", () => {
    service = new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))));
    expect(() => service.openDelegatedRunsOf(manager as never)).toThrow("not loaded");
  });

  it("lists every open current entry of this top run, whatever its start; closed ones, other roots and sub-work of closed Tasks are left out", async () => {
    await write("task_open", [
      entry(agent("started")),
      entry(agent("starting"), { start: "starting" }),
      entry(agent("failed"), { start: "failed", startError: { code: "X", message: "m" } }),
      entry(team),
      { role: "delegated", hostRoot: manager, agentRun: agent("sub-work"), linkedAt: "2026-11-01T10:05:00.000Z", start: "started", closedAt: null },
    ]);
    await write("task_closed", [entry(agent("closed"), { closedAt: "2026-11-01T11:00:00.000Z" })]);
    await write("task_other_root", [entry(agent("other"), { hostRoot: { kind: "agent_team", runId: "another" } })]);
    await boot();
    expect(service.openDelegatedRunsOf(manager as never)).toEqual([
      { run: { agentRunId: "started" }, started: true },
      { run: { agentRunId: "starting" }, started: false },
      { run: { agentRunId: "failed" }, started: false },
      { run: { teamRunId: "review-team" }, started: true },
      { run: { agentRunId: "sub-work" }, started: true },
    ]);
    expect(service.openDelegatedRunsOf({ kind: "agent_team", runId: "another" })).toEqual([{ run: { agentRunId: "other" }, started: true }]);
    expect(service.openDelegatedRunsOf({ kind: "agent_org", runId: "manager" })).toEqual([]);
  });

  it("a run with a second open Task stays open when the first closes; it leaves when the last closes (AC-004)", async () => {
    await write("task_A", [entry(agent("worker"))]);
    await write("task_B", [entry(agent("worker"), { linkedAt: "2026-11-02T10:00:00.000Z" })]);
    await boot();
    await service.closeTask({ projectId: "project_P", taskId: "task_A" }, async () => undefined);
    expect(service.openDelegatedRunsOf(manager as never).map((open) => open.run)).toEqual([{ agentRunId: "worker" }]);
    await service.closeTask({ projectId: "project_P", taskId: "task_B" }, async () => undefined);
    expect(service.openDelegatedRunsOf(manager as never)).toEqual([]);
    expect(service.closedTaskExecutionOf({ rootSubjectKind: "agent", rootRunId: "manager" }, { ingressAgentRunId: "worker" }))
      .toEqual({ execution: { agentRunId: "worker" }, ingressAgentRunId: "worker" });
  });

  it("a reopened assignment is open again and back in the list", async () => {
    await write("task_A", [entry(agent("worker"), { closedAt: "2026-11-01T11:00:00.000Z" })]);
    await boot();
    expect(service.openDelegatedRunsOf(manager as never)).toEqual([]);
    await service.reopenAssignment({ projectId: "project_P", taskId: "task_A" }, { agentRunId: "worker" }, "manager");
    expect(service.openDelegatedRunsOf(manager as never)).toEqual([{ run: { agentRunId: "worker" }, started: true }]);
  });

  it("a Task whose record cannot be read contributes none; its runs are absent, the load names the Task (AC-005, DEC-010)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await write("task_A", [entry(agent("readable"))]);
    await write("task_damaged", "{ not json");
    await boot();
    expect(service.openDelegatedRunsOf(manager as never)).toEqual([{ run: { agentRunId: "readable" }, started: true }]);
    expect(error).toHaveBeenCalledWith("TASK_AGENT_RESOURCES_UNAVAILABLE", expect.objectContaining({ taskId: "task_damaged" }));
  });

  it("a closed Team copy is found by its coordinator or its reference, never by another member (DEC-006)", async () => {
    await write("task_A", [entry(team, { closedAt: "2026-11-01T11:00:00.000Z" })]);
    await boot();
    const root = { rootSubjectKind: "agent" as const, rootRunId: "manager" };
    const closed = { execution: { teamRunId: "review-team" }, ingressAgentRunId: "lead" };
    expect(service.closedTaskExecutionOf(root, { ingressAgentRunId: "lead" })).toEqual(closed);
    expect(service.closedTaskExecutionOf(root, { teamRunId: "review-team" })).toEqual(closed);
    expect(service.closedTaskExecutionOf(root, { ingressAgentRunId: "reviewer" })).toBeNull();
    expect(service.closedTaskExecutionOf({ rootSubjectKind: "agent_team", rootRunId: "manager" }, { ingressAgentRunId: "lead" })).toBeNull();
  });
});
