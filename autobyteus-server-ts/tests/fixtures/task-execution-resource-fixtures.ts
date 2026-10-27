import type { TaskDelegationOutcome } from "../../src/agent-collaboration/execution/task/task-delegation-command.js";
import type { ExistingTaskExecutionAssignInput, NewTaskExecutionLinkInput, TaskExecutionOwner, TaskExecutionResourcePort, TaskExecutionReopenInput, TaskExecutionRole } from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";

const rejection = (code: string, message: string) => Object.assign(new Error(message), { code });
/**
 * One copy's current entry (a copy moves between Tasks by assignment; `everStarted` spans its periods). A copy given
 * another Task while open keeps its earlier open Tasks in `otherOpenTaskIds` (oldest first).
 */
type Entry = { taskId: string; hostRoot: RootExecutionIdentity; execution: TaskExecutionReference; role: TaskExecutionRole; assignedBy?: string; open: boolean; start: "starting" | "started" | "failed"; everStarted?: true; otherOpenTaskIds?: string[] };

/**
 * Runtime-test double of the Task side's loaded agent run resources. It follows the reviewed
 * port semantics (link before resources, inherited links only from open creators, closed until the
 * assigner reactivates an assignment of a not-DONE Task, a copy takes another Task only from its most recent
 * assigner and may hold several open Tasks, closed only when its last one closes, damaged data fails closed);
 * the Projects implementation is tested separately.
 */
export class InMemoryTaskExecutionResources implements TaskExecutionResourcePort {
  readonly entries = new Map<string, Entry>();
  readonly tasks = new Map<string, { description: string; referenceFiles: string[]; done: boolean; adHoc?: true; taskKey?: string; comments?: string[] }>();
  readonly damaged = new Set<string>();
  readonly links: NewTaskExecutionLinkInput[] = [];
  /** Every committed existing-copy assignment, in order. */
  readonly assignments: ExistingTaskExecutionAssignInput[] = [];
  /** Test hook awaited inside `assignExistingTaskExecution` before the commit re-checks and writes. */
  beforeAssignCommit?: (input: ExistingTaskExecutionAssignInput) => Promise<void> | void;
  /** Test hook awaited inside `linkNewTaskExecution` before the write commits. */
  beforeLinkCommit?: (input: NewTaskExecutionLinkInput) => Promise<void> | void;
  private adHocCount = 0;

