import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import { foldTeamAggregateStatus, type RunAgentStatus, type RunStatusAnswer, type RunStatusRunRef, type RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import type { RemoteRunSummaryEvent } from "./remote/remote-run-observation.js";
import type { RootExecutionIdentity } from "./domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "./services/active-collaboration-root-directory.js";
import type { PairedAgentAccess, PairedAgentObservation } from "./remote/paired-agent-access.js";
import type { PeerRun, PeerRunOf } from "./remote/peer-runs.js";

/** Where a run's statuses come from: the run itself (its own root, or its peer's handle), never its delegator. */
export type RunStatusSources = Readonly<{
  /** A local run's own agents: their live statuses and changes, while its root runs (an Org's own agents too, G-A4). */
  agents(kind: "agent" | "agent_team" | "agent_org"): Pick<PairedAgentAccess, "observePairedAgents" | "pairedAgentStatuses">;
  /** Whether a run's root runs, and when that changes. */
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged" | "resolve">;
  /** A local run's agents, from its own file (offline until its root says otherwise). */
  agentsOf(run: RootExecutionIdentity): Promise<readonly Readonly<{ agentRunId: string }>[]>;
  /** The handle of a run on a peer node, by its ID; `null` for a local run. */
  peerRunOf: PeerRunOf;
  /** A peer run's observation ended without being asked (AR-403): its views ask its node for one summary. */
  peerEnded(peerRunId: string): void;
  /** A peer node's name, from this node's own registry (its ID when it names none). */
  peerNodeName(nodeId: string): Promise<string>;
  /** A peer run's node's answer about it (title, reachability, statuses, launches); `null` when it gave none. */
  peerSummary(peer: PeerRun): Promise<RemoteRunSummaryEvent | null>;
  /** A held peer run's answer changed (SR-086 G-B2): the trees holding its row are told (`ChildRowsFeed.rowChanged`). */
  summaryChanged(run: RootExecutionIdentity): void;
}>;

/** A run's own state (SR-086 G-A2 … G-A4): the node's answer, the peer node when it did not answer, the run's own status. */
export type RunState = Readonly<{ answer: RunStatusAnswer; node: string | null; status: RunAgentStatus | null }>;

const STATUSES: readonly RunAgentStatus[] = ["offline", "idle", "error", "initializing", "running"];
const toStatus = (value: unknown): RunAgentStatus => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (STATUSES as readonly string[]).includes(normalized) ? normalized as RunAgentStatus : "offline";
};
const statusOfFrame = (message: AgentPresentationMessage): RunAgentStatus | null =>
  message.type === "AGENT_STATUS" ? toStatus((message.payload as { status?: unknown }).status) : null;
const keyOf = (ref: Pick<RunStatusRunRef, "kind" | "runId">): string => `${ref.kind}:${ref.runId}`;

type Listener = Readonly<{
  statusChanged(ref: RunStatusRunRef, agentRunId: string, status: RunAgentStatus): void;
  stateChanged(ref: RunStatusRunRef, state: RunState): void;
  treeChanged(ref: RunStatusRunRef): void;
}>;

/** One subscribed run: its agents' answers, from the run itself, held while any connection holds it (counted). */
export class RunStatusEntry {
  readonly answers = new Map<string, RunAgentStatus>();
  readonly listeners = new Set<Listener>();
  holders = 0;
  readonly ready: Promise<void>;
  private closed = false;
  private readonly releases: (() => void)[] = [];
  /** A peer run's observation again, after it ended (Retry, DEC-807 Phase 1); `null` for a local or org run. */
  private observePeer: (() => void) | null = null;
  /** A peer run's node; `null` for a local or org run. */
  private peerNodeId: string | null = null;
  private answer: RunStatusAnswer = "ok";
  private unreachableNode: string | null = null;
  /** The state its listeners were last told (or answered in a snapshot). */
  private told: RunState | null = null;

  constructor(readonly ref: RunStatusRunRef, private readonly sources: RunStatusSources) {
    this.ready = this.start().catch((error: unknown) => { console.warn(`Run '${ref.runId}': its statuses could not be followed: ${String(error)}`); });
  }

  close(): void {
    this.closed = true;
    for (const release of this.releases.splice(0)) release();
  }

  /** Retry: a peer run whose observation ended is observed again (DEC-807 Phase 1: an observation never reconnects alone). */
  retry(): void { this.observePeer?.(); }

