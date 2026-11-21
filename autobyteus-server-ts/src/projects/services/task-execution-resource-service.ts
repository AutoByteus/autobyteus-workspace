import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import {
  runReferenceOf,
  type ExistingTaskExecutionAssignInput, type NewTaskExecutionLinkInput, type TaskEntriesListener, type TaskRunEntry,
} from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";
import { taskExecutionReferenceKey } from "@autobyteus/collaboration-stream-contracts";
import { ProjectError } from "../domain/project-errors.js";
import {
  assertTaskExecutionReopenable, closedAssignments, closeTaskExecutionResources, latestEntryOf, linkExistingTaskExecution, linkNewTaskExecution,
  openAssignments, reopenTaskExecution, setPeerNoticeOwed, settleTaskExecutionStart, type TaskAssignmentView, type TaskExecutionHistory, type TaskExecutionResource,
  type TaskExecutionResourceFile,
} from "../domain/task-execution-resources.js";
import type { TaskLocation } from "../domain/models.js";
import { TaskExecutionResourceStore } from "../stores/task-execution-resource-store.js";
import { latestAssignedEntry } from "./task-root-view-builder.js";

type Loaded = { location: TaskLocation; file: TaskExecutionResourceFile };
type Current = Readonly<{ taskId: string; entry: TaskExecutionResource }>;
/** A run of a closed Task to stop (DS-5): by its own identity; a peer's run is stopped by its node, told by its notice. */
export type ReleasableRun = Readonly<{ run: TaskExecutionReference; nodeId?: string }>;
/** autobyteus-591: a run on a peer node, by its identity and its node. */
export type PeerTaskRun = Readonly<{ run: TaskExecutionReference; nodeId: string }>;
export type TaskAssignmentViews = Readonly<{ open: TaskAssignmentView[]; closed: TaskAssignmentView[] }>;
const ingressOf = (entry: TaskExecutionResource): string =>
  "agentRunId" in entry.execution ? entry.execution.agentRunId : entry.teamCoordinatorAgentRunId!;

/**
 * The sole authority over every Task's `agent_run_resources.json` and the process in-memory view of
 * them (per-Task entries, each copy's entries across Tasks, and the damaged set). A copy may hold open
 * entries in several Tasks (several Tasks given by delegate_task). It alone owns the current-entry rule:
 * a copy's current entry is its newest open entry, else its latest linked entry; every ownership, closure
 * and visibility answer reads it, and a copy is open while any of its entries is. Write preconditions are evaluated on the content
 * read under the file's lock; the view is swapped only by the committing write.
 */
export class TaskExecutionResourceService {
  private readonly files = new Map<string, Loaded>();
  /** Per copy (task execution key): its last entry in each Task file that has one. Derived only in `swap()`/`forget()`. */
  private readonly entriesByExecution = new Map<string, Map<string, TaskExecutionResource>>();
  /** Per copy: its current entry and that Task. */
  private readonly currentByExecution = new Map<string, Current>();
  /** The `DelegationIndex`, told of each Task whose entries changed (set by the composition root once the tree is built). */
  private entriesListener: TaskEntriesListener | null = null;
  private readonly damaged = new Map<string, string>();
  private readonly chains = new Map<string, Promise<unknown>>();
  private loading: Promise<void> | null = null;
  private loaded = false;

  /** Told after each committed write's view swap (never during `load()`): the Task's root may have changed. Must not throw. */
  private onCommitted: (location: TaskLocation) => void = () => undefined;
  constructor(private readonly store = new TaskExecutionResourceStore(), private readonly now: () => Date = () => new Date()) {}

  /** Bound once by the composition (the change publisher's mark). */
  setCommitListener(listener: (location: TaskLocation) => void): void { this.onCommitted = listener; }
  /**
   * Set once by the composition root after the tree is built from the loaded records: the `DelegationIndex`. It is told
   * synchronously after each committed change of a Task's entries, inside that Task's ordered change, before the change
   * resolves (AR-017). A Task change with no listener set fails before it writes (SR-047, ARCH-REV-022).
   */
  setEntriesListener(listener: TaskEntriesListener): void { this.entriesListener = listener; }

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

