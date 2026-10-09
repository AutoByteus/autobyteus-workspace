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
import { ProjectChangePublisher } from "../../../src/projects/changes/project-change-publisher.js";
import type { ProjectChangeMessage } from "../../../src/projects/changes/project-change-messages.js";
import type { TaskRootStatus } from "../../../src/projects/domain/models.js";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
const worker = { agentRunId: "worker" };

/** The real Project and Task services over a private data root, wired to a real publisher (setImmediate flush). */
describe("Projects change publication (Publication Contract, services)", () => {
  let appData: string, layout: ProjectsLayout, adHocLayout: AdHocTasksLayout, store: ProjectStore;
  let publisher: ProjectChangePublisher, projects: ProjectService, tasks: ProjectTaskService, emitted: ProjectChangeMessage[];
  /** What the hosting root answers for the worker (the live status source). */
  let liveStatus: TaskRootStatus;
  const boot = async () => {
    const service = new ProjectTaskService({ store, adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout),
      requestRelease: vi.fn<TaskExecutionReleaseRequest>(async (_r, runs) => runs.map(execution => ({ execution, stopped: true }))),
      taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)),
      changes: publisher, workerStatus: () => liveStatus });
    publisher.bind({
      readProject: (projectId) => projects.getProject(projectId),
      readTask: (location) => service.readTaskChangeView(location),
      readWorkerStatus: (location) => service.workerStatusOf(location),
    }, (message) => emitted.push(message));
    await service.load();
    return service;
  };
  const types = () => emitted.map((m) => m.type);

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "project-changes-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    publisher = new ProjectChangePublisher();
    emitted = [];
    liveStatus = "idle";
    projects = new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] }, changes: publisher });
    tasks = await boot();
  });
  afterEach(async () => { await publisher.idle(); await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("publishes Project and Task writes after commit, with counts and the recorded root (AC-001/002/005)", async () => {
    const { projectId } = await projects.createProject({ name: "Launch" });
    await publisher.idle();
    expect(emitted).toEqual([expect.objectContaining({ type: "project_upserted", project: expect.objectContaining({ projectId, taskCount: 0 }) })]);
    emitted.length = 0;
    const { taskId } = await tasks.createTask({ projectId, description: "Draft notes" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", recipientAddress: "/release_writer", hostRoot, execution: worker });
    await tasks.markStarted(worker);
    await publisher.idle();
    const upserts = emitted.filter((m) => m.type === "task_upserted");
    expect(upserts.at(-1)).toMatchObject({ scope: { kind: "project", projectId }, task: { taskId, status: "TODO", root: {
      kind: "agent", recipientAddress: "/release_writer", ingressAgentRunId: "worker", teamRunId: null,
      hostRoot: { kind: "agent", runId: "manager-root" }, start: "started", startError: null, closed: false, status: "idle" } } });
    expect(emitted.filter((m) => m.type === "project_upserted").at(-1)).toMatchObject({ project: { taskCount: 1, openTaskCount: 1 } });
  });

  it("DONE emits views in commit order, ending with the DONE view, an Offline root and fresh counts (P-002)", async () => {
    const { projectId } = await projects.createProject({ name: "Launch" });
    const { taskId } = await tasks.createTask({ projectId, description: "Draft notes" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", recipientAddress: "/w", hostRoot, execution: worker });
    await tasks.markStarted(worker);
    await publisher.idle(); emitted.length = 0;
    await tasks.updateTaskById({ taskId, status: "DONE" });
    await publisher.idle();
    const taskViews = emitted.flatMap((m) => m.type === "task_upserted" ? [m.task] : []);
    expect(taskViews.at(-1)).toMatchObject({ status: "DONE", root: { closed: true, status: "offline" } });
    // Each emission reads state at least as new as the one before it: no view after DONE is older.
    const doneAt = taskViews.findIndex((view) => view.status === "DONE");
    expect(taskViews.slice(doneAt).every((view) => view.status === "DONE")).toBe(true);
    expect(emitted.filter((m) => m.type === "project_upserted").at(-1)).toMatchObject({ project: { taskCount: 1, openTaskCount: 0 } });
  });

  it("the first status after a wake is read after the dispatch: Running, not the transient Initializing (P-001)", async () => {
    const { projectId } = await projects.createProject({ name: "Launch" });
    const { taskId } = await tasks.createTask({ projectId, description: "Draft notes" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", recipientAddress: "/w", hostRoot, execution: worker });
    await tasks.markStarted(worker);
    await publisher.idle(); emitted.length = 0;
    // Mirrors the handle: the run's first AGENT_STATUS is dispatched (synchronously reaching the
    // Task side) while the "initializing" overlay is still set; the overlay clears right after.
    liveStatus = "initializing";
    tasks.taskExecutionsStatusChanged(hostRoot, [worker]);
    liveStatus = "running";
    await publisher.idle();
    expect(emitted).toEqual([{ type: "task_worker_status", scope: { kind: "project", projectId }, taskId, status: "running" }]);
  });

  it("status changes are published only for a Task's root (its latest assignment), never for helpers or older roots", async () => {
    const { taskId } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/a", hostRoot, execution: { agentRunId: "first" },
      adHocTask: { description: "Review it", referenceFiles: [] } });
    await tasks.linkNewTaskExecution({ role: "delegated", creator: { agentRunId: "first" }, hostRoot, execution: { agentRunId: "helper" } });
    await publisher.idle(); emitted.length = 0;
    tasks.taskExecutionsStatusChanged(hostRoot, [{ agentRunId: "helper" }, { agentRunId: "unknown" }]);
    await publisher.idle();
    expect(emitted).toEqual([]);
    tasks.taskExecutionsStatusChanged(hostRoot, [{ agentRunId: "first" }]);
    await publisher.idle();
    expect(emitted).toEqual([{ type: "task_worker_status", scope: { kind: "no_project" }, taskId, status: "idle" }]);
  });

  it("Temp tasks: creation, DONE and deletion with their chat are published in the no-project scope (AC-019..021)", async () => {
    const { taskId } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/a", hostRoot, execution: worker,
      adHocTask: { description: "Review it", referenceFiles: ["/tmp/plan.md"] } });
    await publisher.idle();
    expect(emitted.at(-1)).toMatchObject({ type: "task_upserted", scope: { kind: "no_project" }, task: { taskId, status: "TODO", referenceFiles: ["/tmp/plan.md"] } });
    await tasks.updateTaskById({ taskId, status: "DONE" });
    await publisher.idle();
    expect(emitted.at(-1)).toMatchObject({ type: "task_upserted", task: { status: "DONE", root: { closed: true, status: "offline" } } });
    await tasks.deleteAdHocTasksHostedBy(hostRoot);
    await publisher.idle();
    expect(emitted.at(-1)).toEqual({ type: "task_removed", scope: { kind: "no_project" }, taskId });
    expect(types()).not.toContain("project_upserted");
  });

  it("load() publishes nothing; only committed writes after it do (AR-003)", async () => {
    const { projectId } = await projects.createProject({ name: "Launch" });
    const { taskId } = await tasks.createTask({ projectId, description: "Draft notes" });
    await tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", recipientAddress: "/w", hostRoot, execution: worker });
    await publisher.idle(); emitted.length = 0;
    tasks = await boot();
    await publisher.idle();
    expect(emitted).toEqual([]);
  });

  it("deleting a Project or a Task publishes its removal", async () => {
    const { projectId } = await projects.createProject({ name: "Launch" });
    const { taskId } = await tasks.createTask({ projectId, description: "Draft notes" });
    await publisher.idle(); emitted.length = 0;
    await tasks.deleteTask({ projectId, taskId });
    await projects.deleteProject(projectId);
    await publisher.idle();
    expect(emitted).toContainEqual({ type: "task_removed", scope: { kind: "project", projectId }, taskId });
    expect(emitted.at(-1)).toEqual({ type: "project_removed", projectId });
  });
});
