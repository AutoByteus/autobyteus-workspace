import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { TaskAgentResourceLinkInput, TaskAgentResourceOwner, TaskAgentResourceRole } from "../../agent-collaboration/execution/task/task-agent-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { ProjectError } from "../domain/project-errors.js";
import {
  agentRunKey, closeTaskAgentResources, currentAssignments, linkTaskAgentResource, settleTaskAgentResourceStart,
  type TaskAgentResourceFile, type TaskAssignment,
} from "../domain/task-agent-resources.js";
import type { TaskLocation } from "../domain/models.js";
import { TaskAgentResourceStore } from "../stores/task-agent-resource-store.js";

type Loaded = { location: TaskLocation; file: TaskAgentResourceFile };
export type TaskAgentResourceGroup = Readonly<{ hostRoot: RootExecutionIdentity; agentRuns: readonly TaskExecutionReference[] }>;

/**
 * The sole authority over every Task's `agent_run_resources.json` and the process in-memory view of
 * them (agent run → Task, per-Task entries, and the damaged set). Write preconditions are evaluated
 * on the content read under the file's lock; the view is swapped only by the committing write.
 */
export class TaskAgentResourceService {
  private readonly files = new Map<string, Loaded>();
  private readonly owners = new Map<string, string>();
  /** Closed agent runs per host root key (then by agent run key); derived only in `swap()`, like `owners`. */
  private readonly closedRunsByHostRootKey = new Map<string, Map<string, TaskExecutionReference>>();
  private readonly damaged = new Map<string, string>();
  private readonly chains = new Map<string, Promise<unknown>>();
  private loading: Promise<void> | null = null;
  private loaded = false;

  constructor(private readonly store = new TaskAgentResourceStore(), private readonly now: () => Date = () => new Date()) {}

  /** Reads every file once; an unreadable or invalid file only marks its Task damaged (non-fatal). */
  load(): Promise<void> {
    this.loading ??= (async () => {
      for (const location of await this.store.list()) {
        try { this.swap(location, await this.store.read(location)); }
        catch (error) {
          const message = `Agent run resource data could not be read (${this.store.filePath(location)}: ${error instanceof Error ? error.message : String(error)}). Fix or restore the file and restart the app; other features keep working.`;
          this.damaged.set(location.taskId, message);
          console.error("TASK_AGENT_RESOURCES_UNAVAILABLE", { taskId: location.taskId, file: this.store.filePath(location), message });
        }
      }
      this.loaded = true;
    })();
    return this.loading;
  }

  /** In-process ordering of assignment linking and DONE closure for one Task. */
  serialize<T>(taskId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(taskId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    const settled = next.then(() => undefined, () => undefined);
    this.chains.set(taskId, settled);
    void settled.then(() => { if (this.chains.get(taskId) === settled) this.chains.delete(taskId); });
    return next;
  }

  async linkAssigned(location: TaskLocation, link: Extract<TaskAgentResourceLinkInput, { role: "assigned" }>): Promise<void> {
    await this.load();
    this.assertTaskReadable(location.taskId);
    await this.link(location, link);
  }
  /** Joins the creator's Task; the creator's openness is decided under that Task file's lock. */
  async linkInherited(link: Extract<TaskAgentResourceLinkInput, { role: "delegated" | "broughtIn" }>): Promise<string> {
    await this.load();
    const taskId = this.owners.get(agentRunKey(link.creator));
    if (!taskId) throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The creating agent run is not open Task work.");
    await this.link(this.files.get(taskId)!.location, link);
    return taskId;
  }
  async markStarted(agentRun: TaskExecutionReference): Promise<void> {
    await this.settle(agentRun, { start: "started" });
  }
  async markFailed(agentRun: TaskExecutionReference, error: { code: string; message: string }): Promise<void> {
    await this.settle(agentRun, { start: "failed", error });
  }

  /** DONE: closes every open entry first (under the Task's serialization), then runs `afterClose`. */
  async closeTask(location: TaskLocation, afterClose: () => Promise<void>): Promise<void> {
    await this.load();
    await this.serialize(location.taskId, async () => {
      this.assertTaskReadable(location.taskId);
      // No file and no view entry: no agent run was ever linked, and none can be in flight (assignments are serialized).
      if (this.files.has(location.taskId) || await this.store.exists(location)) {
        await this.store.update(location, file => closeTaskAgentResources(file, this.now().toISOString()), next => this.swap(location, next));
      }
      await afterClose();
    });
  }

  /** Every closed agent run of the Task, grouped by host root (repeated DONE re-requests all of them). */
  closedByHostRoot(taskId: string): TaskAgentResourceGroup[] {
    const groups = new Map<string, { hostRoot: RootExecutionIdentity; agentRuns: TaskExecutionReference[] }>();
    for (const entry of this.files.get(taskId)?.file.agentRunResources ?? []) {
      if (entry.closedAt === null) continue;
      const key = rootExecutionIdentityKey(entry.hostRoot);
      const group = groups.get(key) ?? { hostRoot: entry.hostRoot, agentRuns: [] };
      group.agentRuns.push(entry.agentRun);
      groups.set(key, group);
    }
    return [...groups.values()];
  }
  /** Closed agent runs hosted by the root, from the per-root index (damaged Tasks never reach `swap()`). Never throws. */
  closedAgentRunsIn(hostRoot: RootExecutionIdentity): TaskExecutionReference[] {
    return [...this.closedRunsByHostRootKey.get(rootExecutionIdentityKey(hostRoot))?.values() ?? []];
  }
  /**
   * Ad-hoc Tasks (no Project) with an agent run hosted by the root, from the view. Every entry of an
   * ad-hoc Task has its delegator's host root (only described delegation creates and assigns to one).
   */
  adHocTaskIdsHostedBy(hostRoot: RootExecutionIdentity): string[] {
    const rootKey = rootExecutionIdentityKey(hostRoot);
    return [...this.files.values()]
      .filter(({ location, file }) => location.projectId === null
        && file.agentRunResources.some(entry => rootExecutionIdentityKey(entry.hostRoot) === rootKey))
      .map(({ location }) => location.taskId);
  }
  /** Drops a Task whose files were removed from the view (owners and closed runs included). Call under `serialize`. */
  forget(location: TaskLocation): void {
    this.unindex(location.taskId);
    this.files.delete(location.taskId);
  }
  async currentAssignments(taskId: string): Promise<TaskAssignment[] | "unavailable"> {
    await this.load();
    if (this.damaged.has(taskId)) return "unavailable";
    const loaded = this.files.get(taskId);
    return loaded ? currentAssignments(loaded.file) : [];
  }

  ownerOf(chain: readonly TaskExecutionReference[]): TaskAgentResourceOwner | null {
    this.assertLoaded();
    const known = chain.flatMap(agentRun => {
      const taskId = this.owners.get(agentRunKey(agentRun));
      return taskId ? [{ taskId, agentRun }] : [];
    });
    if (!known.length) {
      this.assertAllReadable();
      return null;
    }
    if (known.some(entry => entry.taskId !== known[0]!.taskId)) {
      throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "Agent run containment crosses Tasks.");
    }
    return { ...known[0]!, open: this.isOpen(known[0]!.agentRun) };
  }
  isOpen(agentRun: TaskExecutionReference): boolean {
    this.assertLoaded();
    return this.entryOf(agentRun)?.closedAt === null;
  }
  openAgentRuns(taskId: string, role: TaskAgentResourceRole): TaskExecutionReference[] {
    this.assertLoaded();
    return (this.files.get(taskId)?.file.agentRunResources ?? []).filter(e => e.role === role && e.closedAt === null).map(e => e.agentRun);
  }
  assertTaskReadable(taskId: string): void {
    const message = this.damaged.get(taskId);
    if (message) throw new ProjectError("TASK_AGENT_RESOURCES_UNAVAILABLE", message);
  }
  assertAllReadable(): void {
    const first = this.damaged.values().next();
    if (!first.done) throw new ProjectError("TASK_AGENT_RESOURCES_UNAVAILABLE", first.value);
  }

