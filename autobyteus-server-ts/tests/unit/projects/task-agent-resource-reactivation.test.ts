import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { AdHocTaskStore } from "../../../src/projects/stores/ad-hoc-task-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { TaskAgentResourceService } from "../../../src/projects/services/task-agent-resource-service.js";
import { TaskAgentResourceStore } from "../../../src/projects/stores/task-agent-resource-store.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { reopenTaskAgentResource, type TaskAgentResourceFile } from "../../../src/projects/domain/task-agent-resources.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskAgentResourceReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-agent-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
const worker = { agentRunId: "worker" };
const team = { teamRunId: "review-team" };
const helper = { agentRunId: "helper" };

/** Reactivation on the Task side (SR-002): only the assigner, only a not-DONE Task, only its one entry, never a status write. */
describe("Task agent run resource reactivation", () => {
  let appData: string, layout: ProjectsLayout, adHocLayout: AdHocTasksLayout, store: ProjectStore, projectId: string;
  let tasks: ProjectTaskService;
  const boot = async () => {
    const service = new ProjectTaskService({ store, adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout),
      requestRelease: vi.fn<TaskAgentResourceReleaseRequest>(async (_root, agentRuns) => agentRuns.map(agentRun => ({ agentRun, stopped: true }))),
      taskAgentResources: new TaskAgentResourceService(new TaskAgentResourceStore(layout, adHocLayout)) });
    await service.load();
    return service;
  };
  const resourcesFile = (taskId: string) => fs.readFile(layout.agentRunResourcesFile(projectId, taskId), "utf8");
  const taskJson = (taskId: string) => fs.readFile(layout.taskFile(projectId, taskId), "utf8");
  /** A started assignment of `agentRun` by `manager`, with a started helper under it. */
  const assignedWithHelper = async () => {
    const task = await tasks.createTask({ projectId, description: "Design the feature" });
    await tasks.linkAgentRun({ role: "assigned", taskId: task.taskId, assignedBy: "manager", hostRoot, agentRun: worker });
    await tasks.markStarted(worker);
    await tasks.linkAgentRun({ role: "delegated", creator: worker, hostRoot, agentRun: helper });
    await tasks.markStarted(helper);
    return task.taskId;
  };
  const setStatus = (taskId: string, status: "TODO" | "IN_PROGRESS" | "DONE") => tasks.updateTaskById({ taskId, status });

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "task-reactivation-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    projectId = (await new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } }).createProject({ name: "P" })).projectId;
    tasks = await boot();
  });
  afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("refuses while DONE; a status change alone reopens nothing; then reopens only the assignment, never writes status, and persists (AC-014/015, REQ-001/003/004)", async () => {
    const taskId = await assignedWithHelper();
    await setStatus(taskId, "DONE");
    const closedFile = await resourcesFile(taskId);
    // AC-015: the Task is still DONE: refused with the reopen-first hint, nothing changes.
    for (const call of [() => tasks.assertReopenable({ agentRun: worker, requestedBy: "manager" }),
      () => tasks.reopenAssignment({ agentRun: worker, requestedBy: "manager" })]) {
      await expect(call()).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED",
        message: "This Task is DONE. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again." });
    }
    expect(await resourcesFile(taskId)).toBe(closedFile);
    // AC-014: the agent's own status change opens and lists nothing.
    await setStatus(taskId, "IN_PROGRESS");
    expect(tasks.isOpen(worker)).toBe(false);
    expect((await tasks.currentAssignments([taskId])).get(taskId)).toEqual([]);
    const statusFile = await taskJson(taskId);

    await tasks.assertReopenable({ agentRun: worker, requestedBy: "manager" });
    expect(await tasks.reopenAssignment({ agentRun: worker, requestedBy: "manager" })).toEqual({ taskId, reopened: true });
    expect(tasks.isOpen(worker)).toBe(true);
    expect(tasks.isOpen(helper)).toBe(false);
    expect(tasks.closedAgentRunsIn(hostRoot)).toEqual([helper]);
    expect((await tasks.currentAssignments([taskId])).get(taskId)).toEqual([
      { targetAgentRunId: "worker", kind: "agent", assignedBy: "manager", outcome: "accepted" }]);
    // The status is exactly what the agent set; task.json is not written.
    expect(await taskJson(taskId)).toBe(statusFile);
    const entries = JSON.parse(await resourcesFile(taskId)).agentRunResources;
    expect(entries.map((entry: { closedAt: string | null }) => entry.closedAt === null)).toEqual([true, false]);
    // Already open: nothing is written.
    const reopenedFile = await resourcesFile(taskId);
    expect(await tasks.reopenAssignment({ agentRun: worker, requestedBy: "manager" })).toEqual({ taskId, reopened: false });
    expect(await resourcesFile(taskId)).toBe(reopenedFile);
    // After restart the view is rebuilt from the same file.
    const restarted = await boot();
    expect(restarted.isOpen(worker)).toBe(true);
    expect(restarted.closedAgentRunsIn(hostRoot)).toEqual([helper]);
  });

  it("a later DONE closes the reactivated entry again, and the cycle repeats (AC-010, REQ-009)", async () => {
    const taskId = await assignedWithHelper();
    for (let round = 0; round < 2; round += 1) {
      await setStatus(taskId, "DONE");
      expect(tasks.isOpen(worker)).toBe(false);
      expect(tasks.closedAgentRunsIn(hostRoot)).toEqual([worker, helper]);
      await setStatus(taskId, "TODO");
      expect((await tasks.reopenAssignment({ agentRun: worker, requestedBy: "manager" })).reopened).toBe(true);
    }
    expect(tasks.isOpen(worker)).toBe(true);
  });

  it("refuses other senders, helpers, never-started assignments and deleted Tasks with a clear reason; nothing changes (AC-005/006/008/009)", async () => {
    const taskId = await assignedWithHelper();
    await tasks.linkAgentRun({ role: "assigned", taskId, assignedBy: "manager", hostRoot, agentRun: team, coordinatorAgentRunId: "lead" });
    await tasks.markFailed(team, { code: "TASK_DISPATCH_FAILED", message: "no start" });
    await setStatus(taskId, "DONE");
    await setStatus(taskId, "TODO");
    const before = await resourcesFile(taskId);
    const assignerOnly = { code: "TASK_AGENT_RESOURCE_CLOSED", message: expect.stringContaining("Only the run that assigned it can reactivate it") };
    await expect(tasks.reopenAssignment({ agentRun: worker, requestedBy: "someone-else" })).rejects.toMatchObject(assignerOnly);
    await expect(tasks.reopenAssignment({ agentRun: helper, requestedBy: "worker" })).rejects.toMatchObject(assignerOnly);
    await expect(tasks.reopenAssignment({ agentRun: helper, requestedBy: "manager" })).rejects.toMatchObject(assignerOnly);
    await expect(tasks.reopenAssignment({ agentRun: team, requestedBy: "manager" })).rejects.toMatchObject({ code: "TASK_REACTIVATION_UNAVAILABLE" });
    await expect(tasks.reopenAssignment({ agentRun: { agentRunId: "unknown" }, requestedBy: "manager" })).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CONFLICT" });
    expect(await resourcesFile(taskId)).toBe(before);
    // AC-008: the Task was deleted after DONE; its resource records stay and stay closed.
    await tasks.deleteTask({ projectId, taskId });
    await expect(tasks.assertReopenable({ agentRun: worker, requestedBy: "manager" }))
      .rejects.toMatchObject({ code: "TASK_NOT_FOUND", message: "The Task was deleted; its work cannot be reactivated." });
    await expect(tasks.reopenAssignment({ agentRun: worker, requestedBy: "manager" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    expect(tasks.isOpen(worker)).toBe(false);
  });

  it("reactivates the assignment of a Task with no Project after the agent reopens it by task_id (AC-003)", async () => {
    const { taskId } = await tasks.linkAgentRun({ role: "assigned", assignedBy: "manager", hostRoot, agentRun: team, coordinatorAgentRunId: "lead",
      adHocTask: { description: "Review the plan", referenceFiles: [] } });
    await tasks.markStarted(team);
    await setStatus(taskId, "DONE");
    await expect(tasks.reopenAssignment({ agentRun: team, requestedBy: "manager" })).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    await setStatus(taskId, "TODO");
    expect(await tasks.reopenAssignment({ agentRun: team, requestedBy: "manager" })).toEqual({ taskId, reopened: true });
    expect(JSON.parse(await fs.readFile(adHocLayout.taskFile(taskId), "utf8")).status).toBe("TODO");
    expect(tasks.isOpen(team)).toBe(true);
  });

  it("is ordered with DONE per Task: a DONE is entirely before (refused) or after (closed again), never a DONE Task with an open entry (QR-001)", async () => {
    const taskId = await assignedWithHelper();
    for (const doneFirst of [true, false, true, false]) {
      await setStatus(taskId, "DONE");
      await setStatus(taskId, "IN_PROGRESS");
      const reopen = () => tasks.reopenAssignment({ agentRun: worker, requestedBy: "manager" });
      const done = () => setStatus(taskId, "DONE");
      const [first, second] = await Promise.allSettled(doneFirst ? [done(), reopen()] : [reopen(), done()]);
      const reactivation = doneFirst ? second : first;
      expect((doneFirst ? first : second).status).toBe("fulfilled");
      // Whichever came first in the Task's order, the DONE Task never keeps an open entry.
      expect(tasks.isOpen(worker)).toBe(false);
      if (reactivation.status === "rejected") expect(reactivation.reason).toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    }
  });

  it("the pure transition opens exactly one started assignment of its assigner and returns the same file when already open", () => {
    const file: TaskAgentResourceFile = { taskId: "t", agentRunResources: [
      { role: "assigned", assignedBy: "m", hostRoot, agentRun: worker, linkedAt: "a", start: "started", closedAt: "x" },
      { role: "delegated", hostRoot, agentRun: helper, linkedAt: "b", start: "started", closedAt: "x" },
    ] };
    const reopened = reopenTaskAgentResource(file, worker, "m");
    expect(reopened.agentRunResources.map(entry => entry.closedAt)).toEqual([null, "x"]);
    expect(reopenTaskAgentResource(reopened, worker, "m")).toBe(reopened);
    expect(() => reopenTaskAgentResource(file, helper, "m")).toThrow(expect.objectContaining({ code: "TASK_AGENT_RESOURCE_CLOSED" }));
  });
});
