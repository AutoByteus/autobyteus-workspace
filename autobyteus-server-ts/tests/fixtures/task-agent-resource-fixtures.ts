import type { TaskAgentResourceLinkInput, TaskAgentResourceOwner, TaskAgentResourcePort, TaskAgentResourceReopenInput, TaskAgentResourceRole } from "../../src/agent-collaboration/execution/task/task-agent-resource-port.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";

const rejection = (code: string, message: string) => Object.assign(new Error(message), { code });
type Entry = { taskId: string; hostRoot: RootExecutionIdentity; agentRun: TaskExecutionReference; role: TaskAgentResourceRole; assignedBy?: string; open: boolean; start: "starting" | "started" | "failed" };

/**
 * Runtime-test double of the Task side's loaded agent run resources. It follows the reviewed
 * port semantics (link before resources, inherited links only from open creators, closed until the
 * assigner reactivates an assignment of a not-DONE Task, damaged data fails closed); the Projects
 * implementation is tested separately.
 */
export class InMemoryTaskAgentResources implements TaskAgentResourcePort {
  readonly entries = new Map<string, Entry>();
  readonly tasks = new Map<string, { description: string; referenceFiles: string[]; done: boolean; adHoc?: true }>();
  readonly damaged = new Set<string>();
  readonly links: TaskAgentResourceLinkInput[] = [];
  /** Test hook awaited inside `linkAgentRun` before the write commits. */
  beforeLinkCommit?: (input: TaskAgentResourceLinkInput) => Promise<void> | void;
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
  readonly reopenRequests: TaskAgentResourceReopenInput[] = [];
  closedAgentRuns(taskId: string): TaskExecutionReference[] {
    return [...this.entries.values()].filter(e => e.taskId === taskId && !e.open).map(e => e.agentRun);
  }
  entry(agentRun: TaskExecutionReference): Entry | undefined { return this.entries.get(taskExecutionReferenceKey(agentRun)); }

  async resolveAssignment(taskId: string) {
    if (this.damaged.has(taskId)) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", `Task run data could not be read (${taskId}). Fix or restore the file and restart the app; other features keep working.`);
    const task = this.tasks.get(taskId);
    if (!task) throw Object.assign(new Error(`Task '${taskId}' was not found.`), { code: "TASK_NOT_FOUND" });
    if (task.done) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "Task is DONE; reopen it before assigning new work.");
    if (task.adHoc) throw Object.assign(new Error(`Task '${taskId}' was not found.`), { code: "TASK_NOT_FOUND" });
    return { description: task.description, referenceFiles: task.referenceFiles };
  }
  async linkAgentRun(input: TaskAgentResourceLinkInput) {
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
    const key = taskExecutionReferenceKey(input.agentRun);
    if (this.entries.has(key)) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "Already linked.");
    this.entries.set(key, { taskId, hostRoot: input.hostRoot, agentRun: input.agentRun, role: input.role,
      ...(input.role === "assigned" ? { assignedBy: input.assignedBy } : {}), open: true, start: "starting" });
    this.links.push(input);
    return { taskId };
  }
  async markStarted(agentRun: TaskExecutionReference) {
    const entry = this.entry(agentRun);
    if (entry?.start === "starting") entry.start = "started";
  }
  async markFailed(agentRun: TaskExecutionReference) {
    const entry = this.entry(agentRun);
    if (entry?.start === "starting") entry.start = "failed";
  }
  ownerOf(chain: readonly TaskExecutionReference[]): TaskAgentResourceOwner | null {
    const known = chain.flatMap(agentRun => { const e = this.entry(agentRun); return e ? [e] : []; });
    if (!known.length) {
      if (this.damaged.size) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", "Task run data could not be read.");
      return null;
    }
    if (known.some(e => e.taskId !== known[0]!.taskId)) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "Containment crosses Tasks.");
    return { taskId: known[0]!.taskId, agentRun: known[0]!.agentRun, open: known[0]!.open };
  }
  isOpen(agentRun: TaskExecutionReference): boolean { return this.entry(agentRun)?.open === true; }
  openAgentRuns(taskId: string, role: TaskAgentResourceRole): TaskExecutionReference[] {
    return [...this.entries.values()].filter(e => e.taskId === taskId && e.role === role && e.open).map(e => e.agentRun);
  }
  closedAgentRunsIn(hostRoot: RootExecutionIdentity): TaskExecutionReference[] {
    return [...this.entries.values()].filter(e => !e.open && !this.damaged.has(e.taskId)
      && rootExecutionIdentityKey(e.hostRoot) === rootExecutionIdentityKey(hostRoot)).map(e => e.agentRun);
  }
  async assertReopenable(input: TaskAgentResourceReopenInput): Promise<void> {
    const entry = this.entry(input.agentRun);
    if (!entry) throw rejection("TASK_AGENT_RESOURCE_CONFLICT", "The agent run belongs to no Task.");
    if (entry.role !== "assigned" || entry.assignedBy !== input.requestedBy) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "Only the run that assigned it can reactivate it.");
    if (entry.start !== "started") throw rejection("TASK_REACTIVATION_UNAVAILABLE", "This assignment never started.");
    const task = this.tasks.get(entry.taskId);
    if (!task) throw rejection("TASK_NOT_FOUND", "The Task was deleted; its work cannot be reactivated.");
    if (task.done) throw rejection("TASK_AGENT_RESOURCE_CLOSED", "This Task is DONE. Move it to TODO or IN_PROGRESS with create_or_update_task first, then message this run ID again.");
  }
  async reopenAssignment(input: TaskAgentResourceReopenInput) {
    this.reopenRequests.push(input);
    await this.assertReopenable(input);
    const entry = this.entry(input.agentRun)!;
    const reopened = !entry.open;
    entry.open = true;
    return { taskId: entry.taskId, reopened };
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
