import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import type { ProjectTask, ProjectTaskStatus, TaskLocation } from "../domain/models.js";
import { ProjectError } from "../domain/project-errors.js";
import { isTerminalTaskStatus } from "../domain/task-status.js";
import { assertTaskExecutionAssignable, notCurrentTaskMessage } from "../domain/task-execution-resources.js";
import type { ProjectStore } from "../stores/project-store.js";
import type { AdHocTaskStore } from "../stores/ad-hoc-task-store.js";
import type { TaskExecutionResourceService } from "./task-execution-resource-service.js";

/** The refusal of an assignment to a DONE or CANCELLED Task. */
export const terminalAssignment = (status: ProjectTaskStatus): ProjectError => new ProjectError("TASK_AGENT_RESOURCE_CLOSED",
  `The Task is ${status}; set it to TODO or IN_PROGRESS before you delegate it.`);

/**
 * ProjectTaskService's Task-side eligibility checks for its runtime port: an assignment target (exists, not DONE or
 * CANCELLED), the copy-side rules of an existing-copy assignment, and whether a closed copy's current Task allows
 * reactivation. Agent-facing texts name Tasks by key. Used only by ProjectTaskService, inside its serializations.
 */
export class TaskAssignmentEligibility {
  constructor(
    private readonly store: () => Pick<ProjectStore, "readTask">,
    private readonly adHocTasks: Pick<AdHocTaskStore, "read">,
    private readonly resources: Pick<TaskExecutionResourceService, "earlierTaskLocationsOf" | "historyOf" | "locationOfTask" | "openTaskIdsOf">,
  ) {}

  /**
   * Reactivation needs the copy's current Task to exist and be TODO or IN_PROGRESS; only the agent changes
   * that status. When it is closed but an earlier Task of the copy was reopened, the refusal names the
   * current Task and the working next step (REQ-007).
   */
  async assertReopenTaskNotTerminal(location: TaskLocation, execution: TaskExecutionReference): Promise<void> {
    const task = await this.readTaskAt(location);
    if (!task) throw new ProjectError("TASK_NOT_FOUND", "The Task was deleted, so its task agent cannot continue.");
    if (!isTerminalTaskStatus(task.status)) return;
    for (const earlier of this.resources.earlierTaskLocationsOf(execution)) {
      const reopened = await this.readTaskAt(earlier);
      if (reopened && !isTerminalTaskStatus(reopened.status)) {
        throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", notCurrentTaskMessage(execution, { taskReference: task.reference, status: task.status }, reopened.reference));
      }
    }
    throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED",
      `This Task is ${task.status}. The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this run id again.`);
  }
  /** A Task's status and agent-facing reference (a Project Task's key, else its ID); null when it (or its Project) was deleted. */
  private async readTaskAt(location: TaskLocation): Promise<{ status: ProjectTaskStatus; reference: string } | null> {
    if (location.projectId === null) {
      const task = await this.adHocTasks.read(location.taskId);
      return task && { status: task.status, reference: task.taskId };
    }
    // A deleted Project took its Tasks with it.
    const task = await this.store().readTask(location.projectId, location.taskId)
      .catch((error: unknown) => { if ((error as { code?: unknown }).code === "PROJECT_NOT_FOUND") return null; throw error; });
    return task && { status: task.status, reference: task.taskKey };
  }
  /** Assignment target rules for a Project Task: it exists and is not DONE or CANCELLED. */
  async assertAssignableTask(projectId: string, taskId: string): Promise<ProjectTask> {
    const task = await this.store().readTask(projectId, taskId);
    if (!task) throw new ProjectError("TASK_NOT_FOUND", "The Task was deleted.");
    if (isTerminalTaskStatus(task.status)) throw terminalAssignment(task.status);
    return task;
  }
  /** The copy-side rules of an existing-copy assignment, on the copy's history across Tasks; texts name Tasks by key. */
  assertCopyAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string }>, task: ProjectTask): void {
    assertTaskExecutionAssignable(this.resources.historyOf(input.execution), { requestedBy: input.requestedBy, taskId: input.taskId, taskReference: task.taskKey });
  }
  /**
   * The agent-facing references (a Project Task's key, a Temp task's ID) of the copy's open Tasks other than
   * `exceptTaskId`, oldest first; a Task deleted meanwhile is left out. For the given-Task message.
   */
  async openTaskReferencesOf(execution: TaskExecutionReference, exceptTaskId: string): Promise<string[]> {
    const references: string[] = [];
    for (const taskId of this.resources.openTaskIdsOf(execution).filter((id) => id !== exceptTaskId)) {
      const location = this.resources.locationOfTask(taskId);
      const task = location && await this.readTaskAt(location);
      if (task) references.push(task.reference);
    }
    return references;
  }
}
