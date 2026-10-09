import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectStore, readTaskFile } from "../../../src/projects/stores/project-store.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { AdHocTaskStore, readAdHocTaskFile } from "../../../src/projects/stores/ad-hoc-task-store.js";
import { ProjectService } from "../../../src/projects/services/project-service.js";
import { ProjectTaskService } from "../../../src/projects/services/project-task-service.js";
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import {
  PROJECT_TASK_STATUSES, isProjectTaskStatus, isTerminalTaskStatus, validateTaskStatus, type ProjectTaskStatus,
} from "../../../src/projects/domain/task-status.js";
import { ProjectChangeMessageSchema } from "../../../src/projects/changes/project-change-messages.js";
import { ProjectTaskStatus as GraphqlProjectTaskStatus } from "../../../src/api/graphql/types/project-tasks.js";
import { readReleasedTaskFileV1 } from "../../../src/app-data-migrations/migrations/projects-per-folder-v1/released-project-folder-v1.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
const otherRoot = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "team-root" });
const worker = { agentRunId: "worker" };
const at = "2026-10-08T00:00:00.000Z";

describe("Task status vocabulary (CANCELLED)", () => {
  it("has four values; DONE and CANCELLED are terminal; the invalid-status error lists all four", () => {
    expect(PROJECT_TASK_STATUSES).toEqual(["TODO", "IN_PROGRESS", "DONE", "CANCELLED"]);
    expect(PROJECT_TASK_STATUSES.filter(isTerminalTaskStatus)).toEqual(["DONE", "CANCELLED"]);
    for (const status of PROJECT_TASK_STATUSES) expect(validateTaskStatus(status)).toBe(status);
    for (const bad of ["cancelled", "CANCELED", "CLOSED", "", null, undefined, 3]) {
      expect(isProjectTaskStatus(bad)).toBe(false);
      expect(() => validateTaskStatus(bad)).toThrow(expect.objectContaining({
        code: "TASK_STATUS_INVALID", message: "Task status must be TODO, IN_PROGRESS, DONE or CANCELLED." }));
    }
  });

  it("the GraphQL enum carries exactly the shared values", () => {
    expect(Object.values(GraphqlProjectTaskStatus)).toEqual([...PROJECT_TASK_STATUSES]);
  });

  it("the current readers accept all four values and still reject unknown ones; the frozen migration reader stays 3-value", () => {
    for (const status of PROJECT_TASK_STATUSES) {
      expect(readTaskFile({ taskId: "t", projectId: "p", description: "d", status, createdAt: at, updatedAt: at }, "p", "t")?.status).toBe(status);
      expect(readAdHocTaskFile({ taskId: "a", description: "d", status, referenceFiles: [], createdAt: at, updatedAt: at }, "a")?.status).toBe(status);
    }
    expect(readTaskFile({ taskId: "t", projectId: "p", description: "d", status: "ARCHIVED", createdAt: at, updatedAt: at }, "p", "t")).toBeNull();
    expect(readAdHocTaskFile({ taskId: "a", description: "d", status: "ARCHIVED", createdAt: at, updatedAt: at }, "a")).toBeNull();
    const released = { taskId: "t", projectId: "p", description: "d", createdAt: at, updatedAt: at, contextFiles: [] };
    expect(readReleasedTaskFileV1({ ...released, status: "DONE" }, "p", "t"))
      .toEqual({ taskId: "t", description: "d", status: "DONE", createdAt: at, updatedAt: at, contextFiles: [] });
    expect(readReleasedTaskFileV1({ ...released, status: "CANCELLED" }, "p", "t")).toBeNull();
  });

  it("the change feed accepts a CANCELLED Task upsert for both scopes", () => {
    const root = null;
    expect(ProjectChangeMessageSchema.safeParse({ type: "task_upserted", scope: { kind: "project", projectId: "p" }, task: {
      contextFiles: [], taskId: "t", projectId: "p", description: "d", status: "CANCELLED", createdAt: at, updatedAt: at, root } }).success).toBe(true);
    expect(ProjectChangeMessageSchema.safeParse({ type: "task_upserted", scope: { kind: "no_project" }, task: {
      taskId: "a", description: "d", status: "CANCELLED", referenceFiles: [], createdAt: at, updatedAt: at, root } }).success).toBe(true);
  });
});

