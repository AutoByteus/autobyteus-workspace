import { randomUUID } from "node:crypto";
import {
  CollaborationStreamServerMessageSchema,
  RootExecutionEventDtoSchema,
  type CollaborationStreamServerMessage,
} from "@autobyteus/collaboration-stream-contracts";
import type { ChildRowsStreams } from "../../agent-collaboration/delegation/child-rows-streams.js";
import type { LocalChildFollowers } from "../../agent-collaboration/execution/delegation/local-child-followers.js";
import { createAgentOrgRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import type { AgentOrgRun } from "../../agent-org-execution/domain/agent-org-run.js";
import type { AgentOrgRunExecutionTreeSnapshot } from "../../agent-org-execution/domain/agent-org-run-execution-tree.js";
import { ChildRowsStreamSession, projectCollaborationChildRunsChanged } from "./child-rows-stream-session.js";
import type { RunViewChildren } from "./run-view-children.js";
import { projectAgentOrgExecutionEvent, projectAgentOrgExecutionSnapshot, projectAgentOrgExecutionView } from "./agent-org-execution-view-projector.js";

/** What an Org run's view session needs, passed in by the composition (autobyteus-461 SR-046). */
export type OrgViewSources = Readonly<{
  /** The open view streams the child-row feed publishes to. */
  streams: Pick<ChildRowsStreams, "open">;
  /** The run's children as its view reads them (rows, peer rows, statuses). */
  children: Pick<RunViewChildren, "rows" | "remote" | "statuses">;
  /** Its local children's output: into a live root's stream, or numbered by this view while the run is stopped. */
  followers: Pick<LocalChildFollowers, "followLive" | "followStored">;
  /** The run's registration (managed) and its end, by its identity. */
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged">;
  /** The stopped run's own stored tree; null when there is no such run. */
  readStoredTree(orgRunId: string): Promise<AgentOrgRunExecutionTreeSnapshot | null>;
}>;

export class OrgRunNotFoundError extends Error {}

/**
 * One connection's view of an Org run (autobyteus-461 DS-8, SR-045, SR-046), as `TeamViewSession` for a team run: it
 * never restores the run; **stored mode** while the run is not managed (its stored tree, child rows, children's output
 * numbered by this session), **live mode** while it is (the live run's snapshot and events); each switch sends a fresh
 * in-band snapshot and the run's lifecycle, in the session's own order.
 */
export class OrgViewSession {
  private mode: Readonly<{ kind: "live"; run: AgentOrgRun } | { kind: "stored" }> | null = null;
  private leaveMode: (() => void) | null = null;
  private readonly childRows: ChildRowsStreamSession;
  private readonly stopFollowing: () => void;
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
    const identity = createAgentOrgRootExecutionIdentity(orgRunId);
    this.childRows = new ChildRowsStreamSession(sources.streams, identity, (event) => send(projectCollaborationChildRunsChanged("agent_org", orgRunId, event)));
    this.stopFollowing = sources.registrations.onRegistrationChanged(identity, () => this.switchMode());
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
    this.childRows.dispose();
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
    this.childRows.snapshotBuilding();
    if (run) await this.enterLive(run);
    else await this.enterStored();
  }

  private async enterLive(run: AgentOrgRun): Promise<void> {
    const identity = createAgentOrgRootExecutionIdentity(run.orgRunId);
    const remote = await this.sources.children.remote(identity);
    const delegated = await this.sources.children.rows(identity);
    const statuses = await this.sources.children.statuses(identity);
    const barrier = await run.openPackageSnapshotConnection();
    try {
      this.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_VIEW_SNAPSHOT",
        payload: projectAgentOrgExecutionView(run, barrier, remote, delegated, statuses) }));
      this.childRows.snapshotSent();
      // The run's own end reaches the view as its unregistration (a stored-mode snapshot follows), not as a close.
      const unsubscribe = barrier.subscribe((event) => {
        try {
          const projected = projectAgentOrgExecutionEvent(run, event);
          if (projected) this.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: projected }));
        } catch (cause) { console.error(`Error projecting an AgentOrg event: ${String(cause)}`); }
      });
      this.send(this.lifecycle(true));
      run.remoteChildren.viewerAttached();
      const stopChildren = this.sources.followers.followLive(run);
      this.mode = { kind: "live", run };
      this.leaveMode = () => { unsubscribe(); run.remoteChildren.viewerDetached(); stopChildren(); };
    } catch (error) {
      barrier.close();
      throw error;
    }
  }

  private async enterStored(): Promise<void> {
    const tree = await this.sources.readStoredTree(this.orgRunId);
    if (!tree) throw new OrgRunNotFoundError(`AgentOrg run '${this.orgRunId}' was not found.`);
    const identity = createAgentOrgRootExecutionIdentity(this.orgRunId);
    // A stopped Org reports no statuses; its children's come as their output below.
    this.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_VIEW_SNAPSHOT", payload: projectAgentOrgExecutionSnapshot({
      orgRunId: this.orgRunId, isActive: false, snapshot: { tree, statuses: [], inputStates: [] },
      baseChangeSequence: 0, liveSequenceId: `stored-${randomUUID()}`, lastMessageChangeSequence: 0,
      remoteTaskExecutions: await this.sources.children.remote(identity), delegated: await this.sources.children.rows(identity),
    }) }));
    this.childRows.snapshotSent();
    this.send(this.lifecycle(false));
    this.mode = { kind: "stored" };
    this.leaveMode = this.sources.followers.followStored(identity, 0, (changeSequence, event) => {
      try {
        this.send(CollaborationStreamServerMessageSchema.parse({ type: "ROOT_EXECUTION_EVENT", payload: RootExecutionEventDtoSchema.parse({
          root_subject_kind: "agent_org", root_run_id: this.orgRunId, change_sequence: changeSequence,
          event: { kind: "agent_presentation", member_address: event.memberAddress, agent_run_id: event.agentRunId, message: event.message },
        }) }));
      } catch (cause) { console.error(`Error projecting a child's output: ${String(cause)}`); }
    });
  }
}
