import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { NewTaskExecutionLinkInput, TaskExecutionOwner, TaskExecutionRole } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { ProjectError } from "../domain/project-errors.js";
import {
  assertTaskExecutionReopenable, closeTaskExecutionResources, currentAssignments, linkNewTaskExecution,
  reopenTaskExecution, settleTaskExecutionStart, type TaskExecutionResource, type TaskExecutionResourceFile, type TaskAssignment,
} from "../domain/task-execution-resources.js";
import type { TaskLocation } from "../domain/models.js";
import { TaskExecutionResourceStore } from "../stores/task-execution-resource-store.js";
import { latestAssignedEntry } from "./task-root-view-builder.js";

type Loaded = { location: TaskLocation; file: TaskExecutionResourceFile };
export type TaskExecutionGroup = Readonly<{ hostRoot: RootExecutionIdentity; executions: readonly TaskExecutionReference[] }>;

/**
 * The sole authority over every Task's `agent_run_resources.json` and the process in-memory view of
 * them (agent run → Task, per-Task entries, and the damaged set). Write preconditions are evaluated
 * on the content read under the file's lock; the view is swapped only by the committing write.
 */
export class TaskExecutionResourceService {
  private readonly files = new Map<string, Loaded>();
  private readonly owners = new Map<string, string>();
  /** Closed agent runs per host root key (then by agent run key); derived only in `swap()`, like `owners`. */
  private readonly closedRunsByHostRootKey = new Map<string, Map<string, TaskExecutionReference>>();
  private readonly damaged = new Map<string, string>();
  private readonly chains = new Map<string, Promise<unknown>>();
  private loading: Promise<void> | null = null;
  private loaded = false;

  /** Told after each committed write's view swap (never during `load()`): the Task's root may have changed. Must not throw. */
  private onCommitted: (location: TaskLocation) => void = () => undefined;
  constructor(private readonly store = new TaskExecutionResourceStore(), private readonly now: () => Date = () => new Date()) {}

  /** Bound once by the composition (the change publisher's mark). */
  setCommitListener(listener: (location: TaskLocation) => void): void { this.onCommitted = listener; }

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

