import type { RemoteTaskExecutionDto } from "@autobyteus/agent-presentation-contracts";
import type { CollaborationTaskExecutionDto } from "@autobyteus/collaboration-stream-contracts";
import type { ChildRowProjection, ChildRowRootEvent, ChildRowsFeed, PlacedRow } from "../../agent-collaboration/delegation/child-rows-feed.js";
import type { LocalChildAgentStatus } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import type { LocalChildFollowers } from "../../agent-collaboration/execution/delegation/local-child-followers.js";
import type { PeerChildObservation } from "../../agent-collaboration/delegation/peer-child-observation.js";
import type { PeerRunOf } from "../../agent-collaboration/execution/remote/peer-runs.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { runIdentityOf } from "../../agent-collaboration/execution/task/task-execution-resource-port.js";
import type { TaskExecutionReference } from "../../agent-collaboration/execution/task/task-execution-reference.js";

/** What a run's view reads about the rows under it (SR-061 … SR-063), from the composition root. */
export type RunViewRowSources = Readonly<{
  feed: Pick<ChildRowsFeed, "rowsOf">;
  projection: ChildRowProjection;
  followers: Pick<LocalChildFollowers, "follow" | "cachedStatuses">;
  /** The peer rows' live status and output (SR-066): followed after a view's snapshot; Retry asks again. */
  peers: Pick<PeerChildObservation, "follow" | "refresh">;
  /** A peer run by its own ID (SR-066): a view's command for a peer row goes to its handle, never through a root. */
  peerRunOf: PeerRunOf;
}>;

/** The rows' part of a snapshot, read at its base in one synchronous step (SR-063): the placed rows and the statuses. */
export type RowsAtBase = Readonly<{ rows: ReturnType<ChildRowsFeed["rowsOf"]>; statuses: readonly LocalChildAgentStatus[] }>;

export const readRowsAtBase = (sources: RunViewRowSources, run: RootExecutionIdentity): RowsAtBase =>
  Object.freeze({ rows: sources.feed.rowsOf(run), statuses: sources.followers.cachedStatuses(run) });

type LocalRecord = Readonly<{ placed: PlacedRow; execution: CollaborationTaskExecutionDto }>;

/** The rows of a snapshot, in base's shapes: the local rows nested by placement, the peer rows, and the closed set. */
export type ViewRows = Readonly<{
  /** The root's task executions, each task team with its own nested (base's placement). */
  taskExecutions: readonly CollaborationTaskExecutionDto[];
  remoteTaskExecutions: readonly RemoteTaskExecutionDto[];
  closedTaskExecutions: readonly TaskExecutionReference[];
}>;

const referenceOf = (placed: PlacedRow): TaskExecutionReference => placed.row.run;
const teamRunIdOf = (execution: CollaborationTaskExecutionDto): string | null => "teamRunId" in execution ? execution.teamRunId : null;

/** Base's nesting: each row in the root, or in the task team it is placed in; a placement no longer listed is the root. */
export const nestByPlacement = (records: readonly LocalRecord[]): CollaborationTaskExecutionDto[] => {
  const children = new Map<string, CollaborationTaskExecutionDto[]>();
  const teams = new Set(records.flatMap(({ execution }) => teamRunIdOf(execution) ?? []));
  const root: LocalRecord[] = [];
  for (const record of records) {
    if (record.placed.host.hostKind === "team" && teams.has(record.placed.host.hostRunId)) {
      children.set(record.placed.host.hostRunId, [...children.get(record.placed.host.hostRunId) ?? [], record.execution]);
    } else root.push(record);
  }
  const nest = (execution: CollaborationTaskExecutionDto): CollaborationTaskExecutionDto => {
    const teamRunId = teamRunIdOf(execution);
    if (!teamRunId || !("taskExecutions" in execution)) return execution;
    return Object.freeze({ ...execution, taskExecutions: Object.freeze((children.get(teamRunId) ?? []).map(nest)) });
  };
  return root.map(({ execution }) => nest(execution));
};

/** Reads the records of the rows read at the base, after it: rows whose record cannot be read are left out with a warning. */
export const readViewRows = async (projection: ChildRowProjection, run: RootExecutionIdentity, atBase: RowsAtBase): Promise<ViewRows> => {
  const read = async (placed: PlacedRow) => {
    try { return await projection.rowOf(placed.row); }
    catch (error) {
      console.warn(`A run delegated under ${run.rootSubjectKind} run '${run.rootRunId}' was left out of its view: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };
  const all = [...atBase.rows.open.map((placed) => ({ placed, closed: false })), ...atBase.rows.closed.map((placed) => ({ placed, closed: true }))];
  const records = await Promise.all(all.map(async (entry) => ({ ...entry, record: await read(entry.placed) })));
  const local: LocalRecord[] = [];
  const remote: RemoteTaskExecutionDto[] = [];
  for (const { placed, record } of records) {
    if (record?.kind === "local") local.push({ placed, execution: record.row });
    else if (record?.kind === "peer") remote.push(record.row);
  }
  return Object.freeze({
    taskExecutions: Object.freeze(nestByPlacement(local)),
    remoteTaskExecutions: Object.freeze(remote),
    closedTaskExecutions: Object.freeze(records.filter((entry) => entry.closed && entry.record?.kind === "local").map((entry) => referenceOf(entry.placed))),
  });
};

/** A row event with its records read, as each view kind projects it (base's events). */
export type ProjectedRowEvent =
  | Readonly<{ kind: "task_execution_started"; host: PlacedRow["host"]; execution: CollaborationTaskExecutionDto }>
  | Readonly<{ kind: "remote_task_execution_started"; execution: RemoteTaskExecutionDto }>
  | Readonly<{ kind: "task_executions_closed"; taskExecutions: readonly TaskExecutionReference[] }>
  | Readonly<{ kind: "task_executions_reopened"; executions: readonly Readonly<{ host: PlacedRow["host"]; execution: CollaborationTaskExecutionDto }>[] }>;

/** Reads a row event's records (at send time, in the view's order); `null` when none could be read. */
export const readRowEvent = async (projection: ChildRowProjection, event: ChildRowRootEvent): Promise<ProjectedRowEvent | null> => {
  switch (event.kind) {
    case "task_executions_closed":
      return event;
    case "task_execution_started": {
      const record = await projection.rowOf(event.placed.row).catch(() => null);
      if (!record) return null;
      return record.kind === "peer"
        ? Object.freeze({ kind: "remote_task_execution_started", execution: record.row })
        : Object.freeze({ kind: "task_execution_started", host: event.placed.host, execution: record.row });
    }
    case "task_executions_reopened": {
      const executions = [];
      for (const placed of event.placed) {
        const record = await projection.rowOf(placed.row).catch(() => null);
        if (record?.kind === "local") executions.push(Object.freeze({ host: placed.host, execution: record.row }));
      }
      return executions.length ? Object.freeze({ kind: "task_executions_reopened", executions: Object.freeze(executions) }) : null;
    }
  }
};

/** Whether an event of a run's view stream is a row event. */
export const isChildRowRootEvent = (event: { kind?: unknown }): event is ChildRowRootEvent =>
  event.kind === "task_execution_started" || event.kind === "task_executions_closed" || event.kind === "task_executions_reopened";

/** A row's run, by identity. */
export const rowRunOf = (placed: PlacedRow): RootExecutionIdentity => runIdentityOf(placed.row.run);
