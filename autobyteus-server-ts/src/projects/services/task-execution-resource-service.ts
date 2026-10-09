import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type {
  ExistingTaskExecutionAssignInput, NewTaskExecutionLinkInput, TaskExecutionOwner, TaskExecutionRole,
} from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import { taskExecutionReferenceKey, type TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { ProjectError } from "../domain/project-errors.js";
import {
  assertTaskExecutionReopenable, closedAssignments, closeTaskExecutionResources, latestEntryOf, linkExistingTaskExecution, linkNewTaskExecution,
  openAssignments, reopenTaskExecution, settleTaskExecutionStart, type TaskAssignmentView, type TaskExecutionHistory, type TaskExecutionResource,
  type TaskExecutionResourceFile,
} from "../domain/task-execution-resources.js";
import type { TaskLocation } from "../domain/models.js";
import { TaskExecutionResourceStore } from "../stores/task-execution-resource-store.js";
import { latestAssignedEntry } from "./task-root-view-builder.js";

type Loaded = { location: TaskLocation; file: TaskExecutionResourceFile };
type Current = Readonly<{ taskId: string; entry: TaskExecutionResource }>;
export type TaskExecutionGroup = Readonly<{ hostRoot: RootExecutionIdentity; executions: readonly TaskExecutionReference[] }>;
export type TaskAssignmentViews = Readonly<{ open: TaskAssignmentView[]; closed: TaskAssignmentView[] }>;

/**
 * The sole authority over every Task's `agent_run_resources.json` and the process in-memory view of
 * them (per-Task entries, each copy's entries across Tasks, and the damaged set). It alone owns the
 * current-entry rule: a copy's current entry is its open entry, else its latest linked entry; every
 * ownership, closure and visibility answer reads it. Write preconditions are evaluated on the content
 * read under the file's lock; the view is swapped only by the committing write.
 */
export class TaskExecutionResourceService {
  private readonly files = new Map<string, Loaded>();
  /** Per copy (task execution key): its last entry in each Task file that has one. Derived only in `swap()`/`forget()`. */
  private readonly entriesByExecution = new Map<string, Map<string, TaskExecutionResource>>();
  /** Per copy: its current entry and that Task. */
  private readonly currentByExecution = new Map<string, Current>();
  /** Copies whose current entry is closed, per host root key (then by copy key). */
  private readonly closedByHostRootKey = new Map<string, Map<string, TaskExecutionReference>>();
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

  /** In-process ordering per key: a Task ID (linking, closure) or a copy's key (see `serializeCopyInTask`). */
  serialize<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.chains.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);
    const settled = next.then(() => undefined, () => undefined);
    this.chains.set(key, settled);
    void settled.then(() => { if (this.chains.get(key) === settled) this.chains.delete(key); });
    return next;
  }
  /**
   * Ordering of a change to one copy in one Task (existing-copy assignment, reopen): always the copy's
   * key first, then the Task ID. Closure takes only the Task ID, so no cycle exists. Copy keys
   * (`agent:…`, `team:…`) never equal a Task ID.
   */
  serializeCopyInTask<T>(execution: TaskExecutionReference, taskId: () => string, operation: (taskId: string) => Promise<T>): Promise<T> {
    return this.serialize(taskExecutionReferenceKey(execution), () => {
      const resolved = taskId();
      return this.serialize(resolved, () => operation(resolved));
    });
  }

  async linkAssigned(location: TaskLocation, link: Extract<NewTaskExecutionLinkInput, { role: "assigned" }>): Promise<void> {
    await this.load();
    this.assertTaskReadable(location.taskId);
    await this.link(location, link);
  }
  /** Joins the creator's current Task; the creator's openness is decided under that Task file's lock. */
  async linkInherited(link: Extract<NewTaskExecutionLinkInput, { role: "delegated" | "broughtIn" }>): Promise<string> {
    await this.load();
    const taskId = this.currentOf(link.creator)?.taskId;
    if (!taskId) throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The creating agent run is not open Task work.");
    await this.link(this.files.get(taskId)!.location, link);
    return taskId;
  }
  /**
   * Existing-copy assignment commit (call under `serializeCopyInTask`): appends the copy's new
   * `starting` entry to the Task file. The address is the one of the copy's previous assignment.
   */
  async assignExisting(location: TaskLocation, input: ExistingTaskExecutionAssignInput): Promise<void> {
    const recipientAddress = this.currentOf(input.execution)?.entry.recipientAddress;
    await this.store.update(location, file => linkExistingTaskExecution(file, {
      assignedBy: input.assignedBy, hostRoot: input.hostRoot, execution: input.execution,
      ...(input.teamCoordinatorAgentRunId ? { teamCoordinatorAgentRunId: input.teamCoordinatorAgentRunId } : {}),
      ...(recipientAddress ? { recipientAddress } : {}),
    }, this.now().toISOString()), next => this.commit(location, next));
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

  /** The location of the copy's current Task, from the view; `null` when the copy belongs to no Task. */
  locationOf(execution: TaskExecutionReference): TaskLocation | null {
    this.assertLoaded();
    const current = this.currentOf(execution);
    return current ? this.files.get(current.taskId)!.location : null;
  }
  locationOfTask(taskId: string): TaskLocation | null { return this.files.get(taskId)?.location ?? null; }
  /** The copy's current entry and Task, and whether any of its entries ever started; `null` when it has none. */
  historyOf(execution: TaskExecutionReference): TaskExecutionHistory | null {
    this.assertLoaded();
    const current = this.currentOf(execution);
    if (!current) return null;
    const key = taskExecutionReferenceKey(execution);
    const everStarted = [...this.entriesByExecution.get(key)!.keys()].some(taskId => this.files.get(taskId)!.file.executionResources
      .some(entry => entry.start === "started" && taskExecutionReferenceKey(entry.execution) === key));
    return { currentTaskId: current.taskId, current: current.entry, everStarted };
  }
  /** The other Tasks this copy has entries in (its earlier assignment periods), from the view. */
  earlierTaskLocationsOf(execution: TaskExecutionReference): TaskLocation[] {
    const current = this.currentOf(execution)?.taskId;
    return [...this.entriesByExecution.get(taskExecutionReferenceKey(execution))?.keys() ?? []]
      .filter(taskId => taskId !== current).map(taskId => this.files.get(taskId)!.location);
  }
  /** Read-only reactivation preconditions on the copy's last entry in the Task (advisory; `reopenAssignment` re-checks under the lock). */
  assertReopenable(location: TaskLocation, execution: TaskExecutionReference, requestedBy: string): void {
    this.assertTaskReadable(location.taskId);
    assertTaskExecutionReopenable(this.files.get(location.taskId)!.file, execution, requestedBy);
  }
  /**
   * Reactivation of the copy's last entry in its current Task (call under `serializeCopyInTask`):
   * `closedAt` returns to `null` on that entry only. `false` when it was already open (nothing is written).
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

  /**
   * The Task's closed entries that are still their copy's current entry, grouped by host root, one per
   * copy (a repeated DONE or CANCELLED re-requests them). A copy that moved to another Task is never included.
   */
  releasableByHostRoot(taskId: string): TaskExecutionGroup[] {
    const groups = new Map<string, { hostRoot: RootExecutionIdentity; executions: Map<string, TaskExecutionReference> }>();
    for (const entry of this.files.get(taskId)?.file.executionResources ?? []) {
      const key = taskExecutionReferenceKey(entry.execution);
      const current = this.currentByExecution.get(key);
      if (current?.taskId !== taskId || current.entry.closedAt === null) continue;
      const rootKey = rootExecutionIdentityKey(current.entry.hostRoot);
      const group = groups.get(rootKey) ?? { hostRoot: current.entry.hostRoot, executions: new Map() };
      group.executions.set(key, current.entry.execution);
      groups.set(rootKey, group);
    }
    return [...groups.values()].map(({ hostRoot, executions }) => ({ hostRoot, executions: [...executions.values()] }));
  }
  /** Copies hosted by the root whose current entry is closed, from the per-root index (damaged Tasks never reach `swap()`). Never throws. */
  closedTaskExecutionsIn(hostRoot: RootExecutionIdentity): TaskExecutionReference[] {
    return [...this.closedByHostRootKey.get(rootExecutionIdentityKey(hostRoot))?.values() ?? []];
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
  /** The copy's current Task when its root is exactly this copy (its latest `assigned` entry); null otherwise. Never throws. */
  rootTaskLocationOf(execution: TaskExecutionReference): TaskLocation | null {
    const current = this.currentOf(execution);
    const loaded = current ? this.files.get(current.taskId) : undefined;
    const root = latestAssignedEntry(loaded?.file ?? null);
    return loaded && root && taskExecutionReferenceKey(root.execution) === taskExecutionReferenceKey(execution) ? loaded.location : null;
  }
  /** Drops a Task whose files were removed from the view (indexes included). Call under `serialize`. */
  forget(location: TaskLocation): void {
    const affected = this.unindex(location.taskId);
    this.files.delete(location.taskId);
    affected.forEach(key => this.deriveCurrent(key));
  }
  /** The Task's open and closed assignment views; `unavailable` when its data can't be read. */
  async assignments(taskId: string): Promise<TaskAssignmentViews | "unavailable"> {
    await this.load();
    if (this.damaged.has(taskId)) return "unavailable";
    const loaded = this.files.get(taskId);
    return loaded ? { open: openAssignments(loaded.file), closed: closedAssignments(loaded.file) } : { open: [], closed: [] };
  }

  /** The innermost linked element of a containment chain (innermost first) decides, by its current entry. */
  ownerOf(chain: readonly TaskExecutionReference[]): TaskExecutionOwner | null {
    this.assertLoaded();
    for (const execution of chain) {
      const current = this.currentOf(execution);
      if (current) return { taskId: current.taskId, execution, open: current.entry.closedAt === null };
    }
    this.assertAllReadable();
    return null;
  }
  isOpen(execution: TaskExecutionReference): boolean {
    this.assertLoaded();
    return this.currentOf(execution)?.entry.closedAt === null;
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

  /** A new copy is new everywhere: it has no entry in any Task. */
  private async link(location: TaskLocation, link: NewTaskExecutionLinkInput): Promise<void> {
    if (this.entriesByExecution.has(taskExecutionReferenceKey(link.execution))) {
      throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run already belongs to a Task.");
    }
    await this.store.update(location, file => linkNewTaskExecution(file, link, this.now().toISOString()), next => this.commit(location, next));
  }
  /** Settles the start of the copy's last entry in its current Task. */
  private async settle(execution: TaskExecutionReference, outcome: Parameters<typeof settleTaskExecutionStart>[2]): Promise<void> {
    await this.load();
    const taskId = this.currentOf(execution)?.taskId;
    if (!taskId) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to a Task.");
    const { location } = this.files.get(taskId)!;
    await this.store.update(location, file => settleTaskExecutionStart(file, execution, outcome), next => this.commit(location, next));
  }
  private currentOf(execution: TaskExecutionReference): Current | undefined {
    return this.currentByExecution.get(taskExecutionReferenceKey(execution));
  }
  /** A committed write: swap the view, then tell the listener (marks only; it never fails the write). */
  private commit(location: TaskLocation, file: TaskExecutionResourceFile): void {
    this.swap(location, file);
    try { this.onCommitted(location); } catch (error) { console.warn("TASK_AGENT_RESOURCE_COMMIT_LISTENER_FAILED", error); }
  }
  /** View swap for one committed Task file: synchronous, never before commit. Re-derives the affected copies' current entries. */
  private swap(location: TaskLocation, file: TaskExecutionResourceFile): void {
    const affected = this.unindex(location.taskId);
    for (const entry of file.executionResources) {
      const key = taskExecutionReferenceKey(entry.execution);
      const perTask = this.entriesByExecution.get(key) ?? new Map<string, TaskExecutionResource>();
      perTask.set(location.taskId, latestEntryOf(file, entry.execution)!);
      this.entriesByExecution.set(key, perTask);
      affected.add(key);
    }
    this.files.set(location.taskId, { location, file });
    affected.forEach(key => this.deriveCurrent(key));
  }
  /** Removes the Task's current file content from the per-copy entries; returns the affected copy keys. */
  private unindex(taskId: string): Set<string> {
    const affected = new Set<string>();
    for (const entry of this.files.get(taskId)?.file.executionResources ?? []) {
      const key = taskExecutionReferenceKey(entry.execution);
      const perTask = this.entriesByExecution.get(key);
      perTask?.delete(taskId);
      if (perTask?.size === 0) this.entriesByExecution.delete(key);
      affected.add(key);
    }
    return affected;
  }
  /**
   * The current-entry rule for one copy: its open entry, else its latest `linkedAt` (tie: the greater
   * Task ID). Two open entries can only come from damaged data: the latest is picked and it is logged.
   */
  private deriveCurrent(key: string): void {
    const previous = this.currentByExecution.get(key);
    if (previous && previous.entry.closedAt !== null) this.unmarkClosed(previous.entry.hostRoot, key);
    const candidates = [...this.entriesByExecution.get(key)?.entries() ?? []].map(([taskId, entry]) => ({ taskId, entry }));
    const open = candidates.filter(candidate => candidate.entry.closedAt === null);
    if (open.length > 1) console.error("TASK_AGENT_RESOURCE_CONFLICT", { execution: key, openTasks: open.map(candidate => candidate.taskId) });
    const latest = (open.length ? open : candidates).reduce<Current | null>((best, candidate) => !best
      || candidate.entry.linkedAt > best.entry.linkedAt
      || (candidate.entry.linkedAt === best.entry.linkedAt && candidate.taskId > best.taskId) ? candidate : best, null);
    if (!latest) { this.currentByExecution.delete(key); return; }
    this.currentByExecution.set(key, latest);
    if (latest.entry.closedAt !== null) {
      const rootKey = rootExecutionIdentityKey(latest.entry.hostRoot);
      const closed = this.closedByHostRootKey.get(rootKey) ?? new Map<string, TaskExecutionReference>();
      closed.set(key, latest.entry.execution);
      this.closedByHostRootKey.set(rootKey, closed);
    }
  }
  private unmarkClosed(hostRoot: RootExecutionIdentity, key: string): void {
    const rootKey = rootExecutionIdentityKey(hostRoot);
    const closed = this.closedByHostRootKey.get(rootKey);
    closed?.delete(key);
    if (closed?.size === 0) this.closedByHostRootKey.delete(rootKey);
  }
  private assertLoaded(): void {
    if (!this.loaded) throw new Error("Task agent run resources are not loaded.");
  }
}