  private async link(location: TaskLocation, link: TaskAgentResourceLinkInput): Promise<void> {
    const owner = this.owners.get(agentRunKey(link.agentRun));
    if (owner) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run already belongs to a Task.");
    await this.store.update(location, file => linkTaskAgentResource(file, link, this.now().toISOString()), next => this.swap(location, next));
  }
  private async settle(agentRun: TaskExecutionReference, outcome: Parameters<typeof settleTaskAgentResourceStart>[2]): Promise<void> {
    await this.load();
    const taskId = this.owners.get(agentRunKey(agentRun));
    if (!taskId) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to a Task.");
    const { location } = this.files.get(taskId)!;
    await this.store.update(location, file => settleTaskAgentResourceStart(file, agentRun, outcome), next => this.swap(location, next));
  }
  private entryOf(agentRun: TaskExecutionReference) {
    const taskId = this.owners.get(agentRunKey(agentRun));
    return taskId ? this.files.get(taskId)?.file.agentRunResources.find(e => agentRunKey(e.agentRun) === agentRunKey(agentRun)) : undefined;
  }
  /** View swap for one committed Task file: synchronous, never before commit. */
  private swap(location: TaskLocation, file: TaskAgentResourceFile): void {
    this.unindex(location.taskId);
    for (const entry of file.agentRunResources) {
      const key = agentRunKey(entry.agentRun);
      const other = this.owners.get(key);
      if (other && other !== location.taskId) console.error("TASK_AGENT_RESOURCE_CONFLICT", { agentRun: entry.agentRun, tasks: [other, location.taskId] });
      this.owners.set(key, location.taskId);
      if (entry.closedAt !== null) {
        const rootKey = rootExecutionIdentityKey(entry.hostRoot);
        const closed = this.closedRunsByHostRootKey.get(rootKey) ?? new Map<string, TaskExecutionReference>();
        closed.set(key, entry.agentRun);
        this.closedRunsByHostRootKey.set(rootKey, closed);
      }
    }
    this.files.set(location.taskId, { location, file });
  }
  /** Removes the Task's current file content from the derived indexes (owners, closed runs per host root). */
  private unindex(taskId: string): void {
    for (const entry of this.files.get(taskId)?.file.agentRunResources ?? []) {
      this.owners.delete(agentRunKey(entry.agentRun));
      if (entry.closedAt !== null) this.forgetClosed(entry.hostRoot, entry.agentRun);
    }
  }
  private forgetClosed(hostRoot: RootExecutionIdentity, agentRun: TaskExecutionReference): void {
    const rootKey = rootExecutionIdentityKey(hostRoot);
    const closed = this.closedRunsByHostRootKey.get(rootKey);
    closed?.delete(agentRunKey(agentRun));
    if (closed?.size === 0) this.closedRunsByHostRootKey.delete(rootKey);
  }
  private assertLoaded(): void {
    if (!this.loaded) throw new Error("Task agent run resources are not loaded.");
  }
}
