import type { TaskDelegationOutcome } from "../../src/agent-collaboration/execution/task/task-delegation-command.js";
import type { ExistingTaskExecutionAssignInput, NewTaskExecutionLinkInput, TaskExecutionOwner, TaskExecutionResourcePort, TaskExecutionReopenInput, TaskExecutionRole } from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";

const rejection = (code: string, message: string) => Object.assign(new Error(message), { code });
/** One copy's current entry (a copy moves between Tasks by assignment; `everStarted` spans its periods). */
type Entry = { taskId: string; hostRoot: RootExecutionIdentity; execution: TaskExecutionReference; role: TaskExecutionRole; assignedBy?: string; open: boolean; start: "starting" | "started" | "failed"; everStarted?: true };

/**
 * Runtime-test double of the Task side's loaded agent run resources. It follows the reviewed
 * port semantics (link before resources, inherited links only from open creators, closed until the
 * assigner reactivates an assignment of a not-DONE Task, a closed copy takes a new Task only from its
 * most recent assigner, damaged data fails closed); the Projects implementation is tested separately.
 */
export class InMemoryTaskExecutionResources implements TaskExecutionResourcePort {
  readonly entries = new Map<string, Entry>();
  readonly tasks = new Map<string, { description: string; referenceFiles: string[]; done: boolean; adHoc?: true }>();
  readonly damaged = new Set<string>();
  readonly links: NewTaskExecutionLinkInput[] = [];
  /** Every committed existing-copy assignment, in order. */
  readonly assignments: ExistingTaskExecutionAssignInput[] = [];
  /** Test hook awaited inside `assignExistingTaskExecution` before the commit re-checks and writes. */
  beforeAssignCommit?: (input: ExistingTaskExecutionAssignInput) => Promise<void> | void;
  /** Test hook awaited inside `linkNewTaskExecution` before the write commits. */
  beforeLinkCommit?: (input: NewTaskExecutionLinkInput) => Promise<void> | void;
  private adHocCount = 0;

  addTask(taskId: string, description = `saved work for ${taskId}`): void {
    this.tasks.set(taskId, { description, referenceFiles: [], done: false });
  }
  /** The ad-hoc Tasks (no Project) that links created, in creation order. */
  adHocTaskIds(): string[] { return [...this.tasks.entries()].filter(([, task]) => task.adHoc).map(([taskId]) => taskId); }
  /** DONE: closes every open agent run of the Task (the commit that precedes the stop request). */
  close(taskId: string): TaskExecutionReference[] {
    const task = this.tasks.get(taskId);
    if (task) task.done = true;
    for (const entry of this.entries.values()) if (entry.taskId === taskId) entry.open = false;
    return this.closedAgentRuns(taskId);
  }
  /** The agent's own status change out of DONE (it reopens no entry). */
  setTaskOpen(taskId: string): void { this.tasks.get(taskId)!.done = false; }
  /** Every call to `reopenAssignment`, in order. */
  readonly reopenRequests: TaskExecutionReopenInput[] = [];
  closedAgentRuns(taskId: string): TaskExecutionReference[] {
    return [...this.entries.values()].filter(e => e.taskId === taskId && !e.open).map(e => e.execution);
  }
  entry(execution: TaskExecutionReference): Entry | undefined { return this.entries.get(taskExecutionReferenceKey(execution)); }

