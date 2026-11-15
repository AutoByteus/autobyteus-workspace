import { unrestorableRoot, type RootRestoreRefusal } from "../../agent-collaboration/execution/services/root-restore-admission.js";
import type { DelegatedRunRestorability } from "../../agent-collaboration/execution/task/delegated-run-restorability.js";
import type { ClosedTaskEntryFence } from "../../agent-collaboration/execution/task/closed-task-fence.js";
import { parseTeamStreamServerMessage, type TeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import type { RootSnapshotConnection, RunViewStreams, SequencedRootEvent } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { RemoteRunRootEvent } from "../../agent-collaboration/execution/remote/remote-run-observation.js";
import { createTeamRootExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootTeamRun, RootTeamRunPackageSnapshot } from "../../agent-team-execution/domain/root-team-run.js";
import type { TeamRunEvent } from "../../agent-team-execution/domain/team-run-event.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { inOrderViewDelivery, isReadBeforeSending, readTreeAtBase, readViewTree, type RunViewRowSources } from "./run-view-rows.js";
import { isRunTreeChangedEvent, type RunTreeChangedEvent } from "../../agent-collaboration/delegation/run-tree-view.js";
import type { RunTreeSessionRows } from "../../agent-collaboration/delegation/run-tree-changes.js";
import { storedTeamPackageSnapshot } from "./stored-team-package-snapshot.js";
import { projectSequencedTeamRunEvent, projectTeamExecutionViewSnapshot } from "./team-execution-view-projector.js";
import { projectTeamRemoteEvent } from "./team-remote-event-projector.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

/** What a team run's view session needs, passed in by the composition (autobyteus-461 SR-046, SR-061 … SR-063). */
export type TeamViewSources = Readonly<{
  /** Each run's one view stream (SR-062). */
  streams: Pick<RunViewStreams, "streamOf">;
  /** The runs under it: its tree read with a snapshot's base, its peer rows' output followed (SR-084). */
  rows: RunViewRowSources;
  /** The run's registration (managed) and its end, by its identity. */
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  /** The closed-Task input fence (DS-15, SR-070): a member's input is refused before the run is restored. */
  closedTasks: Pick<ClosedTaskEntryFence, "refusal">;
  /** Whether a stopped delegated team run can be restored (CR-461-070): asked before a message restores it. */
  restorability: Pick<DelegatedRunRestorability, "refusal">;
  /** The managed, active team run; null while it is stopped (never restores). */
  activeTeamRun(teamRunId: string): RootTeamRun | null;
  /** Base's restore admission of the stopped run (SR-078, CR-461-069), asked before its stored file is read. */
  restoreRefusal(teamRunId: string): Promise<RootRestoreRefusal | null>;
  /** The stopped run's own stored tree; null when there is no such run. */
  readStoredTree(teamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null>;
}>;

export class TeamRunNotFoundError extends Error {}
/**
 * A stopped run that cannot be restored, answered with its reason: the restore admission's own (CR-461-073), or, for an
 * admitted run whose stored file cannot be read, "cannot be restored" with the detail logged (CR-461-069).
 */
export class TeamRunNotRestorableError extends Error {
  constructor(readonly refusal: RootRestoreRefusal) { super(refusal.message); }
}

/** What a team run's view stream carries: the run's own events, its peer rows' output and its tree's notices (`ChildRowsFeed`). */
type TeamViewEvent = TeamRunEvent | RemoteRunRootEvent | RunTreeChangedEvent;
type ViewSnapshot = Readonly<{ own: Pick<RootTeamRunPackageSnapshot, "tree" | "statuses" | "inputStates">; tree: RunTreeSessionRows }>;

const lifecycle = (isActive: boolean): TeamStreamServerMessage =>
  parseTeamStreamServerMessage({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: isActive } });

/**
 * One connection's view of a team run (autobyteus-461 DS-8; SR-045, SR-046, SR-061 … SR-063), in base's shapes, from the
 * run's one `RunViewStream`. It never restores or starts the run. A snapshot reads the base and its tree in one
 * synchronous step, then the run's own parts: a live root's in its gate, a stopped run's from its file. Every
 * frame after the base follows in order: the run's own events, base's row events with their records, the rows'
 * statuses. A switch between stored and live mode is an in-band snapshot through the same stream, at the current
 * sequence, under the same live sequence, and the run's lifecycle. A member's message that starts the run is posted
 * after the view is live (`showCurrentMode`), so its echo is an ordinary live event after the snapshot (SR-048).
 */
export class TeamViewSession {
  private mode: Readonly<{ kind: "live"; root: RootTeamRun } | { kind: "stored" }> | null = null;
  private leaveMode: (() => void) | null = null;
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

  private atBase() { return readTreeAtBase(this.sources.rows, this.identity); }

  private async enterLive(root: RootTeamRun): Promise<void> {
    const connection = await root.openViewSnapshotConnection(() => this.atBase(),
      async (own, atBase): Promise<ViewSnapshot> => ({ own, tree: await readViewTree(this.sources.rows, this.identity, atBase) }));
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
    // A root its restore would refuse answers the admission's own code and text, then closes (CR-461-073: the connect is
    // the one place the reason can reach the user); never its stored file's parse error.
    const refused = await this.sources.restoreRefusal(this.teamRunId);
    if (refused) throw new TeamRunNotRestorableError(refused);
    const stream = this.sources.streams.streamOf<TeamViewEvent>(this.identity);
    const connection = await stream.openSnapshotConnection(async (): Promise<ViewSnapshot> => {
      const atBase = this.atBase();
      const tree = await this.sources.readStoredTree(this.teamRunId).catch((error: unknown) => {
        throw new TeamRunNotRestorableError(unrestorableRoot({ kind: "Team run", code: "TEAM_RUN_NOT_RESTORABLE", runId: this.teamRunId, error }));
      });
      if (!tree) throw new TeamRunNotFoundError(`Team run '${this.teamRunId}' not found`);
      return { own: storedTeamPackageSnapshot(tree), tree: await readViewTree(this.sources.rows, this.identity, atBase) };
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
    }));
    // The run's tree at the same base (SR-084); its changes follow as numbered `RUN_TREE_CHANGED` frames.
    const tree = connection.snapshot.tree;
    this.sink.send(parseTeamStreamServerMessage({ type: "RUN_TREE_SNAPSHOT", payload: { base_change_sequence: connection.baseChangeSequence, rows: tree.current } }));
    let open = true;
    const unsubscribe = connection.subscribe(inOrderViewDelivery((sequenced) => isReadBeforeSending(sequenced.event as { kind?: unknown }), async (sequenced) => {
      if (!open) return;
      try {
        const event = sequenced.event;
        if (isRunTreeChangedEvent(event as { kind?: unknown })) {
          const change = await tree.next();
          if (open) this.sink.send(parseTeamStreamServerMessage({ type: "RUN_TREE_CHANGED", payload: { change_sequence: sequenced.changeSequence, ...change } }));
          return;
        }
        const message = this.project(sequenced);
        if (message && open) this.sink.send(message);
      } catch (error) { console.error(`Error projecting a team run's view event: ${String(error)}`); }
    }));
    this.sink.send(lifecycle(isActive));
    // The view's peer rows, observed after its snapshot (SR-066): never through the root.
    const stopPeers = this.sources.rows.peers.follow(this.identity);
    return () => { open = false; unsubscribe(); stopPeers(); };
  }

  /** One event in base's shapes. */
  private project(sequenced: SequencedRootEvent<TeamViewEvent>): TeamStreamServerMessage | null {
    const event = sequenced.event;
    // The peer rows' live output (SR-066, DS-8); every row's status is its own run's (SR-083).
    if ("kind" in event && event.kind === "remote_agent_presentation") return projectTeamRemoteEvent(event, sequenced.changeSequence);
    return projectSequencedTeamRunEvent(sequenced as SequencedRootEvent<TeamRunEvent>);
  }
}
