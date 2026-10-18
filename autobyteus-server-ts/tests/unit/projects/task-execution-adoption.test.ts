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
import { createAgentRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { UnfinishedAdoptionRevertRequest } from "../../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../../src/agent-collaboration/execution/task/task-execution-reference.js";

/** The Task side of adopting a run the user started (design SR-008): its first assignment, and the undo on close or delete. */

const pm = createAgentRootExecutionIdentity("pm-run");
const run: TaskExecutionReference = { teamRunId: "team-run" };
const copy: TaskExecutionReference = { agentRunId: "copy-run" };

describe("adoption on the Task side", () => {
  let appData: string, layout: ProjectsLayout, adHocLayout: AdHocTasksLayout, store: ProjectStore, projects: ProjectService, projectId: string;
  let tasks: ProjectTaskService, revert: ReturnType<typeof vi.fn<UnfinishedAdoptionRevertRequest>>;
  const boot = async () => {
    revert = vi.fn<UnfinishedAdoptionRevertRequest>(async () => true);
    const service = new ProjectTaskService({ store, adHocTasks: new AdHocTaskStore(adHocLayout), contextStore: new ProjectTaskContextStore(layout),
      requestRelease: async (_root, executions) => executions.map((execution) => ({ execution, stopped: true })), revertUnfinishedAdoption: revert,
      taskExecutionResources: new TaskExecutionResourceService(new TaskExecutionResourceStore(layout, adHocLayout)) });
    await service.load();
    return service;
  };
  const rawEntries = async (taskId: string) => (JSON.parse(await fs.readFile(layout.taskExecutionResourcesFile(projectId, taskId), "utf8"))).agentRunResources;
  const adopt = (taskId: string, execution = run) => tasks.assignAdoptedRun({ hostRoot: pm, execution, taskId, assignedBy: "pm-run",
    recipientAddress: "/software_engineering_team", ...("teamRunId" in execution ? { teamCoordinatorAgentRunId: "lead" } : {}) });
  const newTask = async (description = "Work Journal") => (await tasks.createTask({ projectId, description })).taskId;

  beforeEach(async () => {
    appData = await fs.mkdtemp(path.join(os.tmpdir(), "adoption-task-side-"));
    layout = new ProjectsLayout(path.join(appData, "projects"));
    adHocLayout = new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"));
    store = new ProjectStore(layout);
    tasks = await boot();
    projects = new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] }, afterDelete: (id) => tasks.afterProjectDeleted(id) });
    projectId = (await projects.createProject({ name: "P" })).projectId;
  });
  afterEach(async () => { await tasks.drainRuntimeReleases(); vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

  it("records the delegator's first assignment of the run at its catalog address, `starting`, and reads it as the run's current assignment", async () => {
    const taskId = await newTask();
    await adopt(taskId);
    expect(await rawEntries(taskId)).toEqual([{ role: "assigned", assignedBy: "pm-run", recipientAddress: "/software_engineering_team",
      hostRoot: { kind: "agent", runId: "pm-run" }, agentRun: { kind: "team", teamRunId: "team-run", coordinatorAgentRunId: "lead" },
      linkedAt: expect.any(String), start: "starting", closedAt: null }]);
    expect(tasks.currentAssignmentOf(run)).toEqual({ taskId, open: true, role: "assigned", assignedBy: "pm-run", hostRoot: pm, started: false });
    expect(tasks.currentAssignmentOf(copy)).toBeNull();
  });

  it("refuses a DONE Task and a run with an open entry; a closed earlier entry does not block a later adoption", async () => {
    const first = await newTask();
    await tasks.updateTaskById({ taskId: first, status: "DONE" });
    await expect(adopt(first)).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CLOSED" });
    const second = await newTask("Second");
    await adopt(second);
    const third = await newTask("Third");
    await expect(adopt(third)).rejects.toMatchObject({ code: "TASK_AGENT_RESOURCE_CONFLICT", message: "The run already belongs to a Task." });
    await tasks.updateTaskById({ taskId: second, status: "CANCELLED" });
    await adopt(third);
    expect(tasks.currentAssignmentOf(run)).toMatchObject({ taskId: third, open: true });
  });

  it("asks the runtime to undo every never-started assignment when the Task is DONE (a started one is a finished adoption or copy)", async () => {
    const taskId = await newTask();
    await adopt(taskId);
    await adopt(taskId, copy);
    await tasks.markStarted(copy);
    await tasks.updateTaskById({ taskId, status: "DONE" });
    await tasks.drainRuntimeReleases();
    expect(revert.mock.calls).toEqual([[pm, run]]);
    // Repeating DONE asks again (a failed undo is retried that way).
    revert.mockRejectedValueOnce(new Error("disk full"));
    await tasks.updateTaskById({ taskId, status: "DONE" });
    await tasks.drainRuntimeReleases();
    expect(revert).toHaveBeenCalledTimes(2);
  });

  it("after a Task delete, undoes the unfinished adoption and closes its entry, so the run belongs to no Task", async () => {
    const taskId = await newTask();
    await adopt(taskId);
    await adopt(taskId, copy);
    revert.mockImplementation(async (_root, execution) => "teamRunId" in execution);
    expect(await tasks.deleteTask({ projectId, taskId })).toBe(true);
    await tasks.drainRuntimeReleases();
    expect(revert.mock.calls.map(([, execution]) => execution)).toEqual([run, copy]);
    expect(tasks.currentAssignmentOf(run)).toMatchObject({ open: false });
    // Not an unfinished adoption (the runtime undid nothing): its entry is left as a delete leaves it.
    expect(tasks.currentAssignmentOf(copy)).toMatchObject({ open: true });
  });

  it("after a Project delete, undoes its Tasks' unfinished adoptions (the Task files are gone, the run resources stay)", async () => {
    const taskId = await newTask();
    await adopt(taskId);
    expect(await projects.deleteProject(projectId)).toBe(true);
    await tasks.drainRuntimeReleases();
    expect(revert.mock.calls).toEqual([[pm, run]]);
    expect(tasks.currentAssignmentOf(run)).toMatchObject({ open: false });
  });

  it("never fails a Project delete because an undo fails", async () => {
    const failing = new ProjectService({ store, workspaceLookup: { listRegisteredWorkspaceRootPaths: async () => [] },
      afterDelete: async () => { throw new Error("runtime unavailable"); } });
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(await failing.deleteProject(projectId)).toBe(true);
    expect(error).toHaveBeenCalledWith("TASK_ADOPTION_REVERT_FAILED", expect.objectContaining({ projectId }));
  });
});