  /** A saved Project Task; with `taskKey`, agents may also name it by that key (any letter case). */
  addTask(taskId: string, description = `saved work for ${taskId}`, taskKey?: string): void {
    this.tasks.set(taskId, { description, referenceFiles: [], done: false, ...(taskKey ? { taskKey } : {}) });
  }
  /** The ad-hoc Tasks (no Project) that links created, in creation order. */
  adHocTaskIds(): string[] { return [...this.tasks.entries()].filter(([, task]) => task.adHoc).map(([taskId]) => taskId); }
  /** DONE: closes every open agent run of the Task (the commit that precedes the stop request). */
  close(taskId: string): TaskExecutionReference[] {
    const task = this.tasks.get(taskId);
    if (task) task.done = true;
    for (const entry of this.entries.values()) {
      if (entry.taskId !== taskId) { entry.otherOpenTaskIds = entry.otherOpenTaskIds?.filter((id) => id !== taskId); continue; }
      // The newest other open Task becomes current; the copy is closed only when none is left.
      const next = entry.otherOpenTaskIds?.pop();
      if (next) entry.taskId = next; else entry.open = false;
    }
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

  /** Like the Projects side: a Project Task by its ID, else by its key; the stored ID and the agent-facing key come back. */
  async resolveAssignment(reference: string) {
    const taskId = this.tasks.has(reference) ? reference
      : [...this.tasks.entries()].find(([, task]) => task.taskKey === reference.toLowerCase())?.[0] ?? reference;
    if (this.damaged.has(taskId)) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", `Task run data could not be read (${taskId}). Fix or restore the file and restart the app; other features keep working.`);
    const task = this.tasks.get(taskId);
    if (!task) throw Object.assign(new Error(`Task '${taskId}' was not found.`), { code: "TASK_NOT_FOUND" });
    if (task.done) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "Task is DONE; reopen it before assigning new work.");
    if (task.adHoc) throw Object.assign(new Error(`Task '${taskId}' was not found.`), { code: "TASK_NOT_FOUND" });
    return { taskId, taskReference: task.taskKey ?? taskId, projectId: "project_fixture", title: task.description.split("\n")[0]!.trim(), description: task.description, comments: task.comments ?? [], referenceFiles: task.referenceFiles };
  }
  /** autobyteus-32: a Task's identity (a Task with no Project: no key, its description's first line as title). */
  async describeTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) throw Object.assign(new Error(`Task '${taskId}' was not found.`), { code: "TASK_NOT_FOUND" });
    const title = task.description.split("\n")[0]!.trim();
    return task.adHoc ? { taskKey: null, projectId: null, title } : { taskKey: task.taskKey ?? taskId, projectId: "project_fixture", title };
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
  closedTaskExecutionsIn(hostRoot: RootExecutionIdentity): TaskExecutionReference[] {
    return [...this.entries.values()].filter(e => !e.open && !this.damaged.has(e.taskId)
      && rootExecutionIdentityKey(e.hostRoot) === rootExecutionIdentityKey(hostRoot)).map(e => e.execution);
  }
  async assertReopenable(input: TaskExecutionReopenInput): Promise<void> {
    const entry = this.entry(input.execution);
    if (!entry) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "The agent run belongs to no Task.");
    if (entry.role !== "assigned" || entry.assignedBy !== input.requestedBy) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "Only the agent that assigned the Task can continue it.");
    if (entry.start !== "started") throw rejection("TASK_REACTIVATION_UNAVAILABLE", "This assignment never started.");
    const task = this.tasks.get(entry.taskId);
    if (!task) throw rejection("TASK_NOT_FOUND", "The Task was deleted, so its task agent cannot continue.");
    if (task.done) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "This Task is DONE. The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this run id again.");
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
    if (entry.role !== "assigned") throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "This task agent works on part of another agent's Task, so you can't give it a Task.");
    if (entry.assignedBy !== input.requestedBy) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "Only the agent that gave this task agent its most recent Task can give it a new one.");
    if (!entry.open && entry.taskId === input.taskId) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", `This task agent already has Task ${input.taskId}.`);
    if (entry.open && [entry.taskId, ...entry.otherOpenTaskIds ?? []].includes(input.taskId)) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "This task agent already works on this Task.");
    if (!entry.everStarted) throw rejection("TASK_REACTIVATION_UNAVAILABLE", "This copy never started, so it has no conversation to resume.");
  }
  async assignExistingTaskExecution(input: ExistingTaskExecutionAssignInput): Promise<void> {
    await this.beforeAssignCommit?.(input);
    await this.assertAssignable({ execution: input.execution, requestedBy: input.assignedBy, taskId: input.taskId });
    const entry = this.entry(input.execution)!;
    const otherOpenTaskIds = entry.open ? [...entry.otherOpenTaskIds ?? [], entry.taskId] : [];
    Object.assign(entry, { taskId: input.taskId, assignedBy: input.assignedBy, open: true, start: "starting" as const, otherOpenTaskIds });
    this.assignments.push(input);
  }
  async openTaskReferencesOf(execution: TaskExecutionReference, exceptTaskId: string): Promise<string[]> {
    const entry = this.entry(execution);
    if (!entry?.open) return [];
    return [...entry.otherOpenTaskIds ?? [], entry.taskId].filter((id) => id !== exceptTaskId).map((id) => this.tasks.get(id)?.taskKey ?? id);
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
