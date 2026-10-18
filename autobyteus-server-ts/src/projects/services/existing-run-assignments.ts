import type {
  AdoptedRunAssignInput,
  CurrentTaskAssignment,
  ExistingTaskExecutionAssignInput,
} from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { ProjectTask, ProjectTaskStatus, TaskLocation } from "../domain/models.js";
import { ProjectError } from "../domain/project-errors.js";
import { isTerminalTaskStatus } from "../domain/task-status.js";
import { assertTaskExecutionAssignable } from "../domain/task-execution-resources.js";
import type { TaskExecutionResourceService } from "./task-execution-resource-service.js";
import type { TaskReferences } from "./task-references.js";

type Dependencies = Readonly<{
  resources: TaskExecutionResourceService;
  references: () => TaskReferences;
  readTask(projectId: string, taskId: string): Promise<ProjectTask | null>;
  /** A Task's status and agent-facing reference; null when it (or its Project) was deleted. */
  readTaskAt(location: TaskLocation): Promise<Readonly<{ status: ProjectTaskStatus; reference: string }> | null>;
}>;

export const terminalAssignment = (status: ProjectTaskStatus): ProjectError => new ProjectError("TASK_AGENT_RESOURCE_CLOSED",
  `The Task is ${status}; set it to TODO or IN_PROGRESS before you delegate it.`);

/**
 * Assigning a Project Task to a run that already exists, for ProjectTaskService's runtime port: an earlier copy of
 * the assigner (DS-002: eligibility, then the commit re-checked under the copy's and the Task's ordering) or a run the
 * user started (adoption, design SR-008: its first assignment, made by the delegator at the run's catalog address).
 */
export class ExistingRunAssignments {
  constructor(private readonly deps: Dependencies) {}

  /** Advisory existing-copy eligibility (the design's complete list), before any runtime step. */
  async assertAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string }>): Promise<void> {
    await this.deps.resources.load();
    this.deps.resources.assertAllReadable();
    const { projectId } = await this.deps.references().byId(input.taskId);
    await this.assertCopyAssignable(input, await this.assertAssignableTask(projectId, input.taskId));
  }

  /** The existing-copy commit: every condition re-checked under the copy's and then the Task's serialization. */
  async assignExisting(input: ExistingTaskExecutionAssignInput): Promise<void> {
    await this.deps.resources.load();
    const { projectId } = await this.deps.references().byId(input.taskId);
    await this.deps.resources.serializeCopyInTask(input.execution, () => input.taskId, async () => {
      this.deps.resources.assertAllReadable();
      const task = await this.assertAssignableTask(projectId, input.taskId);
      await this.assertCopyAssignable({ execution: input.execution, requestedBy: input.assignedBy, taskId: input.taskId }, task);
      await this.deps.resources.assignExisting({ projectId, taskId: input.taskId }, input);
    });
  }

  /** The run's current assignment, from the view; `null` when it never belonged to a Task. */
  currentAssignmentOf(execution: TaskExecutionReference): CurrentTaskAssignment | null {
    const history = this.deps.resources.historyOf(execution);
    if (!history) return null;
    const { current } = history;
    return {
      taskId: history.currentTaskId, open: current.closedAt === null, role: current.role,
      ...(current.assignedBy ? { assignedBy: current.assignedBy } : {}), hostRoot: current.hostRoot, started: current.start === "started",
    };
  }

  /** The adoption commit: the Task is an open Project Task and the run has no open entry, re-checked under both orderings. */
  async assignAdopted(input: AdoptedRunAssignInput): Promise<void> {
    await this.deps.resources.load();
    const { projectId } = await this.deps.references().byId(input.taskId);
    await this.deps.resources.serializeCopyInTask(input.execution, () => input.taskId, async () => {
      this.deps.resources.assertTaskReadable(input.taskId);
      await this.assertAssignableTask(projectId, input.taskId);
      await this.deps.resources.assignAdopted({ projectId, taskId: input.taskId }, input);
    });
  }

  /** Assignment target rules for a Project Task: it exists and is not DONE or CANCELLED. */
  private async assertAssignableTask(projectId: string, taskId: string): Promise<ProjectTask> {
    const task = await this.deps.readTask(projectId, taskId);
    if (!task) throw new ProjectError("TASK_NOT_FOUND", "The Task was deleted.");
    if (isTerminalTaskStatus(task.status)) throw terminalAssignment(task.status);
    return task;
  }

  /** The copy-side rules of an existing-copy assignment, on the copy's history across Tasks; texts name Tasks by key. */
  private async assertCopyAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string }>, task: ProjectTask): Promise<void> {
    const history = this.deps.resources.historyOf(input.execution);
    const currentLocation = history && history.current.closedAt === null ? this.deps.resources.locationOfTask(history.currentTaskId) : null;
    const currentTask = currentLocation ? await this.deps.readTaskAt(currentLocation) : null;
    assertTaskExecutionAssignable(history, { requestedBy: input.requestedBy, taskId: input.taskId, taskReference: task.taskKey,
      currentTaskReference: currentTask?.reference ?? null, ...(currentTask ? { currentTaskStatus: currentTask.status } : {}) });
  }
}
