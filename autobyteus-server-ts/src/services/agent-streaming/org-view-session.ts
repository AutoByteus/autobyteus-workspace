import {
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamServerMessage,
} from "@autobyteus/collaboration-stream-contracts";
import type { RootSnapshotConnection, RunViewStreams } from "../../agent-collaboration/delegation/run-view-stream.js";
import type { LocalChildAgentStatus } from "../../agent-collaboration/execution/delegation/local-child-observation.js";
import { createAgentOrgRootExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { AgentOrgRun, AgentOrgRunPackageSnapshot } from "../../agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../agent-org-execution/domain/agent-org-run-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import { inOrderViewDelivery, isChildRowRootEvent, readRowEvent, readRowsAtBase, readViewRows, type RunViewRowSources, type ViewRows } from "./run-view-rows.js";
import { projectAgentOrgExecutionEvent, projectAgentOrgExecutionSnapshot } from "./agent-org-execution-view-projector.js";

/** What an Org run's view session needs, passed in by the composition (autobyteus-461 SR-046, SR-061 … SR-063). */
export type OrgViewSources = Readonly<{
  /** Each run's one view stream (SR-062). */
  streams: Pick<RunViewStreams, "streamOf">;
  /** The rows under the run: read with a snapshot's base, their records after it, their statuses followed. */
  rows: RunViewRowSources;
  /** The run's registration (managed) and its end, by its identity. */
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  /** The stopped run's own stored tree; null when there is no such run. */
  readStoredTree(orgRunId: string): Promise<AgentOrgRunExecutionTreeSnapshot | null>;
}>;

export class OrgRunNotFoundError extends Error {}

type ViewSnapshot = Readonly<{ own: AgentOrgRunPackageSnapshot; rows: ViewRows; statuses: readonly LocalChildAgentStatus[] }>;

/**
 * One connection's view of an Org run (autobyteus-461 DS-8; SR-045, SR-046, SR-061 … SR-063), as `TeamViewSession` for a
 * team run: in base's shapes, from the run's one `RunViewStream`; it never restores the run; a snapshot reads the base,
 * the rows and their statuses in one synchronous step, then the run's own parts (a live run's, or a stopped run's stored
 * tree); every frame after the base follows in order; a mode switch is an in-band snapshot at the current sequence.
 */
export class OrgViewSession {
  private mode: Readonly<{ kind: "live"; run: AgentOrgRun } | { kind: "stored" }> | null = null;
  private leaveMode: (() => void) | null = null;
  private readonly stopFollowingRows: () => void;
  private readonly stopFollowing: () => void;
  private readonly identity: RootExecutionIdentity;
  private order: Promise<void> = Promise.resolve();
  private closed = false;
  /** Messages that may restore the stopped run, in flight: a switch waits for them (its snapshot carries their input). */
  private restoring = 0;
  private switchWaiting = false;

  constructor(
    readonly orgRunId: string,
    private readonly send: (message: CollaborationStreamServerMessage) => void,
    private readonly sources: OrgViewSources & Readonly<{ activeOrgRun(orgRunId: string): AgentOrgRun | null }>,
  ) {
    this.identity = createAgentOrgRootExecutionIdentity(orgRunId);
    // The rows' statuses are followed into the run's stream while the view is open: each one after a base is a frame.
    this.stopFollowingRows = sources.rows.followers.follow(this.identity);
    this.stopFollowing = sources.registrations.onRegistrationChanged(this.identity, () => this.switchMode());
  }

  /** As `TeamViewSession.whileRestoring`: the switch a restoring message causes waits for that message. */
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

  private run<T>(step: () => Promise<T>): Promise<T> {
    const result = this.order.then(step);
    this.order = result.then(() => undefined, () => undefined);
    return result;
  }

  open(): Promise<void> { return this.run(() => this.follow()); }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.stopFollowing();
    this.leaveMode?.();
    this.leaveMode = null;
    this.stopFollowingRows();
  }

  private lifecycle(isActive: boolean): CollaborationStreamServerMessage {
    return CollaborationStreamServerMessageSchema.parse({ type: "ROOT_LIFECYCLE", payload: { root_subject_kind: "agent_org", root_run_id: this.orgRunId, is_active: isActive } });
  }

  private async follow(): Promise<void> {
    if (this.closed) return;
    const run = this.sources.activeOrgRun(this.orgRunId);
    if (run ? this.mode?.kind === "live" && this.mode.run === run : this.mode?.kind === "stored") return;
    this.leaveMode?.();
    this.leaveMode = null;
    if (run) await this.enterLive(run);
    else await this.enterStored();
  }

  private atBase() { return readRowsAtBase(this.sources.rows, this.identity); }

  private async enterLive(run: AgentOrgRun): Promise<void> {
    const connection = await run.openViewSnapshotConnection(() => this.atBase(),
      async (own, atBase): Promise<ViewSnapshot> => ({ own, statuses: atBase.statuses, rows: await readViewRows(this.sources.rows.projection, this.identity, atBase) }));
    try {
      // The run's own end reaches the view as its unregistration (an in-band stored snapshot follows), not as a close.
      const stopEvents = this.show(connection, run.isActive());
      this.mode = { kind: "live", run };
      this.leaveMode = stopEvents;
    } catch (error) {
      connection.close();
      throw error;
    }
  }

  private async enterStored(): Promise<void> {
    const stream = this.sources.streams.streamOf<AgentOrgRunEvent>(this.identity);
    const connection = await stream.openSnapshotConnection(async (): Promise<ViewSnapshot> => {
      const atBase = this.atBase();
      const tree = await this.sources.readStoredTree(this.orgRunId);
      if (!tree) throw new OrgRunNotFoundError(`AgentOrg run '${this.orgRunId}' was not found.`);
      // A stopped Org reports no statuses of its own; its rows' come from their own runs.
      return { own: { tree, statuses: [], inputStates: [] }, statuses: atBase.statuses, rows: await readViewRows(this.sources.rows.projection, this.identity, atBase) };
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
  private show(connection: RootSnapshotConnection<ViewSnapshot, AgentOrgRunEvent>, isActive: boolean): () => void {
    this.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_VIEW_SNAPSHOT", payload: projectAgentOrgExecutionSnapshot({
      orgRunId: this.orgRunId, isActive, snapshot: connection.snapshot.own,
      baseChangeSequence: connection.baseChangeSequence, liveSequenceId: connection.liveSequenceId,
      lastMessageChangeSequence: connection.lastMessageChangeSequence, rows: connection.snapshot.rows, childStatuses: connection.snapshot.statuses,
    }) }));
    let open = true;
    const unsubscribe = connection.subscribe(inOrderViewDelivery((sequenced) => isChildRowRootEvent(sequenced.event), async (sequenced) => {
      if (!open) return;
      try {
        const rowEvent = isChildRowRootEvent(sequenced.event) ? await readRowEvent(this.sources.rows.projection, this.identity, sequenced.event) : null;
        const projected = projectAgentOrgExecutionEvent(this.orgRunId, sequenced, rowEvent);
        if (projected && open) this.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: projected }));
      } catch (cause) { console.error(`Error projecting an AgentOrg event: ${String(cause)}`); }
    }));
    this.send(this.lifecycle(isActive));
    // The view's peer rows, observed after its snapshot (SR-066): never through the root.
    const stopPeers = this.sources.rows.peers.follow(this.identity);
    return () => { open = false; unsubscribe(); stopPeers(); };
  }
}
