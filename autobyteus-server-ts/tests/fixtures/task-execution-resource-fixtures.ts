import type { RunTaskRecords } from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskDelegationOutcome } from "../../src/agent-collaboration/execution/task/task-delegation-command.js";
import {
  runReferenceOf,
  type ExistingTaskExecutionAssignInput, type NewTaskExecutionLinkInput, type PeerRunMember, type RunDelegatedFrom,
  type TaskEntriesListener, type TaskExecutionResourcePort, type TaskExecutionReopenInput, type TaskExecutionRole, type TaskRunEntry,
} from "../../src/agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";
import { taskExecutionReferenceKey } from "@autobyteus/collaboration-stream-contracts";

const rejection = (code: string, message: string) => Object.assign(new Error(message), { code });
/**
 * One copy's current entry (a copy moves between Tasks by assignment; `everStarted` spans its periods). A copy given
 * another Task while open keeps its earlier open Tasks in `otherOpenTaskIds` (oldest first).
 */
type Entry = { taskId: string; delegatedFrom: RunDelegatedFrom; execution: TaskExecutionReference; role: TaskExecutionRole; open: boolean; start: "starting" | "started" | "failed"; everStarted?: true; otherOpenTaskIds?: string[];
  /** A Team copy's coordinator (its ingress). */ teamCoordinatorAgentRunId?: string; recipientAddress: string; nodeId?: string; members?: readonly PeerRunMember[]; linkedAt: string };

/**
 * Runtime-test double of the Task side's loaded agent run resources. It follows the reviewed
 * port semantics (link before resources, inherited links only from open creators, closed until the
 * assigner reactivates an assignment of a not-DONE Task, a copy takes another Task only from its most recent
 * assigner and may hold several open Tasks, closed only when its last one closes, damaged data fails closed);
 * the Projects implementation is tested separately.
 */
export class InMemoryTaskExecutionResources implements TaskExecutionResourcePort, RunTaskRecords {
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
  /** Each Project's new-copy folder when it has a linked one (AC-001): absent means no link. A value of an Error refuses. */
  readonly projectFolders = new Map<string, string | Error>();
  private adHocCount = 0;
  private linkCount = 0;
  /** The `DelegationIndex` a harness builds over this double, told after each change (like the Task side). */
  private listener: TaskEntriesListener | null = null;
  setEntriesListener(listener: TaskEntriesListener): void { this.listener = listener; }
  /** Tells the listener of a change made directly in `entries` (a test's own write). */
  changed(taskId: string): void { this.listener?.entriesChanged(taskId); }

