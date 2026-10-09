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
import { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { ProjectTaskContextStore } from "../../../src/projects/context/project-task-context-store.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { NewTaskExecutionLinkInput, TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "host-root" });
const otherRoot = createRootExecutionIdentity({ rootSubjectKind: "agent_team", rootRunId: "team-root" });

/** Tasks with no Project ("ad-hoc"), created only by described delegation of an unowned sender (SR-003). */
describe("ad-hoc Tasks (no Project)", () => {
  let appData: string, layout: ProjectsLayout, adHocLayout: AdHocTasksLayout, store: ProjectStore, projectId: string;
  let release: ReturnType<typeof vi.fn<TaskExecutionReleaseRequest>>;
  let tasks: ProjectTaskService;
  const boot = async () => {
    const adHocTasks = new AdHocTaskStore(adHocLayout);
    const service = new ProjectTaskService({ store, adHocTasks, contextStore: new ProjectTaskContextStore(layout), requestRelease: release,
      taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)) });
    await service.load();
    return service;
  };
  const delegate = (agentRunId: string, input: { description?: string; referenceFiles?: string[]; root?: typeof hostRoot } = {}) =>
    tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "delegator", hostRoot: input.root ?? hostRoot, execution: { agentRunId },
      adHocTask: { description: input.description ?? "Review the plan", referenceFiles: input.referenceFiles ?? [] } });
  const taskFile = (taskId: string) => fs.readFile(adHocLayout.taskFile(taskId), "utf8").then(JSON.parse);
  const exists = (file: string) => fs.access(file).then(() => true, () => false);

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "ad-hoc-tasks-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    projectId = (await new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } }).createProject({ name: "P" })).projectId;
    release = vi.fn<TaskExecutionReleaseRequest>(async (_root, agentRuns) => agentRuns.map(execution => ({ execution, stopped: true })));
    tasks = await boot();
  });
  afterEach(async () => {
    await tasks.drainRuntimeReleases();
    vi.restoreAllMocks();
    await fs.rm(appData, { recursive: true, force: true });
  });

  it("a described-delegation link creates a text-only Task with no Project and links the copy as its assignment (AC-003, AC-015)", async () => {
    const reference = path.join(appData, "notes.md");
    await fs.writeFile(reference, "secret bytes");
    const { taskId } = await delegate("copy-1", { description: "Review the plan", referenceFiles: [reference] });
    expect(taskId).toMatch(/^ad_hoc_task_[0-9a-f-]{36}$/);
    expect(await taskFile(taskId)).toEqual({ taskId, description: "Review the plan", referenceFiles: [reference],
      status: "TODO", createdAt: expect.any(String), updatedAt: expect.any(String) });
    // Text only: the folder holds exactly the Task record and its run resources; no file is copied.
    expect((await fs.readdir(adHocLayout.taskDir(taskId))).sort()).toEqual(["agent_run_resources.json", "task.json"]);
    expect(await fs.readFile(adHocLayout.taskFile(taskId), "utf8")).not.toContain("secret bytes");
    expect(tasks.ownerOf([{ agentRunId: "copy-1" }])).toEqual({ taskId, execution: { agentRunId: "copy-1" }, open: true });
    expect(await tasks.currentAssignments([taskId])).toEqual(new Map([[taskId, [
      { targetAgentRunId: "copy-1", kind: "agent", assignedBy: "delegator", outcome: "not_confirmed" }]]]));
    // Not Project work: it is not listed under any Project, and the Projects root holds no trace of it.
    expect(await tasks.listTasks(projectId)).toEqual([]);
    expect(await store.findTask(taskId)).toEqual([]);
    // Sub-work of the copy stays that Task's (REQ-010).
    await expect(tasks.linkNewTaskExecution({ role: "delegated", creator: { agentRunId: "copy-1" }, hostRoot, execution: { agentRunId: "sub-1" } }))
      .resolves.toEqual({ taskId });
  });

  it("each described delegation gets its own Task", async () => {
    const first = await delegate("copy-1");
    const second = await delegate("copy-2");
    expect(first.taskId).not.toBe(second.taskId);
    expect(tasks.ownerOf([{ agentRunId: "copy-2" }])?.taskId).toBe(second.taskId);
  });

  it("DONE by task_id alone closes the copy and its sub-work, writes the status and asks its root to stop them (AC-004, AC-007)", async () => {
    const { taskId } = await delegate("copy-1");
    await tasks.markStarted({ agentRunId: "copy-1" });
    await tasks.linkNewTaskExecution({ role: "broughtIn", creator: { agentRunId: "copy-1" }, hostRoot, execution: { agentRunId: "helper-1" } });
    await expect(tasks.updateTaskById({ taskId, status: "DONE" })).resolves.toEqual({ projectId: null, taskId, status: "DONE" });
    await tasks.drainRuntimeReleases();
    expect((await taskFile(taskId)).status).toBe("DONE");
    expect(tasks.isOpen({ agentRunId: "copy-1" })).toBe(false);
    expect(tasks.isOpen({ agentRunId: "helper-1" })).toBe(false);
    expect(tasks.closedTaskExecutionsIn(hostRoot)).toEqual([{ agentRunId: "copy-1" }, { agentRunId: "helper-1" }]);
    expect(release).toHaveBeenCalledWith(hostRoot, [{ agentRunId: "copy-1" }, { agentRunId: "helper-1" }]);
    // A closed copy takes no new sub-work (only its assigner's reactivation reopens it). Repeating DONE re-requests the stop and changes nothing else.
    await expect(tasks.linkNewTaskExecution({ role: "delegated", creator: { agentRunId: "copy-1" }, hostRoot, execution: { agentRunId: "late" } }))
      .rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    const before = await taskFile(taskId);
    await tasks.updateTaskById({ taskId, status: "DONE" });
    await tasks.drainRuntimeReleases();
    expect(release).toHaveBeenCalledTimes(2);
    expect(await taskFile(taskId)).toEqual(before);
  });

  it("closure survives a restart: the reloaded view keeps the copy closed and hidden (AC-008)", async () => {
    const { taskId } = await delegate("copy-1");
    await tasks.updateTaskById({ taskId, status: "DONE" });
    await tasks.drainRuntimeReleases();
    const restarted = await boot();
    expect(restarted.isOpen({ agentRunId: "copy-1" })).toBe(false);
    expect(restarted.ownerOf([{ agentRunId: "copy-1" }])).toEqual({ taskId, execution: { agentRunId: "copy-1" }, open: false });
    expect(restarted.closedTaskExecutionsIn(hostRoot)).toEqual([{ agentRunId: "copy-1" }]);
  });

  it("patches an ad-hoc description and a Project Task by task_id alone (AC-005); unknown IDs fail TASK_NOT_FOUND (AC-004)", async () => {
    const { taskId } = await delegate("copy-1");
    await expect(tasks.updateTaskById({ taskId, description: "  Revised  " })).resolves.toEqual({ projectId: null, taskId, status: "TODO" });
    expect((await taskFile(taskId)).description).toBe("Revised");
    const projectTask = await tasks.createTask({ projectId, description: "Project work" });
    await expect(tasks.updateTaskById({ taskId: projectTask.taskId, description: "Project work, revised" }))
      .resolves.toEqual({ projectId, taskId: projectTask.taskId, status: "TODO" });
    expect((await store.readTask(projectId, projectTask.taskId))!.description).toBe("Project work, revised");
    await expect(tasks.updateTaskById({ taskId: "ad_hoc_task_missing", status: "DONE" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    await expect(tasks.updateTaskById({ taskId: "../escape", status: "DONE" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    await expect(tasks.updateTaskById({ taskId })).rejects.toMatchObject({ code: "TASK_PATCH_REQUIRED" });
    await expect(tasks.updateTaskById({ taskId, status: "done" as never })).rejects.toMatchObject({ code: "TASK_STATUS_INVALID" });
  });

  it("DONE on a Project Task by task_id alone behaves exactly like the Project-scoped update (AC-014)", async () => {
    const projectTask = await tasks.createTask({ projectId, description: "Project work" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: projectTask.taskId, assignedBy: "manager", hostRoot: otherRoot, execution: { agentRunId: "worker" } });
    await tasks.updateTaskById({ taskId: projectTask.taskId, status: "DONE" });
    await tasks.drainRuntimeReleases();
    expect((await store.readTask(projectId, projectTask.taskId))!.status).toBe("DONE");
    expect(release).toHaveBeenCalledWith(otherRoot, [{ agentRunId: "worker" }]);
  });

  it("linked delegation stays Project-only: an ad-hoc ID is TASK_NOT_FOUND for resolveAssignment and a linked assignment", async () => {
    const { taskId } = await delegate("copy-1");
    await expect(tasks.resolveAssignment(taskId)).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    const linked: NewTaskExecutionLinkInput = { role: "assigned", taskId, assignedBy: "manager", hostRoot: otherRoot, execution: { agentRunId: "other" } };
    await expect(tasks.linkNewTaskExecution(linked)).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
  });

  it("works while the Projects migration is pending; Project operations still report it (AC-013)", async () => {
    const projectTask = await tasks.createTask({ projectId, description: "Project work" });
    await fs.writeFile(layout.releasedProjectsFile(), "[]");
    const { taskId } = await delegate("copy-1");
    await expect(tasks.updateTaskById({ taskId, status: "DONE" })).resolves.toEqual({ projectId: null, taskId, status: "DONE" });
    await expect(tasks.updateTaskById({ taskId: projectTask.taskId, status: "DONE" })).rejects.toMatchObject({ code: "PROJECTS_MIGRATION_PENDING" });
    await expect(tasks.listTasks(projectId)).rejects.toMatchObject({ code: "PROJECTS_MIGRATION_PENDING" });
  });

  it("a permanent run delete removes only that root's ad-hoc Tasks, from the view and from disk (AC-010)", async () => {
    const mine = await delegate("copy-1");
    await tasks.linkNewTaskExecution({ role: "delegated", creator: { agentRunId: "copy-1" }, hostRoot, execution: { agentRunId: "sub-1" } });
    const closed = await delegate("copy-2");
    await tasks.updateTaskById({ taskId: closed.taskId, status: "DONE" });
    const theirs = await delegate("copy-3", { root: otherRoot });
    const projectTask = await tasks.createTask({ projectId, description: "Project work" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId: projectTask.taskId, assignedBy: "manager", hostRoot, execution: { agentRunId: "worker" } });

    await tasks.deleteAdHocTasksHostedBy(hostRoot);
    expect(await exists(adHocLayout.taskDir(mine.taskId))).toBe(false);
    expect(await exists(adHocLayout.taskDir(closed.taskId))).toBe(false);
    expect(tasks.ownerOf([{ agentRunId: "copy-1" }])).toBeNull();
    expect(tasks.ownerOf([{ agentRunId: "sub-1" }])).toBeNull();
    expect(tasks.closedTaskExecutionsIn(hostRoot)).toEqual([]);
    // Other roots' ad-hoc Tasks and every Project Task are untouched.
    expect(await exists(adHocLayout.taskFile(theirs.taskId))).toBe(true);
    expect(tasks.ownerOf([{ agentRunId: "copy-3" }])?.taskId).toBe(theirs.taskId);
    expect(tasks.ownerOf([{ agentRunId: "worker" }])?.taskId).toBe(projectTask.taskId);
    expect(await store.readTask(projectId, projectTask.taskId)).not.toBeNull();
    await expect(tasks.updateTaskById({ taskId: mine.taskId, status: "DONE" })).rejects.toMatchObject({ code: "TASK_NOT_FOUND" });
    // A restart agrees with the view.
    const restarted = await boot();
    expect(restarted.ownerOf([{ agentRunId: "copy-1" }])).toBeNull();
    expect(restarted.ownerOf([{ agentRunId: "copy-3" }])?.taskId).toBe(theirs.taskId);
  });

  it("a delete cleanup failure is logged and never thrown to the run delete", async () => {
    const { taskId } = await delegate("copy-1");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(AdHocTaskStore.prototype, "delete").mockRejectedValueOnce(new Error("EBUSY"));
    await expect(tasks.deleteAdHocTasksHostedBy(hostRoot)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith("AD_HOC_TASK_DELETE_FAILED", expect.objectContaining({ taskId }));
    // Nothing was forgotten while its files remain.
    expect(tasks.ownerOf([{ agentRunId: "copy-1" }])?.taskId).toBe(taskId);
  });
});