  /** In-process ordering of assignment linking and DONE or CANCELLED closure for one Task. */
  serialize<T>(taskId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(taskId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    const settled = next.then(() => undefined, () => undefined);
    this.chains.set(taskId, settled);
    void settled.then(() => { if (this.chains.get(taskId) === settled) this.chains.delete(taskId); });
    return next;
  }

  async linkAssigned(location: TaskLocation, link: Extract<NewTaskExecutionLinkInput, { role: "assigned" }>): Promise<void> {
    await this.load();
    this.assertTaskReadable(location.taskId);
    await this.link(location, link);
  }
  /** Joins the creator's Task; the creator's openness is decided under that Task file's lock. */
  async linkInherited(link: Extract<NewTaskExecutionLinkInput, { role: "delegated" | "broughtIn" }>): Promise<string> {
    await this.load();
    const taskId = this.owners.get(taskExecutionReferenceKey(link.creator));
    if (!taskId) throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The creating agent run is not open Task work.");
    await this.link(this.files.get(taskId)!.location, link);
    return taskId;
  }
  async markStarted(execution: TaskExecutionReference): Promise<void> {
    await this.settle(execution, { start: "started" });
  }
  async markFailed(execution: TaskExecutionReference, error: { code: string; message: string }): Promise<void> {
    await this.settle(execution, { start: "failed", error });
  }

  /** DONE or CANCELLED: closes every open entry first (under the Task's serialization), then runs `afterClose`. */
  async closeTask(location: TaskLocation, afterClose: () => Promise<void>): Promise<void> {
    await this.load();
    await this.serialize(location.taskId, async () => {
      this.assertTaskReadable(location.taskId);
      // No file and no view entry: no agent run was ever linked, and none can be in flight (assignments are serialized).
      if (this.files.has(location.taskId) || await this.store.exists(location)) {
        await this.store.update(location, file => closeTaskExecutionResources(file, this.now().toISOString()), next => this.commit(location, next));
      }
      await afterClose();
    });
  }

  /** The Task location of an agent run, from the view; `null` when the run belongs to no Task. */
  locationOf(execution: TaskExecutionReference): TaskLocation | null {
    this.assertLoaded();
    const taskId = this.owners.get(taskExecutionReferenceKey(execution));
    return taskId ? this.files.get(taskId)!.location : null;
  }
  /** Read-only reactivation preconditions against the view (advisory; `reopenAssignment` re-checks under the lock). */
  assertReopenable(location: TaskLocation, execution: TaskExecutionReference, requestedBy: string): void {
    this.assertTaskReadable(location.taskId);
    assertTaskExecutionReopenable(this.files.get(location.taskId)!.file, execution, requestedBy);
  }
  /**
   * Reactivation of one assigned entry (call under the Task's `serialize`): `closedAt` returns to
   * `null` on that entry only. `false` when it was already open (nothing is written).
   */
  async reopenAssignment(location: TaskLocation, execution: TaskExecutionReference, requestedBy: string): Promise<boolean> {
    this.assertReopenable(location, execution, requestedBy);
    if (this.isOpen(execution)) return false;
    let reopened = false;
    await this.store.update(location, (file) => {
      const next = reopenTaskExecution(file, execution, requestedBy);
      reopened = next !== file;
      return next;
    }, next => this.commit(location, next));
    return reopened;
  }

  /** Every closed agent run of the Task, grouped by host root (a repeated DONE or CANCELLED re-requests all of them). */
  closedByHostRoot(taskId: string): TaskExecutionGroup[] {
    const groups = new Map<string, { hostRoot: RootExecutionIdentity; executions: TaskExecutionReference[] }>();
    for (const entry of this.files.get(taskId)?.file.executionResources ?? []) {
      if (entry.closedAt === null) continue;
      const key = rootExecutionIdentityKey(entry.hostRoot);
      const group = groups.get(key) ?? { hostRoot: entry.hostRoot, executions: [] };
      group.executions.push(entry.execution);
      groups.set(key, group);
    }
    return [...groups.values()];
  }
  /** Closed agent runs hosted by the root, from the per-root index (damaged Tasks never reach `swap()`). Never throws. */
  closedTaskExecutionsIn(hostRoot: RootExecutionIdentity): TaskExecutionReference[] {
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
        && file.executionResources.some(entry => rootExecutionIdentityKey(entry.hostRoot) === rootKey))
      .map(({ location }) => location.taskId);
  }
  /** The Task's root: its latest `assigned` entry, from the view; null when never assigned or unreadable. */
  latestAssignment(taskId: string): TaskExecutionResource | null {
    if (!this.loaded || this.damaged.has(taskId)) return null;
    return latestAssignedEntry(this.files.get(taskId)?.file ?? null);
  }
  /** The Task whose root is exactly this agent run (its latest `assigned` entry); null otherwise. Never throws. */
  rootTaskLocationOf(execution: TaskExecutionReference): TaskLocation | null {
    const taskId = this.owners.get(taskExecutionReferenceKey(execution));
    const loaded = taskId ? this.files.get(taskId) : undefined;
    const root = latestAssignedEntry(loaded?.file ?? null);
    return loaded && root && taskExecutionReferenceKey(root.execution) === taskExecutionReferenceKey(execution) ? loaded.location : null;
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

  ownerOf(chain: readonly TaskExecutionReference[]): TaskExecutionOwner | null {
    this.assertLoaded();
    const known = chain.flatMap(execution => {
      const taskId = this.owners.get(taskExecutionReferenceKey(execution));
      return taskId ? [{ taskId, execution }] : [];
    });
    if (!known.length) {
      this.assertAllReadable();
      return null;
    }
    if (known.some(entry => entry.taskId !== known[0]!.taskId)) {
      throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "Agent run containment crosses Tasks.");
    }
    return { ...known[0]!, open: this.isOpen(known[0]!.execution) };
  }
  isOpen(execution: TaskExecutionReference): boolean {
    this.assertLoaded();
    return this.entryOf(execution)?.closedAt === null;
  }
  openTaskExecutions(taskId: string, role: TaskExecutionRole): TaskExecutionReference[] {
    this.assertLoaded();
    return (this.files.get(taskId)?.file.executionResources ?? []).filter(e => e.role === role && e.closedAt === null).map(e => e.execution);
  }
  assertTaskReadable(taskId: string): void {
    const message = this.damaged.get(taskId);
    if (message) throw new ProjectError("TASK_AGENT_RESOURCES_UNAVAILABLE", message);
  }
  assertAllReadable(): void {
    const first = this.damaged.values().next();
    if (!first.done) throw new ProjectError("TASK_AGENT_RESOURCES_UNAVAILABLE", first.value);
  }

