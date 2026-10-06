import type { TaskAgentResourceLinkInput, TaskAgentResourceOwner, TaskAgentResourcePort, TaskAgentResourceRole } from "../../src/agent-collaboration/execution/task/task-agent-resource-port.js";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../src/agent-collaboration/execution/task/task-execution-reference.js";

const rejection = (code: string, message: string) => Object.assign(new Error(message), { code });
type Entry = { taskId: string; hostRoot: RootExecutionIdentity; agentRun: TaskExecutionReference; role: TaskAgentResourceRole; open: boolean; start: "starting" | "started" | "failed" };

/**
 * Runtime-test double of the Task side's loaded agent run resources. It follows the reviewed
 * port semantics (link before resources, inherited links only from open creators, closed forever,
 * damaged data fails closed); the Projects implementation is tested separately.
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
    this.entries.set(key, { taskId, hostRoot: input.hostRoot, agentRun: input.agentRun, role: input.role, open: true, start: "starting" });
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
  assertResourceDataReadable(): void {
    if (this.damaged.size) throw rejection("TASK_AGENT_RESOURCES_UNAVAILABLE", "Task run data could not be read. Fix or restore the file and restart the app; other features keep working.");
  }
}