  /** The node a peer run runs on; `null` for a run on this node. */
  get nodeId(): string | null { return this.peerNodeId; }

  /**
   * The run's own state (G-A4): an agent run's own agent's status; a Team's or an Org's from its own agents by the one
   * team status rule (base's), on the server, never derived by a client. No status unless the node answered for it.
   */
  get state(): RunState {
    const status = this.answer !== "ok" ? null
      : this.ref.kind === "agent" ? this.answers.get(this.ref.runId) ?? "offline"
      : foldTeamAggregateStatus([...this.answers.values()], "live");
    return Object.freeze({ answer: this.answer, node: this.unreachableNode, status });
  }

  /** A peer run's latest answer from its node (G-B2), kept while the run is held; its row's launches come from it. */
  summary: RemoteRunSummaryEvent | null = null;

  /** A peer run's node answered: kept, and its state set; answers whether its content (title, reachability, launches) changed. */
  applySummary(summary: RemoteRunSummaryEvent): boolean {
    if (this.closed || !this.peerNodeId || summary.nodeId !== this.peerNodeId) return false;
    const content = (value: RemoteRunSummaryEvent | null) => JSON.stringify(value && [value.title, value.reachable, value.launches]);
    const changed = content(this.summary) !== content(summary);
    this.summary = summary;
    this.peerAnswered(summary);
    return changed;
  }

  /** The state as a snapshot answers it: later changes are told against it. */
  stateForSnapshot(): RunState { this.told = this.state; return this.told; }

  /** A peer run's node answered about it (G-A3): reachable, or not, with the node's name. */
  peerAnswered(summary: Pick<RemoteRunSummaryEvent, "reachable">): void {
    if (this.closed || !this.peerNodeId) return;
    if (summary.reachable) { this.answer = "ok"; this.unreachableNode = null; this.tellState(); return; }
    const nodeId = this.peerNodeId;
    void this.sources.peerNodeName(nodeId).catch(() => nodeId).then((name) => {
      if (this.closed) return;
      this.answer = "unreachable";
      this.unreachableNode = name;
      this.tellState();
    });
  }

  private tellState(): void {
    const state = this.state;
    const told = this.told;
    if (told && told.answer === state.answer && told.node === state.node && told.status === state.status) return;
    this.told = state;
    for (const listener of [...this.listeners]) listener.stateChanged(this.ref, state);
  }

  private set(agentRunId: string, status: RunAgentStatus): void {
    if (this.closed || this.answers.get(agentRunId) === status) return;
    this.answers.set(agentRunId, status);
    for (const listener of [...this.listeners]) listener.statusChanged(this.ref, agentRunId, status);
    this.tellState();
  }

  private allOffline(): void {
    for (const agentRunId of [...this.answers.keys()]) this.set(agentRunId, "offline");
  }

  private async start(): Promise<void> {
    const peer = this.ref.kind === "agent_org" ? null : this.sources.peerRunOf(this.ref.runId);
    if (peer) { this.startPeer(peer); return; }
    await this.startLocal(this.ref.kind);
  }

  /**
   * A local run: its agents are offline until its root runs; while it runs, its own root's statuses. The listener is
   * attached first and the current statuses read after it, so no change falls between them; a restore observes again.
   */
  private async startLocal(kind: RunStatusRunRef["kind"]): Promise<void> {
    const root: RootExecutionIdentity = { rootSubjectKind: kind, rootRunId: this.ref.runId } as RootExecutionIdentity;
    for (const agent of await this.sources.agentsOf(root)) if (!this.answers.has(agent.agentRunId)) this.answers.set(agent.agentRunId, "offline");
    if (this.closed) return;
    // A run this node has no file of and no root for is not one of its runs (G-A2); its registration answers it later.
    if (this.answers.size === 0 && !this.sources.registrations.resolve(root)) this.answer = "not_found";
    const access = this.sources.agents(kind);
    let observation: PairedAgentObservation | null = null;
    let generation = 0;
    const stop = (): void => { generation += 1; observation?.close(); observation = null; };
    const observe = async (): Promise<void> => {
      stop();
      const mine = generation;
      const opened = await access.observePairedAgents(this.ref.runId, (agentRunId, message) => {
        const status = mine === generation ? statusOfFrame(message) : null;
        if (status) this.set(agentRunId, status);
      }, () => { if (mine === generation) { observation = null; this.allOffline(); } });
      if (this.closed || mine !== generation) { opened?.close(); return; }
      observation = opened;
      for (const live of access.pairedAgentStatuses(this.ref.runId)) this.set(live.agentRunId, toStatus(live.status));
    };
    this.releases.push(this.sources.registrations.onRegistrationChanged(root, (registered) => {
      if (registered && this.answer === "not_found") { this.answer = "ok"; this.tellState(); }
      if (registered) void observe().catch((error: unknown) => console.warn(`Run '${this.ref.runId}': its statuses could not be followed: ${String(error)}`));
      else { stop(); this.allOffline(); }
    }), stop);
    if (this.sources.registrations.resolve(root)) await observe();
  }

