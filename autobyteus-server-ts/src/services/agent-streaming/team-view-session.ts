import type { ClosedTaskFence } from "../../agent-collaboration/execution/task/closed-task-fence.js";
import { parseTeamStreamServerMessage, type TeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import type { RootSnapshotConnection, RunViewStreams, SequencedRootEvent } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { ChildRowRootEvent } from "../../agent-collaboration/delegation/child-rows-feed.js";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";
import type { LocalChildAgentStatus, LocalChildRootEvent } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import { createTeamRootExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootTeamRun, RootTeamRunPackageSnapshot } from "../../agent-team-execution/domain/root-team-run.js";
import type { TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { inOrderViewDelivery, isChildRowRootEvent, readRowEvent, readRowsAtBase, readViewSnapshot, type ProjectedRowEvent, type RunViewRowSources, type ViewRows } from "./run-view-rows.js";
import { storedTeamPackageSnapshot } from "./stored-view-children.js";
import { projectSequencedTeamRunEvent, projectTeamExecutionViewSnapshot, projectTeamRowEvent } from "./team-execution-view-projector.js";
import { projectTeamRemoteEvent } from "./team-remote-event-projector.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

/** What a team run's view session needs, passed in by the composition (autobyteus-461 SR-046, SR-061 … SR-063). */
export type TeamViewSources = Readonly<{
  /** Each run's one view stream (SR-062). */
  streams: Pick<RunViewStreams, "streamOf">;
  /** The rows under the run: read with a snapshot's base, their records after it, their statuses followed. */
  rows: RunViewRowSources;
  /** The run's registration (managed) and its end, by its identity. */
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  /** The closed-Task input fence (DS-15, SR-070): a member's input is refused before the run is restored. */
  closedTasks: Pick<ClosedTaskFence, "refusal">;
  /** The managed, active team run; null while it is stopped (never restores). */
  activeTeamRun(teamRunId: string): RootTeamRun | null;
  /** The stopped run's own stored tree; null when there is no such run. */
  readStoredTree(teamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null>;
}>;

export class TeamRunNotFoundError extends Error {}

/** What a team run's view stream carries: the run's own events, its rows' (`ChildRowsFeed`) and their statuses. */
type TeamViewEvent = TeamRunEvent | LocalChildRootEvent | RemoteRunRootEvent | ChildRowRootEvent;
type ViewSnapshot = Readonly<{ own: Pick<RootTeamRunPackageSnapshot, "tree" | "statuses" | "inputStates">; rows: ViewRows; statuses: readonly LocalChildAgentStatus[] }>;

const lifecycle = (isActive: boolean): TeamStreamServerMessage =>
  parseTeamStreamServerMessage({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: isActive } });

/**
 * One connection's view of a team run (autobyteus-461 DS-8; SR-045, SR-046, SR-061 … SR-063), in base's shapes, from the
 * run's one `RunViewStream`. It never restores or starts the run. A snapshot reads the base, the rows and their statuses
 * in one synchronous step, then the run's own parts: a live root's in its gate, a stopped run's from its file. Every
 * frame after the base follows in order: the run's own events, base's row events with their records, the rows'
 * statuses. A switch between stored and live mode is an in-band snapshot through the same stream, at the current
 * sequence, under the same live sequence, and the run's lifecycle. A member's message that starts the run is posted
 * after the view is live (`showCurrentMode`), so its echo is an ordinary live event after the snapshot (SR-048).
 */
export class TeamViewSession {
  private mode: Readonly<{ kind: "live"; root: RootTeamRun } | { kind: "stored" }> | null = null;
  private leaveMode: (() => void) | null = null;
  private readonly stopFollowingRows: () => void;
  private readonly stopFollowing: () => void;
  private readonly identity: RootExecutionIdentity;
  private order: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(
    readonly teamRunId: string,
    private readonly sink: AgentStreamServerMessageSink<TeamStreamServerMessage>,
    private readonly sources: TeamViewSources,
  ) {
    this.identity = createTeamRootExecutionIdentity(teamRunId);
    // The rows' statuses are followed into the run's stream while the view is open: each one after a base is a frame.
    this.stopFollowingRows = sources.rows.followers.follow(this.identity);
    this.stopFollowing = sources.registrations.onRegistrationChanged(this.identity, () => this.switchMode());
  }

  private switchMode(): void {
    void this.run(() => this.follow()).catch((error: unknown) => console.error(`A run view could not switch modes: ${String(error)}`));
  }

  /** Runs `step` after every earlier step of this session. */
  private run<T>(step: () => Promise<T>): Promise<T> {
    const result = this.order.then(step);
    this.order = result.then(() => undefined, () => undefined);
    return result;
  }

  /**
   * The view in the run's current mode, after every earlier step: the first snapshot on connect, and the switch to live
   * before a member's message that started the run is posted (SR-048). Throws `TeamRunNotFoundError` for a run that does
   * not exist.
   */
  showCurrentMode(): Promise<void> { return this.run(() => this.follow()); }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.stopFollowing();
    this.leaveMode?.();
    this.leaveMode = null;
    this.stopFollowingRows();
  }

  private async follow(): Promise<void> {
    if (this.closed) return;
    const root = this.sources.activeTeamRun(this.teamRunId);
    if (root ? this.mode?.kind === "live" && this.mode.root === root : this.mode?.kind === "stored") return;
    this.leaveMode?.();
    this.leaveMode = null;
    if (root) await this.enterLive(root);
    else await this.enterStored();
  }

  private atBase() { return readRowsAtBase(this.sources.rows, this.identity); }

  private async enterLive(root: RootTeamRun): Promise<void> {
    const connection = await root.openViewSnapshotConnection(() => this.atBase(),
      async (own, atBase): Promise<ViewSnapshot> => ({ own, ...await readViewSnapshot(this.sources.rows, this.identity, atBase) }));
    try {
      const stopEvents = this.show(connection as RootSnapshotConnection<ViewSnapshot, TeamViewEvent>, true);
      this.mode = { kind: "live", root };
      this.leaveMode = stopEvents;
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  private async enterStored(): Promise<void> {
    const stream = this.sources.streams.streamOf<TeamViewEvent>(this.identity);
    const connection = await stream.openSnapshotConnection(async (): Promise<ViewSnapshot> => {
      const atBase = this.atBase();
      const tree = await this.sources.readStoredTree(this.teamRunId);
      if (!tree) throw new TeamRunNotFoundError(`Team run '${this.teamRunId}' not found`);
      return { own: storedTeamPackageSnapshot(tree), ...await readViewSnapshot(this.sources.rows, this.identity, atBase) };
    });
    try {
      this.leaveMode = this.show(connection, false);
      this.mode = { kind: "stored" };
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  /** Sends the snapshot and its lifecycle, then every frame after its base, in order; returns the unsubscribe. */
  private show(connection: RootSnapshotConnection<ViewSnapshot, TeamViewEvent>, isActive: boolean): () => void {
    this.sink.send(projectTeamExecutionViewSnapshot(this.teamRunId, {
      snapshot: connection.snapshot.own, baseChangeSequence: connection.baseChangeSequence, liveSequenceId: connection.liveSequenceId,
      lastMessageChangeSequence: connection.lastMessageChangeSequence,
    }, connection.snapshot.rows, connection.snapshot.statuses));
    let open = true;
    const unsubscribe = connection.subscribe(inOrderViewDelivery((sequenced) => isChildRowRootEvent(sequenced.event as { kind?: unknown }), async (sequenced) => {
      if (!open) return;
      try {
        const event = sequenced.event;
        const rowEvent = isChildRowRootEvent(event as { kind?: unknown }) ? await readRowEvent(this.sources.rows.projection, this.identity, event as ChildRowRootEvent) : null;
        const message = this.project(sequenced, rowEvent);
        if (message && open) this.sink.send(message);
      } catch (error) { console.error(`Error projecting a team run's view event: ${String(error)}`); }
    }));
    this.sink.send(lifecycle(isActive));
    // The view's peer rows, observed after its snapshot (SR-066): never through the root.
    const stopPeers = this.sources.rows.peers.follow(this.identity);
    return () => { open = false; unsubscribe(); stopPeers(); };
  }

  /** One event in base's shapes; a row event with its records read (`null` when none could be read). */
  private project(sequenced: SequencedRootEvent<TeamViewEvent>, rowEvent: ProjectedRowEvent | null): TeamStreamServerMessage | null {
    const event = sequenced.event;
    // The rows' statuses and the peer rows' summaries and output (SR-066), as base projected a hosted copy's and a peer's.
    if ("kind" in event && (event.kind === "local_child_presentation" || event.kind === "remote_agent_presentation"
      || event.kind === "remote_task_execution_summary")) return projectTeamRemoteEvent(event, sequenced.changeSequence);
    if (isChildRowRootEvent(event as { kind?: unknown })) return rowEvent ? projectTeamRowEvent(rowEvent, sequenced.changeSequence) : null;
    return projectSequencedTeamRunEvent(sequenced as SequencedRootEvent<TeamRunEvent>);
  }
}