  async resolveAssignment(taskId: string) {
    if (this.damaged.has(taskId)) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", `Task run data could not be read (${taskId}). Fix or restore the file and restart the app; other features keep working.`);
    const task = this.tasks.get(taskId);
    if (!task) throw Object.assign(new Error(`Task '${taskId}' was not found.`), { code: "TASK_NOT_FOUND" });
    if (task.done) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "Task is DONE; reopen it before assigning new work.");
    if (task.adHoc) throw Object.assign(new Error(`Task '${taskId}' was not found.`), { code: "TASK_NOT_FOUND" });
    return { description: task.description, referenceFiles: task.referenceFiles };
  }
  async linkNewTaskExecution(input: NewTaskExecutionLinkInput) {
    await this.beforeLinkCommit?.(input);
    let taskId: string;
    if (input.role === "assigned" && input.adHocTask) {
      // Like the Projects side: a new Task with no Project, text only, created by this link.
      taskId = `ad_hoc_task_${++this.adHocCount}`;
      this.tasks.set(taskId, { description: input.adHocTask.description, referenceFiles: [...input.adHocTask.referenceFiles], done: false, adHoc: true });
    } else if (input.role === "assigned") {
      taskId = input.taskId;
      if (this.damaged.has(taskId)) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", "Task run data could not be read.");
      if (this.tasks.get(taskId)?.done !== false) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "Task is DONE or unknown.");
    } else {
      const creator = this.entry(input.creator);
      if (!creator?.open) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "The creating Task run is closed.");
      taskId = creator.taskId;
    }
    const key = taskExecutionReferenceKey(input.execution);
    if (this.entries.has(key)) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "Already linked.");
    this.entries.set(key, { taskId, hostRoot: input.hostRoot, execution: input.execution, role: input.role,
      ...(input.role === "assigned" ? { assignedBy: input.assignedBy } : {}), open: true, start: "starting" });
    this.links.push(input);
    return { taskId };
  }
  async markStarted(execution: TaskExecutionReference) {
    const entry = this.entry(execution);
    if (entry?.start === "starting") { entry.start = "started"; entry.everStarted = true; }
  }
  async markFailed(execution: TaskExecutionReference) {
    const entry = this.entry(execution);
    if (entry?.start === "starting") entry.start = "failed";
  }
  /** The innermost linked element of the chain decides, by its current entry. */
  ownerOf(chain: readonly TaskExecutionReference[]): TaskExecutionOwner | null {
    const innermost = chain.map(execution => this.entry(execution)).find(entry => entry !== undefined);
    if (!innermost) {
      if (this.damaged.size) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", "Task run data could not be read.");
      return null;
    }
    return { taskId: innermost.taskId, execution: innermost.execution, open: innermost.open };
  }
  isOpen(execution: TaskExecutionReference): boolean { return this.entry(execution)?.open === true; }
  openTaskExecutions(taskId: string, role: TaskExecutionRole): TaskExecutionReference[] {
    return [...this.entries.values()].filter(e => e.taskId === taskId && e.role === role && e.open).map(e => e.execution);
  }
  closedTaskExecutionsIn(hostRoot: RootExecutionIdentity): TaskExecutionReference[] {
    return [...this.entries.values()].filter(e => !e.open && !this.damaged.has(e.taskId)
      && rootExecutionIdentityKey(e.hostRoot) === rootExecutionIdentityKey(hostRoot)).map(e => e.execution);
  }
  async assertReopenable(input: TaskExecutionReopenInput): Promise<void> {
    const entry = this.entry(input.execution);
    if (!entry) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "The agent run belongs to no Task.");
    if (entry.role !== "assigned" || entry.assignedBy !== input.requestedBy) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "Only the run that assigned it can reactivate it.");
    if (entry.start !== "started") throw rejection("TASK_REACTIVATION_UNAVAILABLE", "This assignment never started.");
    const task = this.tasks.get(entry.taskId);
    if (!task) throw rejection("TASK_NOT_FOUND", "The Task was deleted; its work cannot be reactivated.");
    if (task.done) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "This Task is DONE. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again.");
  }
  async reopenAssignment(input: TaskExecutionReopenInput) {
    this.reopenRequests.push(input);
    await this.assertReopenable(input);
    const entry = this.entry(input.execution)!;
    const reopened = !entry.open;
    entry.open = true;
    return { taskId: entry.taskId, reopened };
  }
  async assertAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string }>): Promise<void> {
    this.assertResourceDataReadable();
    await this.resolveAssignment(input.taskId);
    const entry = this.entry(input.execution);
    if (!entry) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "This copy belongs to no Task.");
    if (entry.role !== "assigned") throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "This copy is sub-work or a helper of a Task worker, not an assignment.");
    if (entry.assignedBy !== input.requestedBy) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "Only the run that made this copy's most recent assignment can give it a new Task.");
    if (entry.open) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", `This copy still works on Task ${entry.taskId}. Mark it DONE or CANCELLED first, or delegate Task ${input.taskId} to a new copy with recipient_address.`);
    if (entry.taskId === input.taskId) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", `This copy's most recent assignment is already Task ${input.taskId}.`);
    if (!entry.everStarted) throw rejection("TASK_REACTIVATION_UNAVAILABLE", "This copy never started, so it has no conversation to resume.");
  }
  async assignExistingTaskExecution(input: ExistingTaskExecutionAssignInput): Promise<void> {
    await this.beforeAssignCommit?.(input);
    await this.assertAssignable({ execution: input.execution, requestedBy: input.assignedBy, taskId: input.taskId });
    const entry = this.entry(input.execution)!;
    Object.assign(entry, { taskId: input.taskId, assignedBy: input.assignedBy, open: true, start: "starting" as const });
    this.assignments.push(input);
  }
  /** Every status-change notification, in order. */
  readonly statusChanges: Array<{ hostRoot: RootExecutionIdentity; references: TaskExecutionReference[] }> = [];
  taskExecutionsStatusChanged(hostRoot: RootExecutionIdentity, references: readonly TaskExecutionReference[]): void {
    this.statusChanges.push({ hostRoot, references: [...references] });
  }
  assertResourceDataReadable(): void {
    if (this.damaged.size) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", "Task run data could not be read. Fix or restore the file and restart the app; other features keep working.");
  }
}

/** The agent run that receives a delegated copy's work (an Agent copy itself, or a Team copy's coordinator); throws on a failed delegation. */
export const ingressOfOutcome = (outcome: TaskDelegationOutcome): string => {
  if (!outcome.delegated) throw new Error(`Delegation failed: ${outcome.message}`);
  return outcome.copy.kind === "agent" ? outcome.copy.agentRunId : outcome.copy.teamCoordinatorAgentRunId;
};