  /**
   * A peer run: its handle's own observation, shared by every subscriber (one entry per run). When it ends unasked, its
   * agents read offline and its views ask its node for one summary (AR-403); Retry observes it again.
   */
  private startPeer(peer: PeerRun): void {
    this.peerNodeId = peer.link.nodeId;
    const ids = peer.link.kind === "agent" ? [peer.link.agentRunId] : peer.link.members.map((member) => member.agentRunId);
    for (const agentRunId of ids) this.answers.set(agentRunId, "offline");
    let stream: Readonly<{ close(): void }> | null = null;
    const observe = (): void => {
      if (this.closed || stream) return;
      let current: Readonly<{ close(): void }> | null = null;
      let ended = false;
      const end = (): void => {
        if (stream === current) stream = null;
        this.allOffline();
        if (!this.closed) { this.sources.peerEnded(this.ref.runId); this.askSummary(peer); }
      };
      current = peer.observe({
        onFrame: (agentRunId, message) => {
          const status = !ended && ids.includes(agentRunId) ? statusOfFrame(message) : null;
          if (status) this.set(agentRunId, status);
        },
        onEnd: () => { ended = true; if (current) end(); },
      });
      if (ended || !current) { end(); return; }
      stream = current;
    };
    this.observePeer = observe;
    this.releases.push(() => { this.observePeer = null; stream?.close(); stream = null; });
    observe();
    this.askSummary(peer);
  }

  /** Asks the run's node for its answer (when first held, and after its observation ended unasked). */
  private askSummary(peer: PeerRun): void {
    void this.sources.peerSummary(peer).then((summary) => {
      if (summary && this.applySummary(summary)) this.sources.summaryChanged({ rootSubjectKind: this.ref.kind, rootRunId: this.ref.runId } as RootExecutionIdentity);
    }).catch((error: unknown) => console.warn(`Peer run '${this.ref.runId}': its node's answer could not be read: ${String(error)}`));
  }
}

/**
 * Each run's statuses, read by run ID from the run itself (autobyteus-461 SR-082, SR-083; FU-026), and a notice when a
 * run's rows changed. Node-level: one entry per subscribed run, shared by every connection that subscribes to it and
 * released with the last. A local run's answers come from its own root (offline when it is not running); a peer run's
 * from its handle. Nothing is started, restored or stored.
 */
export class RunStatusService {
  private readonly entries = new Map<string, RunStatusEntry>();

  constructor(private readonly sources: RunStatusSources) {}

  /** A client's connection (one per window): it subscribes to the runs it shows. */
  connect(send: (message: RunStatusServerMessage) => void): RunStatusConnection {
    return new RunStatusConnection(this, send);
  }

  /** A run's rows changed (`ChildRowsFeed`, for the run and every run above it): its subscribers read its view again. */
  treeChanged(run: RootExecutionIdentity): void {
    const entry = this.entries.get(keyOf({ kind: run.rootSubjectKind as RunStatusRunRef["kind"], runId: run.rootRunId }));
    if (entry) for (const listener of [...entry.listeners]) listener.treeChanged(entry.ref);
  }

  /**
   * Retry (`REFRESH_REMOTE_TASK_EXECUTIONS`), or a node that answered again: these peer runs' ended observations are
   * observed again, and every other ended observation of a run on their nodes (CR-461-094): the node is back for each of
   * its runs, whichever view asked, so a run its views no longer show (a subscriber's alone) follows again too.
   */
  retryPeers(peerRunIds: readonly string[], nodeIds: readonly string[] = []): void {
    const ids = new Set(peerRunIds);
    const nodes = new Set([...nodeIds, ...[...this.entries.values()].flatMap((entry) => ids.has(entry.ref.runId) && entry.nodeId ? [entry.nodeId] : [])]);
    for (const entry of this.entries.values()) if (ids.has(entry.ref.runId) || (entry.nodeId && nodes.has(entry.nodeId))) entry.retry();
  }