  /** In-process ordering per key: a Task ID (linking, closure) or a copy's key (see `serializeDelegatedRunInTask`). */
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
  serializeDelegatedRunInTask<T>(execution: TaskExecutionReference, taskId: () => string, operation: (taskId: string) => Promise<T>): Promise<T> {
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
  /** Joins the delegating run's current Task; its openness is decided under that Task file's lock. */
  async linkInherited(link: Extract<NewTaskExecutionLinkInput, { role: "subWork" }>): Promise<string> {
    await this.load();
    const creator = runReferenceOf(link.delegatedFrom.delegatingRun);
    const taskId = creator ? this.currentOf(creator)?.taskId : undefined;
    if (!taskId) throw new ProjectError("TASK_AGENT_RESOURCE_CLOSED", "The creating agent run is not open Task work.");
    await this.link(this.files.get(taskId)!.location, link);
    return taskId;
  }
  /**
   * Existing-copy assignment commit (call under `serializeDelegatedRunInTask`): appends the copy's new
   * `starting` entry to the Task file. The address is the one of the copy's previous assignment.
   */
  async assignExisting(location: TaskLocation, input: ExistingTaskExecutionAssignInput): Promise<void> {
    // A run no Task names any more gives its own address (SR-072 F-24).
    const previous = this.currentOf(input.execution)?.entry;
    const recipientAddress = previous?.recipientAddress ?? input.recipientAddress;
    if (!recipientAddress) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run belongs to no Task.");
    await this.update(location, file => linkExistingTaskExecution(file, {
      delegatedFrom: input.delegatedFrom, execution: input.execution,
      ...(input.teamCoordinatorAgentRunId ? { teamCoordinatorAgentRunId: input.teamCoordinatorAgentRunId } : {}),
      recipientAddress,
      // A run on a peer node stays on its node, with its members (autobyteus-591 DN-8).
      ...(previous?.nodeId !== undefined ? { nodeId: previous.nodeId, ...(previous.members ? { members: previous.members } : {}) } : {}),
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
        await this.update(location, file => closeTaskExecutionResources(file, this.now().toISOString()), next => this.commit(location, next));
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
  /** The Tasks in which this copy has an open entry, oldest first (by `linkedAt`, tie: Task ID), from the view. */
  openTaskIdsOf(execution: TaskExecutionReference): string[] {
    return [...this.entriesByExecution.get(taskExecutionReferenceKey(execution))?.entries() ?? []]
      .filter(([, entry]) => entry.closedAt === null)
      .sort(([a, x], [b, y]) => x.linkedAt.localeCompare(y.linkedAt) || a.localeCompare(b)).map(([taskId]) => taskId);
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
   * Reactivation of the copy's last entry in its current Task (call under `serializeDelegatedRunInTask`):
   * `closedAt` returns to `null` on that entry only. `false` when it was already open (nothing is written).
   */
  async reopenAssignment(location: TaskLocation, execution: TaskExecutionReference, requestedBy: string): Promise<boolean> {
    this.assertReopenable(location, execution, requestedBy);
    if (this.isOpen(execution)) return false;
    let reopened = false;
    await this.update(location, (file) => {
      const next = reopenTaskExecution(file, execution, requestedBy);
      reopened = next !== file;
      return next;
    }, next => this.commit(location, next));
    return reopened;
  }

  /**
   * The runs with an entry in this Task and no open entry in any Task, one per run (a repeated DONE or CANCELLED
   * re-requests them). A run that still holds another open Task is never included: it is stopped when its last open
   * Task closes.
   */
  releasable(taskId: string): ReleasableRun[] {
    const runs = new Map<string, ReleasableRun>();
    for (const entry of this.files.get(taskId)?.file.executionResources ?? []) {
      const key = taskExecutionReferenceKey(entry.execution);
      // The current entry is open while any entry of the run is.
      const current = this.currentByExecution.get(key);
      if (!current || current.entry.closedAt === null) continue;
      runs.set(key, { run: current.entry.execution, ...(current.entry.nodeId !== undefined ? { nodeId: current.entry.nodeId } : {}) });
    }
    return [...runs.values()];
  }
  /** Every readable Task that has entries (`DelegationIndex`'s build). */
  taskIdsWithEntries(): string[] {
    this.assertLoaded();
    return [...this.files.entries()].filter(([, { file }]) => file.executionResources.length).map(([taskId]) => taskId);
  }
  /** The Task's entries, each run's last one, in link order (`DelegationIndex`, contract §2.6). From the view; never reads a file. */
  entriesOf(taskId: string): TaskRunEntry[] {
    const file = this.files.get(taskId)?.file;
    if (!file) return [];
    const last = new Map<string, TaskExecutionResource>();
    for (const entry of file.executionResources) last.set(taskExecutionReferenceKey(entry.execution), entry);
    return [...last.values()].map((entry) => ({
      taskId, role: entry.role, delegatedFrom: entry.delegatedFrom, run: entry.execution, entryAgentRunId: ingressOf(entry),
      open: entry.closedAt === null, start: entry.start, linkedAt: entry.linkedAt,
      recipientAddress: entry.recipientAddress,
      ...(entry.nodeId !== undefined ? { nodeId: entry.nodeId } : {}), ...(entry.members ? { members: entry.members } : {}),
    }));
  }
  /** Ad-hoc Tasks (no Project) assigned by an agent of this run, from the view. */
  adHocTaskIdsDelegatedFrom(run: RootExecutionIdentity): string[] {
    const rootKey = rootExecutionIdentityKey(run);
    return [...this.files.values()]
      .filter(({ location, file }) => location.projectId === null
        && file.executionResources.some(entry => entry.role === "assigned" && rootExecutionIdentityKey(entry.delegatedFrom.delegatingRun) === rootKey))
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
  /** Task deletion (contract T-3): the record goes with its Task; its runs become runs of their own. */
  async removeRecord(location: TaskLocation): Promise<void> {
    await this.serialize(location.taskId, async () => {
      this.requireEntriesListener();
      await this.store.remove(location);
      this.forget(location);
    });
  }
  forget(location: TaskLocation): void {
    const affected = this.unindex(location.taskId);
    this.files.delete(location.taskId);
    affected.forEach(key => this.deriveCurrent(key));
    this.tellEntriesChanged(location.taskId);
  }
  /** The Task's open and closed assignment views; `unavailable` when its data can't be read. */
  async assignments(taskId: string): Promise<TaskAssignmentViews | "unavailable"> {
    await this.load();
    if (this.damaged.has(taskId)) return "unavailable";
    const loaded = this.files.get(taskId);
    return loaded ? { open: openAssignments(loaded.file), closed: closedAssignments(loaded.file) } : { open: [], closed: [] };
  }

  /**
   * autobyteus-591 DN-3: the peer run's delegation state is owed to its node (marked on its current Task's entry) or
   * confirmed (cleared from every Task's entries). Each Task file is written under its Task's ordering, only when it changes.
   */
  async setPeerNoticeOwed(execution: TaskExecutionReference, owed: boolean): Promise<void> {
    await this.load();
    const current = this.currentOf(execution)?.taskId;
    const taskIds = owed ? (current ? [current] : []) : [...this.entriesByExecution.get(taskExecutionReferenceKey(execution))?.keys() ?? []];
    for (const taskId of taskIds) {
      await this.serialize(taskId, async () => {
        const loaded = this.files.get(taskId);
        if (!loaded || this.damaged.has(taskId) || setPeerNoticeOwed(loaded.file, execution, owed) === loaded.file) return;
        await this.update(loaded.location, file => setPeerNoticeOwed(file, execution, owed), next => this.commit(loaded.location, next));
      });
    }
  }
  /** autobyteus-591 DN-4: the peer runs whose delegation state is owed, one per run, from the view (start-up's retry list). */
  owedPeerNotices(): PeerTaskRun[] {
    this.assertLoaded();
    const owed = new Map<string, PeerTaskRun>();
    for (const { file } of this.files.values()) {
      for (const entry of file.executionResources) {
        if (entry.peerNoticeOwed && entry.nodeId !== undefined) owed.set(taskExecutionReferenceKey(entry.execution), { run: entry.execution, nodeId: entry.nodeId });
      }
    }
    return [...owed.values()];
  }

  isOpen(execution: TaskExecutionReference): boolean {
    this.assertLoaded();
    return this.currentOf(execution)?.entry.closedAt === null;
  }
  assertTaskReadable(taskId: string): void {
    const message = this.damaged.get(taskId);
    if (message) throw new ProjectError("TASK_AGENT_RESOURCES_UNAVAILABLE", message);
  }
  assertAllReadable(): void {
    const first = this.firstUnreadable();
    if (first) throw new ProjectError("TASK_AGENT_RESOURCES_UNAVAILABLE", first);
  }
  /** The first unreadable Task file's message, or `null`. */
  firstUnreadable(): string | null {
    return this.damaged.values().next().value ?? null;
  }

  /** A new copy is new everywhere: it has no entry in any Task. */
  private async link(location: TaskLocation, link: NewTaskExecutionLinkInput): Promise<void> {
    if (this.entriesByExecution.has(taskExecutionReferenceKey(link.execution))) {
      throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run already belongs to a Task.");
    }
    await this.update(location, file => linkNewTaskExecution(file, link, this.now().toISOString()), next => this.commit(location, next));
  }
  /** Settles the start of the copy's last entry in its current Task. */
  private async settle(execution: TaskExecutionReference, outcome: Parameters<typeof settleTaskExecutionStart>[2]): Promise<void> {
    await this.load();
    const taskId = this.currentOf(execution)?.taskId;
    if (!taskId) throw new ProjectError("TASK_AGENT_RESOURCE_CONFLICT", "The agent run is not linked to a Task.");
    const { location } = this.files.get(taskId)!;
    await this.update(location, file => settleTaskExecutionStart(file, execution, outcome), next => this.commit(location, next));
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
    if (this.loaded) this.tellEntriesChanged(location.taskId);
  }
  private requireEntriesListener(): TaskEntriesListener {
    if (!this.entriesListener) throw new Error("TASK_ENTRIES_LISTENER_UNSET: a Task change needs the delegation tree, which the composition sets.");
    return this.entriesListener;
  }
  /** A Task's write; it fails before writing when no entries listener is set. */
  private update(...args: Parameters<TaskExecutionResourceStore["update"]>): ReturnType<TaskExecutionResourceStore["update"]> {
    this.requireEntriesListener();
    return this.store.update(...args);
  }
  /** Synchronous, inside the Task's ordered change; a listener failure never fails the committed write. */
  private tellEntriesChanged(taskId: string): void {
    try { this.requireEntriesListener().entriesChanged(taskId); } catch (error) { console.warn("DELEGATION_TREE_UPDATE_FAILED", { taskId, error }); }
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
   * The current-entry rule for one copy: its newest open entry, else its latest linked entry (by `linkedAt`;
   * tie: the greater Task ID). A copy may hold several open entries (several Tasks given by delegate_task).
   */
  private deriveCurrent(key: string): void {

    const candidates = [...this.entriesByExecution.get(key)?.entries() ?? []].map(([taskId, entry]) => ({ taskId, entry }));
    const open = candidates.filter(candidate => candidate.entry.closedAt === null);
    const latest = (open.length ? open : candidates).reduce<Current | null>((best, candidate) => !best
      || candidate.entry.linkedAt > best.entry.linkedAt
      || (candidate.entry.linkedAt === best.entry.linkedAt && candidate.taskId > best.taskId) ? candidate : best, null);
    if (!latest) { this.currentByExecution.delete(key); return; }
    this.currentByExecution.set(key, latest);
  }
  private assertLoaded(): void {
    if (!this.loaded) throw new Error("Task agent run resources are not loaded.");
  }
}
