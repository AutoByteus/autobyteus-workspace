import { unrestorableRoot, type RootRestoreRefusal } from "../../agent-collaboration/execution/services/root-restore-admission.js";
import {
  CollaborationStreamServerMessageSchema,
  type CollaborationStreamServerMessage,
} from "@autobyteus/collaboration-stream-contracts";
import type { RootSnapshotConnection, RunViewStreams } from "../../agent-collaboration/delegation/run-view-stream.js";
import { createAgentOrgRootExecutionIdentity, type RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { AgentOrgRun, AgentOrgRunPackageSnapshot } from "../../agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunEvent } from "../../agent-org-execution/domain/agent-org-run-event.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import { inOrderViewDelivery, isChildRowRootEvent, isReadBeforeSending, readRowEvent, readRowsAtBase, readViewSnapshot, type RunViewRowSources, type ViewRows } from "./run-view-rows.js";
import { isRunTreeChangedEvent } from "../../agent-collaboration/delegation/run-tree-view.js";
import type { RunTreeSessionRows } from "../../agent-collaboration/delegation/run-tree-changes.js";
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
/**
 * A stopped Org that cannot be restored, answered with its reason: the restore admission's own (CR-461-073), or, for an
 * admitted Org whose stored file cannot be read, "cannot be restored" with the detail logged (CR-461-069).
 */
export class OrgRunNotRestorableError extends Error {
  constructor(readonly refusal: RootRestoreRefusal) { super(refusal.message); }
}

type ViewSnapshot = Readonly<{ own: AgentOrgRunPackageSnapshot; rows: ViewRows; tree: RunTreeSessionRows }>;

/**
 * One connection's view of an Org run (autobyteus-461 DS-8; SR-045, SR-046, SR-061 … SR-063), as `TeamViewSession` for a
 * team run: in base's shapes, from the run's one `RunViewStream`; it never restores the run; a snapshot reads the base,
 * the rows and their statuses in one synchronous step, then the run's own parts (a live run's, or a stopped run's stored
 * tree); every frame after the base follows in order; a mode switch is an in-band snapshot at the current sequence.
 */
export class OrgViewSession {
  private mode: Readonly<{ kind: "live"; run: AgentOrgRun } | { kind: "stored" }> | null = null;
  private leaveMode: (() => void) | null = null;
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
    private readonly sources: OrgViewSources & Readonly<{
      activeOrgRun(orgRunId: string): AgentOrgRun | null;
      /** Base's restore admission of the stopped Org (SR-078, CR-461-069), asked before its stored file is read. */
      restoreRefusal(orgRunId: string): Promise<RootRestoreRefusal | null>;
    }>,
  ) {
    this.identity = createAgentOrgRootExecutionIdentity(orgRunId);
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
      async (own, atBase): Promise<ViewSnapshot> => ({ own, ...await readViewSnapshot(this.sources.rows, this.identity, atBase) }));
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
    // A root its restore would refuse answers the admission's own code and text, then closes (CR-461-073: the connect is
    // the one place the reason can reach the user); never its stored file's parse error.
    const refused = await this.sources.restoreRefusal(this.orgRunId);
    if (refused) throw new OrgRunNotRestorableError(refused);
    const stream = this.sources.streams.streamOf<AgentOrgRunEvent>(this.identity);
    const connection = await stream.openSnapshotConnection(async (): Promise<ViewSnapshot> => {
      const atBase = this.atBase();
      const tree = await this.sources.readStoredTree(this.orgRunId).catch((error: unknown) => {
        throw new OrgRunNotRestorableError(unrestorableRoot({ kind: "AgentOrg run", code: "AGENT_ORG_RUN_NOT_RESTORABLE", runId: this.orgRunId, error }));
      });
      if (!tree) throw new OrgRunNotFoundError(`AgentOrg run '${this.orgRunId}' was not found.`);
      // A stopped Org reports no statuses of its own; its rows' come from their own runs (SR-083).
      return { own: { tree, statuses: [], inputStates: [] }, ...await readViewSnapshot(this.sources.rows, this.identity, atBase) };
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
      lastMessageChangeSequence: connection.lastMessageChangeSequence, rows: connection.snapshot.rows,
    }) }));
    // The run's tree at the same base (SR-084); its changes follow as numbered `run_tree_changed` events.
    const tree = connection.snapshot.tree;
    this.send(CollaborationStreamServerMessageSchema.parse({ type: "RUN_TREE_SNAPSHOT", payload: { root_subject_kind: "agent_org", root_run_id: this.orgRunId,
      base_change_sequence: connection.baseChangeSequence, rows: tree.current } }));
    let open = true;
    const unsubscribe = connection.subscribe(inOrderViewDelivery((sequenced) => isReadBeforeSending(sequenced.event), async (sequenced) => {
      if (!open) return;
      try {
        if (isRunTreeChangedEvent(sequenced.event)) {
          const change = await tree.next();
          if (open) this.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: { root_subject_kind: "agent_org",
            root_run_id: this.orgRunId, change_sequence: sequenced.changeSequence, event: { kind: "run_tree_changed", ...change } } }));
          return;
        }
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