describe("CANCELLED ends a Task's work exactly like DONE", () => {
  let appData: string, layout: ProjectsLayout, adHocLayout: AdHocTasksLayout, store: ProjectStore, projectId: string;
  let release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
  let tasks: ProjectTaskService;
  const resourcesFile = (taskId: string) => fs.readFile(layout.taskExecutionResourcesFile(projectId, taskId), "utf8");
  const assign = (taskId: string, agentRunId: string, root = hostRoot) =>
    tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", hostRoot: root, execution: { agentRunId } });
  const setStatus = (taskId: string, status: ProjectTaskStatus) => tasks.updateTaskById({ taskId, status });
  const settle = () => tasks.drainRuntimeReleases();

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "task-cancelled-status-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    projectId = (await new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } }).createProject({ name: "P" })).projectId;
    release = vi.fn<TaskExecutionReleaseRequest>(async (_root, agentRuns) => agentRuns.map(execution => ({ execution, stopped: true })));
    tasks = new ProjectTaskService({ store, adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout),
      requestRelease: release, taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)) });
    await tasks.load();
  });
  afterEach(async () => { await settle(); vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("a Project Task: closes agent runs first, then writes CANCELLED, then asks each host root to stop them; repeating retries (AC-001, AC-004)", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    const b = await tasks.createTask({ projectId, description: "B" });
    await assign(a.taskId, "worker-a"); await assign(a.taskId, "worker-a2", otherRoot); await assign(b.taskId, "worker-b");
    const observed: string[] = [];
    release.mockImplementation(async (root, agentRuns) => {
      observed.push(`${root.rootRunId}:${(await store.readTask(projectId, a.taskId))!.status}:${tasks.isOpen({ agentRunId: "worker-a" })}`);
      return agentRuns.map(execution => ({ execution, stopped: true }));
    });
    const writes = vi.spyOn(store, "updateTask");
    writes.mockImplementationOnce(async (...args) => {
      expect(tasks.isOpen({ agentRunId: "worker-a" })).toBe(false); // closure committed before the status write
      return ProjectStore.prototype.updateTask.apply(store, args);
    });
    expect(await setStatus(a.taskId, "CANCELLED")).toEqual({ projectId, taskId: a.taskId, status: "CANCELLED" });
    await settle();
    expect(release).toHaveBeenCalledWith(hostRoot, [{ agentRunId: "worker-a" }]);
    expect(release).toHaveBeenCalledWith(otherRoot, [{ agentRunId: "worker-a2" }]);
    expect(observed.sort()).toEqual(["manager-root:CANCELLED:false", "team-root:CANCELLED:false"]);
    expect(tasks.isOpen({ agentRunId: "worker-b" })).toBe(true);
    // Repeated CANCELLED: no file change, the stop is requested again.
    const bytes = await resourcesFile(a.taskId);
    release.mockClear();
    await setStatus(a.taskId, "CANCELLED"); await settle();
    expect(release).toHaveBeenCalledTimes(2);
    expect(await resourcesFile(a.taskId)).toBe(bytes);
  });

  it("DONE → CANCELLED and CANCELLED → DONE behave as a repeated DONE: no resource file change, the stop is requested again", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    await assign(a.taskId, "worker-a");
    await setStatus(a.taskId, "DONE"); await settle();
    const bytes = await resourcesFile(a.taskId);
    for (const status of ["CANCELLED", "DONE"] as const) {
      release.mockClear();
      expect((await setStatus(a.taskId, status)).status).toBe(status);
      await settle();
      expect(release).toHaveBeenCalledExactlyOnceWith(hostRoot, [{ agentRunId: "worker-a" }]);
      expect(await resourcesFile(a.taskId)).toBe(bytes);
    }
  });

  it("refuses new assignment while CANCELLED, naming the status; a reopen writes only and starts nothing (AC-003, AC-005)", async () => {
    const a = await tasks.createTask({ projectId, description: "A" });
    await assign(a.taskId, "before");
    await setStatus(a.taskId, "CANCELLED");
    const refusal = { code: "TASK_AGENT_RESOURCE_CLOSED", message: "The Task is CANCELLED; move it to TODO or IN_PROGRESS before assigning new work." };
    await expect(assign(a.taskId, "after")).rejects.toMatchObject(refusal);
    await expect(tasks.resolveAssignment(a.taskId)).rejects.toMatchObject(refusal);
    await settle();
    release.mockClear();
    const bytes = await resourcesFile(a.taskId);
    await tasks.updateTask({ projectId, taskId: a.taskId, status: "TODO" }); await settle();
    expect(release).not.toHaveBeenCalled();
    expect(await resourcesFile(a.taskId)).toBe(bytes);
    expect(tasks.isOpen({ agentRunId: "before" })).toBe(false);
    expect(await tasks.resolveAssignment(a.taskId)).toEqual({ description: "A", referenceFiles: [] });
  });

  it("refuses reactivation while CANCELLED with the reopen-first hint; after a reopen the assigner reactivates as after DONE (AC-005)", async () => {
    const task = await tasks.createTask({ projectId, description: "A" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: task.taskId, assignedBy: "manager", hostRoot, execution: worker });
    await tasks.markStarted(worker);
    await setStatus(task.taskId, "CANCELLED");
    const closedFile = await resourcesFile(task.taskId);
    for (const call of [() => tasks.assertReopenable({ execution: worker, requestedBy: "manager" }),
      () => tasks.reopenAssignment({ execution: worker, requestedBy: "manager" })]) {
      await expect(call()).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED",
        message: "This Task is CANCELLED. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again." });
    }
    expect(await resourcesFile(task.taskId)).toBe(closedFile);
    await setStatus(task.taskId, "IN_PROGRESS");
    expect(tasks.isOpen(worker)).toBe(false);
    await expect(tasks.reopenAssignment({ execution: worker, requestedBy: "someone-else" })).rejects.toMatchObject({ code: expect.any(String) });
    expect(await tasks.reopenAssignment({ execution: worker, requestedBy: "manager" })).toEqual({ taskId: task.taskId, reopened: true });
    expect(tasks.isOpen(worker)).toBe(true);
  });

  it("a Task with no Project: CANCELLED closes and stops its copy like DONE; delegation by its ID stays refused (AC-004)", async () => {
    const { taskId } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "delegator", hostRoot, execution: { agentRunId: "copy-1" },
      adHocTask: { description: "Review the plan", referenceFiles: [] } });
    expect(await setStatus(taskId, "CANCELLED")).toEqual({ projectId: null, taskId, status: "CANCELLED" });
    await settle();
    expect(release).toHaveBeenCalledExactlyOnceWith(hostRoot, [{ agentRunId: "copy-1" }]);
    expect(tasks.isOpen({ agentRunId: "copy-1" })).toBe(false);
    expect((await tasks.listTasksWithoutProject()).map((t) => t.status)).toEqual(["CANCELLED"]);
    release.mockClear();
    await setStatus(taskId, "CANCELLED"); await settle();
    expect(release).toHaveBeenCalledOnce();
  });

  it("list_project_tasks filtering: CANCELLED returns only Cancelled Tasks; unfiltered returns all four (AC-006)", async () => {
    const ids: Record<string, string> = {};
    for (const status of PROJECT_TASK_STATUSES) {
      ids[status] = (await tasks.createTask({ projectId, description: status })).taskId;
      if (status !== "TODO") await setStatus(ids[status]!, status);
    }
    expect((await tasks.listTasks(projectId, "CANCELLED")).map((t) => t.taskId)).toEqual([ids.CANCELLED]);
    expect((await tasks.listTasks(projectId)).map((t) => t.status).sort()).toEqual(["CANCELLED", "DONE", "IN_PROGRESS", "TODO"]);
  });
});