  async projectFolderForNewDelegatedRun(projectId: string): Promise<string | null> {
    const folder = this.projectFolders.get(projectId) ?? null;
    if (folder instanceof Error) throw folder;
    return folder;
  }
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
    this.changed(taskId);
    return this.closedAgentRuns(taskId);
  }
  /** The Task is deleted: its entries go with it, and the tree is told (as `ProjectTaskService` deletes a Task). */
  deleteTask(taskId: string): void {
    this.tasks.delete(taskId);
    for (const [key, entry] of this.entries) if (entry.taskId === taskId) this.entries.delete(key);
    this.changed(taskId);
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
      const creatorRun = runReferenceOf(input.delegatedFrom.delegatingRun);
      const creator = creatorRun ? this.entry(creatorRun) : undefined;
      if (!creator?.open) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "The creating Task run is closed.");
      taskId = creator.taskId;
    }
    const key = taskExecutionReferenceKey(input.execution);
    if (this.entries.has(key)) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "Already linked.");
    this.entries.set(key, { taskId, delegatedFrom: input.delegatedFrom, execution: input.execution, role: input.role, open: true, start: "starting",
      linkedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, ++this.linkCount)).toISOString(),
      recipientAddress: input.recipientAddress,
      ...(input.nodeId !== undefined ? { nodeId: input.nodeId } : {}), ...(input.members ? { members: input.members } : {}),
      ...(input.teamCoordinatorAgentRunId ? { teamCoordinatorAgentRunId: input.teamCoordinatorAgentRunId } : {}) });
    this.links.push(input);
    this.changed(taskId);
    return { taskId };
  }
  async markStarted(execution: TaskExecutionReference) {
    const entry = this.entry(execution);
    if (entry?.start === "starting") { entry.start = "started"; entry.everStarted = true; this.changed(entry.taskId); }
  }
  async markFailed(execution: TaskExecutionReference) {
    const entry = this.entry(execution);
    if (entry?.start === "starting") { entry.start = "failed"; this.changed(entry.taskId); }
  }
  isOpen(execution: TaskExecutionReference): boolean { return this.entry(execution)?.open === true; }
  /** The first damaged Task's message, as the Task side gives it (CR-461-051). */
  unreadable(): string | null {
    const [first] = this.damaged;
    return first === undefined ? null : `Task run data could not be read (${first}). Fix or restore the file and restart the app; other features keep working.`;
  }
  taskIdsWithEntries(): readonly string[] {
    return [...new Set([...this.entries.values()].flatMap((entry) => [entry.taskId, ...entry.otherOpenTaskIds ?? []]))]
      .filter((taskId) => !this.damaged.has(taskId));
  }
  /** Each run's entry in the Task: its current one, or an earlier open Task it still holds (open). */
  entriesOf(taskId: string): readonly TaskRunEntry[] {
    if (this.damaged.has(taskId)) return [];
    return [...this.entries.values()].flatMap((entry): TaskRunEntry[] => {
      const current = entry.taskId === taskId;
      if (!current && !entry.otherOpenTaskIds?.includes(taskId)) return [];
      return [{ taskId, role: entry.role, delegatedFrom: entry.delegatedFrom, run: entry.execution, entryAgentRunId: entryAgentOf(entry),
        open: current ? entry.open : true, start: entry.start, linkedAt: entry.linkedAt,
        recipientAddress: entry.recipientAddress,
        ...(entry.nodeId !== undefined ? { nodeId: entry.nodeId } : {}), ...(entry.members ? { members: entry.members } : {}) }];
    });
  }
  async assertReopenable(input: TaskExecutionReopenInput): Promise<void> {
    const entry = this.entry(input.execution);
    if (!entry) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "The agent run belongs to no Task.");
    if (entry.role !== "assigned" || entry.delegatedFrom.delegatorAgentRunId !== input.requestedBy) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "Only the agent that assigned the Task can continue it.");
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
    this.changed(entry.taskId);
    return { taskId: entry.taskId, reopened };
  }
  async assertAssignable(input: Readonly<{ execution: TaskExecutionReference; requestedBy: string; taskId: string; ownDelegatorAgentRunId?: string }>): Promise<void> {
    this.assertResourceDataReadable();
    await this.resolveAssignment(input.taskId);
    const entry = this.entry(input.execution);
    // Every Task of the run was deleted: the delegator its own file names may give it a new Task (SR-072 F-24).
    if (!entry && input.ownDelegatorAgentRunId !== undefined) {
      if (input.ownDelegatorAgentRunId !== input.requestedBy) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "Only the agent that gave this task agent its most recent Task can give it a new one.");
      return;
    }
    if (!entry) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "This copy belongs to no Task.");
    if (entry.role !== "assigned") throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "This task agent works on part of another agent's Task, so you can't give it a Task.");
    if (entry.delegatedFrom.delegatorAgentRunId !== input.requestedBy) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "Only the agent that gave this task agent its most recent Task can give it a new one.");
    if (!entry.open && entry.taskId === input.taskId) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", `This task agent already has Task ${input.taskId}.`);
    if (entry.open && [entry.taskId, ...entry.otherOpenTaskIds ?? []].includes(input.taskId)) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "This task agent already works on this Task.");
    if (!entry.everStarted) throw rejection("TASK_REACTIVATION_UNAVAILABLE", "This copy never started, so it has no conversation to resume.");
  }
  async assignExistingTaskExecution(input: ExistingTaskExecutionAssignInput): Promise<void> {
    await this.beforeAssignCommit?.(input);
    await this.assertAssignable({ execution: input.execution, requestedBy: input.delegatedFrom.delegatorAgentRunId, taskId: input.taskId,
      ...(input.recipientAddress ? { ownDelegatorAgentRunId: input.delegatedFrom.delegatorAgentRunId } : {}) });
    if (!this.entry(input.execution) && input.recipientAddress) {
      // A run no Task names any more: a new entry repeating its own delegation and address (U11).
      this.entries.set(taskExecutionReferenceKey(input.execution), { taskId: input.taskId, delegatedFrom: input.delegatedFrom, execution: input.execution,
        role: "assigned", open: true, start: "starting", everStarted: true, recipientAddress: input.recipientAddress,
        linkedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, ++this.linkCount)).toISOString(),
        ...(input.teamCoordinatorAgentRunId ? { teamCoordinatorAgentRunId: input.teamCoordinatorAgentRunId } : {}) });
      this.changed(input.taskId);
      this.assignments.push(input);
      return;
    }
    const entry = this.entry(input.execution)!;
    const otherOpenTaskIds = entry.open ? [...entry.otherOpenTaskIds ?? [], entry.taskId] : [];
    const previousTaskId = entry.taskId;
    Object.assign(entry, { taskId: input.taskId, delegatedFrom: input.delegatedFrom, open: true, start: "starting" as const, otherOpenTaskIds });
    this.changed(previousTaskId);
    this.changed(input.taskId);
    this.assignments.push(input);
  }
  async openTaskReferencesOf(execution: TaskExecutionReference, exceptTaskId: string): Promise<string[]> {
    const entry = this.entry(execution);
    if (!entry?.open) return [];
    return [...entry.otherOpenTaskIds ?? [], entry.taskId].filter((id) => id !== exceptTaskId).map((id) => this.tasks.get(id)?.taskKey ?? id);
  }
  /** Every status-change notification, in order (the run side's `RunTaskRecords.statusChanged`, SR-053). */
  readonly statusChanges: Array<{ references: TaskExecutionReference[] }> = [];
  statusChanged(execution: TaskExecutionReference): void {
    this.statusChanges.push({ references: [execution] });
  }
  /** autobyteus-591 DN-3: the peer runs whose delegation state is owed to their node (the Task entries' mark). */
  readonly peerNoticesOwed = new Set<string>();
  async setPeerNoticeOwed(execution: TaskExecutionReference, owed: boolean): Promise<void> {
    const key = taskExecutionReferenceKey(execution);
    if (owed && this.entries.get(key)?.nodeId !== undefined) this.peerNoticesOwed.add(key); else if (!owed) this.peerNoticesOwed.delete(key);
  }
  owedPeerNotices(): Array<{ run: TaskExecutionReference; nodeId: string }> {
    return [...this.peerNoticesOwed].map((key) => this.entries.get(key)!).map((entry) => ({ run: entry.execution, nodeId: entry.nodeId! }));
  }
  assertResourceDataReadable(): void {
    if (this.damaged.size) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", "Task run data could not be read. Fix or restore the file and restart the app; other features keep working.");
  }
}

const entryAgentOf = (entry: Entry): string => "agentRunId" in entry.execution ? entry.execution.agentRunId : entry.teamCoordinatorAgentRunId!;

/** The agent run that receives a delegated copy's work (an Agent copy itself, or a Team copy's coordinator); throws on a failed delegation. */
export const ingressOfOutcome = (outcome: TaskDelegationOutcome): string => {
  if (!outcome.delegated) throw new Error(`Delegation failed: ${outcome.message}`);
  return outcome.delegatedRun.kind === "agent" ? outcome.delegatedRun.agentRunId : outcome.delegatedRun.teamCoordinatorAgentRunId;
};