  private async link(location: TaskLocation, link: NewTaskExecutionLinkInput): Promise<void> {
    const owner = this.owners.get(taskExecutionReferenceKey(link.execution));
    if (owner) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run already belongs to a Task.");
    await this.store.update(location, file => linkNewTaskExecution(file, link, this.now().toISOString()), next => this.commit(location, next));
  }
  private async settle(execution: TaskExecutionReference, outcome: Parameters<typeof settleTaskExecutionStart>[2]): Promise<void> {
    await this.load();
    const taskId = this.owners.get(taskExecutionReferenceKey(execution));
    if (!taskId) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to a Task.");
    const { location } = this.files.get(taskId)!;
    await this.store.update(location, file => settleTaskExecutionStart(file, execution, outcome), next => this.commit(location, next));
  }
  private entryOf(execution: TaskExecutionReference) {
    const taskId = this.owners.get(taskExecutionReferenceKey(execution));
    return taskId ? this.files.get(taskId)?.file.executionResources.find(e => taskExecutionReferenceKey(e.execution) === taskExecutionReferenceKey(execution)) : undefined;
  }
  /** A committed write: swap the view, then tell the listener (marks only; it never fails the write). */
  private commit(location: TaskLocation, file: TaskExecutionResourceFile): void {
    this.swap(location, file);
    try { this.onCommitted(location); } catch (error) { console.warn("TASK_AGENT_RESOURCE_COMMIT_LISTENER_FAILED", error); }
  }
  /** View swap for one committed Task file: synchronous, never before commit. */
  private swap(location: TaskLocation, file: TaskExecutionResourceFile): void {
    this.unindex(location.taskId);
    for (const entry of file.executionResources) {
      const key = taskExecutionReferenceKey(entry.execution);
      const other = this.owners.get(key);
      if (other && other !== location.taskId) console.error("TASK_AGENT_RESOURCE_CONFLICT", { execution: entry.execution, tasks: [other, location.taskId] });
      this.owners.set(key, location.taskId);
      if (entry.closedAt !== null) {
        const rootKey = rootExecutionIdentityKey(entry.hostRoot);
        const closed = this.closedRunsByHostRootKey.get(rootKey) ?? new Map<string, TaskExecutionReference>();
        closed.set(key, entry.execution);
        this.closedRunsByHostRootKey.set(rootKey, closed);
      }
    }
    this.files.set(location.taskId, { location, file });
  }
  /** Removes the Task's current file content from the derived indexes (owners, closed runs per host root). */
  private unindex(taskId: string): void {
    for (const entry of this.files.get(taskId)?.file.executionResources ?? []) {
      this.owners.delete(taskExecutionReferenceKey(entry.execution));
      if (entry.closedAt !== null) this.forgetClosed(entry.hostRoot, entry.execution);
    }
  }
  private forgetClosed(hostRoot: RootExecutionIdentity, execution: TaskExecutionReference): void {
    const rootKey = rootExecutionIdentityKey(hostRoot);
    const closed = this.closedRunsByHostRootKey.get(rootKey);
    closed?.delete(taskExecutionReferenceKey(execution));
    if (closed?.size === 0) this.closedRunsByHostRootKey.delete(rootKey);
  }
  private assertLoaded(): void {
    if (!this.loaded) throw new Error("Task agent run resources are not loaded.");
  }
}