  /** A node's answer about one of its runs (a view's ask, SR-066): kept with the run when it is held (G-B2). */
  peerAnswered(summary: RemoteRunSummaryEvent): void {
    for (const entry of this.entries.values()) {
      if (entry.ref.runId !== summary.runId || !entry.applySummary(summary)) continue;
      this.sources.summaryChanged({ rootSubjectKind: entry.ref.kind, rootRunId: entry.ref.runId } as RootExecutionIdentity);
    }
  }

  /** A held peer run's latest answer from its node; `null` when it is not held or has not answered. */
  peerSummaryOf(runId: string): RemoteRunSummaryEvent | null {
    for (const entry of this.entries.values()) if (entry.ref.runId === runId && entry.summary) return entry.summary;
    return null;
  }

  /** The number of runs held now (for tests and diagnostics). */
  get heldRuns(): number { return this.entries.size; }

  hold(ref: RunStatusRunRef): RunStatusEntry {
    const key = keyOf(ref);
    let entry = this.entries.get(key);
    if (!entry) { entry = new RunStatusEntry(Object.freeze({ kind: ref.kind, runId: ref.runId }), this.sources); this.entries.set(key, entry); }
    entry.holders += 1;
    return entry;
  }

  release(entry: RunStatusEntry): void {
    if (--entry.holders > 0) return;
    if (this.entries.get(keyOf(entry.ref)) === entry) this.entries.delete(keyOf(entry.ref));
    entry.close();
  }
}

/** One client's subscriptions. Each run's answers are read and its listener registered in one synchronous step. */
export class RunStatusConnection implements Listener {
  private readonly held = new Map<string, RunStatusEntry>();
  private closed = false;

  constructor(private readonly service: RunStatusService, private readonly send: (message: RunStatusServerMessage) => void) {}

  /** Holds the runs, then answers their current statuses and follows them; a run already subscribed is skipped. */
  async subscribe(runs: readonly RunStatusRunRef[]): Promise<void> {
    const added: RunStatusEntry[] = [];
    for (const ref of runs) {
      if (this.closed || this.held.has(keyOf(ref))) continue;
      const entry = this.service.hold(ref);
      this.held.set(keyOf(ref), entry);
      added.push(entry);
    }
    await Promise.all(added.map((entry) => entry.ready));
    // One synchronous step: a change after it reaches this connection; one before it is in the answers read here.
    const snapshot: Array<RunStatusRunRef & RunState & { agents: { agentRunId: string; status: RunAgentStatus }[] }> = [];
    for (const entry of added) {
      if (this.closed || this.held.get(keyOf(entry.ref)) !== entry) continue;
      entry.listeners.add(this);
      snapshot.push({ ...entry.ref, ...entry.stateForSnapshot(), agents: [...entry.answers].map(([agentRunId, status]) => ({ agentRunId, status })) });
    }
    if (snapshot.length) this.send({ type: "RUN_STATUS_SNAPSHOT", payload: { runs: snapshot } });
  }

  unsubscribe(runs: readonly RunStatusRunRef[]): void {
    for (const ref of runs) {
      const entry = this.held.get(keyOf(ref));
      if (!entry) continue;
      this.held.delete(keyOf(ref));
      this.drop(entry);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const entry of this.held.values()) this.drop(entry);
    this.held.clear();
  }

  statusChanged(ref: RunStatusRunRef, agentRunId: string, status: RunAgentStatus): void {
    this.send({ type: "RUN_STATUS_CHANGED", payload: { ...ref, agentRunId, status } });
  }

  stateChanged(ref: RunStatusRunRef, state: RunState): void {
    this.send({ type: "RUN_STATE_CHANGED", payload: { ...ref, ...state } });
  }

  treeChanged(ref: RunStatusRunRef): void {
    this.send({ type: "RUN_TREE_CHANGED", payload: { ...ref } });
  }

  private drop(entry: RunStatusEntry): void {
    entry.listeners.delete(this);
    this.service.release(entry);
  }
}
