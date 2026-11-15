import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import { rootExecutionIdentityKey, type RootExecutionIdentity } from "../execution/domain/root-execution-identity.js";
import { runIdentityOf } from "../execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../execution/task/task-execution-reference.js";
import type { ChildRowsChange, DelegationIndex } from "./delegation-index.js";
import type { SubtreeRow } from "./collaboration-tree.js";
import type { RunViewStreams } from "./run-view-stream.js";
import { RUN_TREE_CHANGED_EVENT, type RunTreeChangedEvent } from "./run-tree-view.js";

/** One row as a view projects it: a run on this node (from its own file), or a peer's run. */
export type ChildRowRecord =
  | Readonly<{ kind: "local"; row: CollaborationTaskExecutionDto }>
  | Readonly<{ kind: "peer"; row: RemoteTaskExecutionDto; summary: Readonly<{ title: string | null; reachable: boolean }> | null }>;

/** The views' own projection of one row (at any depth, under its `parent`); `null` when its record cannot be read. Bound by the composition. */
export type ChildRowProjection = Readonly<{
  rowOf(row: SubtreeRow): Promise<ChildRowRecord | null>;
}>;

/**
 * Where a row is placed in its view's tree, as at base (`827f1e68dc`): in the root (the delegator is the run's own agent
 * or member) or in a task team (the delegator is one of that team's members, or a task agent placed in it).
 */
export type TaskExecutionPlacement = Readonly<{ hostKind: "root" | "team"; hostRunId: string }>;

/** A row of a view, with its placement; its record is read when a view sends it (`ChildRowProjection`). */
export type PlacedRow = Readonly<{ row: SubtreeRow; host: TaskExecutionPlacement }>;

/**
 * Base's row events in a run's view stream (SR-061, SR-062), numbered in the run's one sequence at the change itself;
 * each view session reads the records when it sends them, in order. A started peer row is base's
 * `remote_task_execution_started`.
 */
export type ChildRowRootEvent =
  | Readonly<{ kind: "task_execution_started"; placed: PlacedRow }>
  | Readonly<{ kind: "task_executions_closed"; taskExecutions: readonly TaskExecutionReference[] }>
  | Readonly<{ kind: "task_executions_reopened"; placed: readonly PlacedRow[] }>;

const rowKey = (row: SubtreeRow): string => rootExecutionIdentityKey(runIdentityOf(row.run));

/**
 * A row's placement in `run`'s view, as at base: the root when `run` delegated it; the row of its delegating run when
 * that is a team run; else the placement of its delegating run's row.
 */
export const placementOf = (run: RootExecutionIdentity, row: SubtreeRow, rows: readonly SubtreeRow[]): TaskExecutionPlacement => {
  const byRun = new Map(rows.map((candidate) => [rowKey(candidate), candidate]));
  let current = row;
  for (let depth = 0; depth <= rows.length; depth += 1) {
    if (rootExecutionIdentityKey(current.parent) === rootExecutionIdentityKey(run)) break;
    if (current.parent.rootSubjectKind === "agent_team") return Object.freeze({ hostKind: "team", hostRunId: current.parent.rootRunId });
    const parentRow = byRun.get(rootExecutionIdentityKey(current.parent));
    if (!parentRow) break;
    current = parentRow;
  }
  return Object.freeze({ hostKind: "root", hostRunId: run.rootRunId });
};

/**
 * The one emitter of base's row events (SR-061, SR-062): it follows the `DelegationIndex`'s row changes and publishes,
 * in each affected run's `RunViewStream` and at the change itself, base's `task_execution_started` for a new row,
 * `task_executions_closed` for rows whose Tasks closed, and `task_executions_reopened` for closed rows back. It keeps
 * each run's closed set (base's meaning: a delegated run whose Tasks all closed while it still runs; it leaves the view
 * when it stops). It never starts or restores a run.
 */
export class ChildRowsFeed {
  /** Per run, the rows this feed reported closed in its stream and not back since (CR-461-042). */
  private readonly reportedClosed = new Map<string, Set<string>>();

  constructor(private readonly dependencies: Readonly<{
    streams: Pick<RunViewStreams, "streamOf">;
    tree: Pick<DelegationIndex, "collaborationTreeOf">;
    /** Whether a run still runs (its root is live): base's closed set holds only runs that still run. */
    isRunning(run: RootExecutionIdentity): boolean;
    /** A run's rows changed (`/ws/run-status`'s `RUN_TREE_CHANGED`, SR-083): told for the run and every run above it. */
    rowsChanged(run: RootExecutionIdentity): void;
  }>) {}

  /** Follows a tree's row reports until the returned function is called. */
  follow(tree: Pick<DelegationIndex, "subscribeChildRows">): () => void {
    return tree.subscribeChildRows((change) => this.changed(change));
  }

  /**
   * `run`'s rows with their placements, read synchronously (a snapshot reads them with its base, SR-063): its open
   * subtree, and its closed set (`CollaborationTree.closedRows`).
   */
  rowsOf(run: RootExecutionIdentity): Readonly<{ open: readonly PlacedRow[]; closed: readonly PlacedRow[] }> {
    const tree = this.dependencies.tree.collaborationTreeOf(run);
    const rows = tree.rows();
    const closedRows = tree.closedRows((candidate) => this.dependencies.isRunning(candidate));
    const all = [...rows, ...closedRows];
    return Object.freeze({
      open: Object.freeze(rows.map((row) => Object.freeze({ row, host: placementOf(run, row, rows) }))),
      closed: Object.freeze(closedRows.map((row) => Object.freeze({ row, host: placementOf(run, row, all) }))),
    });
  }

  /**
   * At the change itself, in `change.run`'s stream: a row that left the open subtree is closed; a row that comes back
   * after this stream reported it closed (its assigner reactivated it, or gave it a follow-up Task) is reopened, as at
   * base (CR-461-042); any other new row is started.
   */
  private changed(change: ChildRowsChange): void {
    const rows = this.dependencies.tree.collaborationTreeOf(change.run).rows();
    const stream = this.dependencies.streams.streamOf<ChildRowRootEvent | RunTreeChangedEvent>(change.run);
    const runKey = rootExecutionIdentityKey(change.run);
    const closed = this.reportedClosed.get(runKey) ?? new Set<string>();
    const reopened: PlacedRow[] = [];
    for (const row of change.added) {
      const placed: PlacedRow = Object.freeze({ row, host: placementOf(change.run, row, rows) });
      if (closed.delete(rowKey(row))) reopened.push(placed);
      else stream.publish({ kind: "task_execution_started", placed });
    }
    if (reopened.length) stream.publish({ kind: "task_executions_reopened", placed: Object.freeze(reopened) });
    if (change.removed.length) {
      for (const removed of change.removed) closed.add(rootExecutionIdentityKey(runIdentityOf(removed)));
      stream.publish({ kind: "task_executions_closed", taskExecutions: Object.freeze([...change.removed]) });
    }
    if (closed.size) this.reportedClosed.set(runKey, closed); else this.reportedClosed.delete(runKey);
    // The run's tree (SR-084): its open views read it again; its listed, not-open views are told on `/ws/run-status`.
    stream.publish(RUN_TREE_CHANGED_EVENT);
    this.dependencies.rowsChanged(change.run);
  }
}
