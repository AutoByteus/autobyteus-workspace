import { randomUUID } from "node:crypto";
import { parseTeamStreamServerMessage, type TeamStreamServerMessage } from "@autobyteus/team-stream-contracts";
import type { ChildRowsFeed } from "../../agent-collaboration/delegation/child-rows-feed.js";
import { createTeamRootExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { localChildStatuses } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import type { TeamRunExecutionTreeSnapshot } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { ChildRowsStreamSession } from "./child-rows-stream-session.js";
import { delegatedChildrenDtos } from "./delegated-children-dtos.js";
import { remoteTaskExecutionDtos } from "./remote-task-execution-dto-projection.js";
import { followStoredChildren, storedTeamPackageSnapshot } from "./stored-view-children.js";
import { projectSequencedTeamRunEvent, projectTeamChildRunsChanged, projectTeamExecutionViewSnapshot } from "./team-execution-view-projector.js";
import { projectTeamRemoteEvent } from "./team-remote-event-projector.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

/** What a team run's view session needs, passed in by the composition (autobyteus-461 SR-046). */
export type TeamViewSources = Readonly<{
  childRowsFeed: ChildRowsFeed;
  /** The run's registration (managed) and its end, by its identity. */
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  /** The managed, active team run; null while it is stopped (never restores). */
  activeTeamRun(teamRunId: string): RootTeamRun | null;
  /** The stopped run's own stored tree; null when there is no such run. */
  readStoredTree(teamRunId: string): Promise<TeamRunExecutionTreeSnapshot | null>;
}>;

export class TeamRunNotFoundError extends Error {}

const lifecycle = (isActive: boolean): TeamStreamServerMessage =>
  parseTeamStreamServerMessage({ type: "TEAM_RUN_LIFECYCLE", payload: { is_active: isActive } });

/**
 * One connection's view of a team run (autobyteus-461 DS-8, SR-045, SR-046). It never restores or starts the run:
 * - **stored mode**, while the run is not managed: a snapshot from its stored file through the same projection, its
 *   child rows (`ChildRowsFeed`) and its children's output, numbered by this session;
 * - **live mode**, while it is managed: the live root's snapshot and events.
 * The session follows the run's registration; each switch sends a fresh in-band snapshot (a new `change_sequence`
 * base) and the run's lifecycle, in the session's own order. A switch caused by a message (a member's first input
 * restores the run) waits for that message's handling (`whileRestoring`), so its snapshot carries the input.
 */
export class TeamViewSession {
  private mode: Readonly<{ kind: "live"; root: RootTeamRun } | { kind: "stored" }> | null = null;
  private leaveMode: (() => void) | null = null;
  private readonly childRows: ChildRowsStreamSession;
  private readonly stopFollowing: () => void;
  private order: Promise<void> = Promise.resolve();
  private closed = false;
  /** Messages that may restore the stopped run, in flight: a switch waits for them (its snapshot carries their input). */
  private restoring = 0;
  private switchWaiting = false;

  constructor(
    readonly teamRunId: string,
    private readonly sink: AgentStreamServerMessageSink<TeamStreamServerMessage>,
    private readonly sources: TeamViewSources,
  ) {
    const identity: RootExecutionIdentity = createTeamRootExecutionIdentity(teamRunId);
    this.childRows = new ChildRowsStreamSession(sources.childRowsFeed, identity, (event) => sink.send(projectTeamChildRunsChanged(teamRunId, event)));
    this.stopFollowing = sources.registrations.onRegistrationChanged(identity, () => this.switchMode());
  }

  /**
   * `work` may restore the stopped run (a message to one of its own agents, its first input): the mode switch the
   * restore causes waits until `work` is done, so the live snapshot is read after the message was posted and carries the
   * agent's input state (ARCH-REV-021). Other commands run as they arrive.
   */
  async whileRestoring<T>(work: () => Promise<T>): Promise<T> {
    this.restoring += 1;
    try {
      return await work();
    } finally {
      this.restoring -= 1;
      if (!this.restoring && this.switchWaiting) { this.switchWaiting = false; this.switchMode(); }
    }
  }

  private switchMode(): void {
    if (this.restoring) { this.switchWaiting = true; return; }
    void this.run(() => this.follow()).catch((error: unknown) => console.error(`A run view could not switch modes: ${String(error)}`));
  }

  /** Runs `step` after every earlier step of this session. */
  private run<T>(step: () => Promise<T>): Promise<T> {
    const result = this.order.then(step);
    this.order = result.then(() => undefined, () => undefined);
    return result;
  }

  /** The first snapshot, in the run's current mode. Throws `TeamRunNotFoundError` for a run that does not exist. */
  open(): Promise<void> { return this.run(() => this.follow()); }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.stopFollowing();
    this.leaveMode?.();
    this.leaveMode = null;
    this.childRows.dispose();
  }

  private async follow(): Promise<void> {
    if (this.closed) return;
    const root = this.sources.activeTeamRun(this.teamRunId);
    if (root ? this.mode?.kind === "live" && this.mode.root === root : this.mode?.kind === "stored") return;
    this.leaveMode?.();
    this.leaveMode = null;
    this.childRows.snapshotBuilding();
    if (root) await this.enterLive(root);
    else await this.enterStored();
  }

  private async enterLive(root: RootTeamRun): Promise<void> {
    const identity = createTeamRootExecutionIdentity(root.teamRunId);
    const remote = await remoteTaskExecutionDtos(identity);
    const delegated = await delegatedChildrenDtos(identity);
    const statuses = await localChildStatuses(identity);
    const connection = await root.openPackageSnapshotConnection();
    try {
      this.sink.send(projectTeamExecutionViewSnapshot(root.teamRunId, connection, remote, delegated, statuses));
      this.childRows.snapshotSent();
      const unsubscribe = connection.subscribe((event) => {
        try { this.sink.send(projectSequencedTeamRunEvent(root, event)); }
        catch (error) { console.error(`Error projecting TeamRun event: ${String(error)}`); }
      });
      this.sink.send(lifecycle(true));
      root.remoteChildren.viewerAttached();
      root.localChildren.viewerAttached();
      this.mode = { kind: "live", root };
      this.leaveMode = () => { unsubscribe(); root.remoteChildren.viewerDetached(); root.localChildren.viewerDetached(); };
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  private async enterStored(): Promise<void> {
    const tree = await this.sources.readStoredTree(this.teamRunId);
    if (!tree) throw new TeamRunNotFoundError(`Team run '${this.teamRunId}' not found`);
    const identity = createTeamRootExecutionIdentity(this.teamRunId);
    const remote = await remoteTaskExecutionDtos(identity);
    const delegated = await delegatedChildrenDtos(identity);
    const statuses = await localChildStatuses(identity);
    this.sink.send(projectTeamExecutionViewSnapshot(this.teamRunId, {
      snapshot: storedTeamPackageSnapshot(tree), baseChangeSequence: 0, liveSequenceId: `stored-${randomUUID()}`, lastMessageChangeSequence: 0,
    }, remote, delegated, statuses));
    this.childRows.snapshotSent();
    this.sink.send(lifecycle(false));
    this.mode = { kind: "stored" };
    // The children's output, as a live root gives its viewers; numbered from this snapshot's base.
    this.leaveMode = followStoredChildren(identity, 0, (changeSequence, event) => {
      try { this.sink.send(projectTeamRemoteEvent(event, changeSequence)); }
      catch (error) { console.error(`Error projecting a child's output: ${String(error)}`); }
    });
  }
}
