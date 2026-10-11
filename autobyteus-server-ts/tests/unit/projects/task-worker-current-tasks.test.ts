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
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskExecutionReleaseRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";

const hostRoot = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "manager-root" });
const agent: TaskExecutionReference = { agentRunId: "writer" };
const team: TaskExecutionReference = { teamRunId: "review-team" };

/** The batched "current Task of each Task worker" read (DS-001, REQ-008, REQ-009, AR-001). */
describe("ProjectTaskService.currentTasksOfTaskWorkers", () => {
  let appData: string, layout: ProjectsLayout, store: ProjectStore, projects: ProjectService, tasks: ProjectTaskService, projectId: string;

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "task-worker-tasks-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    const adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    const changes = new ProjectChangePublisher();
    projects = new ProjectService({ store, changes, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] } });
    projectId = (await projects.createProject({ name: "Desktop App" })).projectId;
    const requestRelease = vi.fn<TaskExecutionReleaseRequest>(async (_root, executions) => executions.map((execution) => ({ execution, stopped: true })));
    tasks = new ProjectTaskService({ store, adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout), changes,
      requestRelease, taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)) });
    await tasks.load();
  });
  afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  const assign = async (taskId: string, execution: TaskExecutionReference) => {
    await tasks.linkNewTaskExecution({ role: "assigned", taskId, assignedBy: "manager", recipientAddress: "/worker", hostRoot, execution,
      ...("teamRunId" in execution ? { teamCoordinatorAgentRunId: "lead" } : {}) });
    await tasks.markStarted(execution);
  };
  const create = async (description: string) => (await tasks.createTask({ projectId, description })).taskId;

  it("answers an agent and a team worker with their Project Task and Temp task, in request order", async () => {
    const taskId = await create("Ship the summary line\nwith details");
    await assign(taskId, agent);
    const { taskId: tempTaskId } = await tasks.linkNewTaskExecution({ role: "assigned", assignedBy: "manager", recipientAddress: "/review_team", hostRoot,
      execution: team, teamCoordinatorAgentRunId: "lead", adHocTask: { description: "Review it", referenceFiles: [] } });

    expect(await tasks.currentTasksOfTaskWorkers([agent, team, { agentRunId: "unknown" }, { teamRunId: "unknown" }])).toEqual([
      { execution: agent, task: { taskId, projectId, description: "Ship the summary line\nwith details", status: "TODO" } },
      { execution: team, task: { taskId: tempTaskId, projectId: null, description: "Review it", status: "TODO" } },
      { execution: { agentRunId: "unknown" }, task: null },
      { execution: { teamRunId: "unknown" }, task: null },
    ]);
  });

  it("answers the follow-up Task of a reassigned copy and keeps a closed current Task (REQ-008)", async () => {
    const first = await create("First Task");
    const followUp = await create("Follow-up Task");
    await assign(first, team);
    await tasks.updateTaskById({ taskId: first, status: "DONE" });
    expect(await tasks.currentTasksOfTaskWorkers([team])).toEqual([{ execution: team, task: { taskId: first, projectId, description: "First Task", status: "DONE" } }]);

    await tasks.assignExistingTaskExecution({ hostRoot, execution: team, teamCoordinatorAgentRunId: "lead", taskId: followUp, assignedBy: "manager" });
    expect((await tasks.currentTasksOfTaskWorkers([team]))[0]!.task).toMatchObject({ taskId: followUp, status: "TODO" });
  });

  it("answers null for a sub-work copy, which is never its Task's root", async () => {
    const taskId = await create("Root work");
    await assign(taskId, agent);
    await tasks.linkNewTaskExecution({ role: "delegated", creator: agent, hostRoot, execution: { agentRunId: "sub-work" } });
    expect(await tasks.currentTasksOfTaskWorkers([{ agentRunId: "sub-work" }, agent])).toEqual([
      { execution: { agentRunId: "sub-work" }, task: null },
      { execution: agent, task: expect.objectContaining({ taskId }) },
    ]);
  });

  it("answers null for a deleted Task and for a Task of a deleted Project, while the other workers still resolve (AR-001)", async () => {
    const deleted = await create("Deleted Task");
    await assign(deleted, agent);
    const otherProjectId = (await projects.createProject({ name: "Other" })).projectId;
    const other = (await tasks.createTask({ projectId: otherProjectId, description: "In a deleted Project" })).taskId;
    await assign(other, team);
    const survivor = await create("Still here");
    const survivorWorker = { agentRunId: "survivor" };
    await assign(survivor, survivorWorker);

    await tasks.deleteTask({ projectId, taskId: deleted });
    await projects.deleteProject(otherProjectId);

    expect(await tasks.currentTasksOfTaskWorkers([agent, team, survivorWorker])).toEqual([
      { execution: agent, task: null },
      { execution: team, task: null },
      { execution: survivorWorker, task: { taskId: survivor, projectId, description: "Still here", status: "TODO" } },
    ]);
  });

  it("logs an unexpected read error for one worker and answers it null; the batch never fails", async () => {
    const broken = await create("Unreadable");
    await assign(broken, agent);
    const fine = await create("Readable");
    await assign(fine, team);
    const readTask = store.readTask.bind(store);
    vi.spyOn(store, "readTask").mockImplementation(async (pid, tid) => {
      if (tid === broken) throw Object.assign(new Error("disk said no"), { code: "EIO" });
      return readTask(pid, tid);
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(await tasks.currentTasksOfTaskWorkers([agent, team])).toEqual([
      { execution: agent, task: null },
      { execution: team, task: expect.objectContaining({ taskId: fine }) },
    ]);
    expect(warn).toHaveBeenCalledWith("TASK_WORKER_TASK_READ_FAILED", { execution: agent, error: "disk said no" });
  });
});
