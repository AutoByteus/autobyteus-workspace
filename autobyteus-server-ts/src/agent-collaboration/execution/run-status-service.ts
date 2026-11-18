import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import { foldTeamAggregateStatus, type RunAgentStatus, type RunStatusAnswer, type RunStatusRunRef, type RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import { backgroundTasksRunningOf } from "../../agent-execution/domain/agent-status-payload.js";
import type { RemoteRunSummaryEvent } from "./remote/remote-run-observation.js";
import type { RootExecutionIdentity } from "./domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "./services/active-collaboration-root-directory.js";
import type { RunAgentAccess, RunAgentObservation } from "./remote/run-agent-access.js";
import type { PeerRun, PeerRunOf } from "./remote/peer-runs.js";

/** Where a run's statuses come from: the run itself (its own root, or its peer's handle), never its delegator. */
export type RunStatusSources = Readonly<{
  /** A local run's own agents: their live statuses and changes, while its root runs (an Org's own agents too, G-A4). */
  agents(kind: "agent" | "agent_team" | "agent_org"): Pick<RunAgentAccess, "observeRunAgents" | "runAgentStatuses">;
  /** Whether a run's root runs, and when that changes. */
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged" | "resolve">;
  /** A local run's agents, from its own file (offline until its root says otherwise). */
  agentsOf(run: RootExecutionIdentity): Promise<readonly Readonly<{ agentRunId: string }>[]>;
  /** The handle of a run on a peer node, by its ID; `null` for a local run. */
  peerRunOf: PeerRunOf;
  /** A peer node's name, from this node's own registry (its ID when it names none). */
  peerNodeName(nodeId: string): Promise<string>;
  /** A peer run's node's answer about it (title, reachability, statuses, launches); `null` when it gave none. */
  peerSummary(peer: PeerRun): Promise<RemoteRunSummaryEvent | null>;
  /** A held peer run's answer changed (SR-086 G-B2): the trees holding its row are told (`ChildRowsFeed.rowChanged`). */
  summaryChanged(run: RootExecutionIdentity): void;
}>;

/**
 * A run's own state (SR-086 G-A2 … G-A4): the node's answer, the peer node when it did not answer, the run's own status,
 * and how many background tasks its own agents have running (autobyteus-448: the sum; 0 unless answered).
 */
export type RunState = Readonly<{ answer: RunStatusAnswer; node: string | null; status: RunAgentStatus | null; backgroundTasksRunning: number }>;
/** One agent's answer: its status and how many background tasks it has running (autobyteus-448). */
export type RunAgentAnswer = Readonly<{ status: RunAgentStatus; backgroundTasksRunning: number }>;

const STATUSES: readonly RunAgentStatus[] = ["offline", "idle", "error", "initializing", "running"];
const toStatus = (value: unknown): RunAgentStatus => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return (STATUSES as readonly string[]).includes(normalized) ? normalized as RunAgentStatus : "offline";
};
const OFFLINE: RunAgentAnswer = Object.freeze({ status: "offline", backgroundTasksRunning: 0 });
const answerOf = (status: unknown, backgroundTasksRunning: unknown): RunAgentAnswer => Object.freeze({
  status: toStatus(status), backgroundTasksRunning: backgroundTasksRunningOf(backgroundTasksRunning),
});
const answerOfFrame = (message: AgentPresentationMessage): RunAgentAnswer | null =>
  message.type === "AGENT_STATUS" ? answerOf(message.payload.status, message.payload.background_tasks_running) : null;
const keyOf = (ref: Pick<RunStatusRunRef, "kind" | "runId">): string => `${ref.kind}:${ref.runId}`;

type Listener = Readonly<{
  statusChanged(ref: RunStatusRunRef, agentRunId: string, answer: RunAgentAnswer): void;
  stateChanged(ref: RunStatusRunRef, state: RunState): void;
  treeChanged(ref: RunStatusRunRef): void;
}>;

/** One subscribed run: its agents' answers, from the run itself, held while any connection holds it (counted). */
export class RunStatusEntry {
  readonly answers = new Map<string, RunAgentAnswer>();
  readonly listeners = new Set<Listener>();
  holders = 0;
  readonly ready: Promise<void>;
  private closed = false;
  private readonly releases: (() => void)[] = [];
  /** A peer run's observation again, after it ended (Retry, DEC-807 Phase 1); `null` for a local or org run. */
  private observePeer: (() => void) | null = null;
  /** Whether a peer run's observation is open now (it tells the entry when its node goes away). */
  private peerObserved: () => boolean = () => false;
  /** A peer run's node; `null` for a local or org run. */
  private peerNodeId: string | null = null;
  /** A peer run's handle; `null` for a local or org run. */
  private peer: PeerRun | null = null;
  private answer: RunStatusAnswer = "ok";
  private unreachableNode: string | null = null;
  /** The state its listeners were last told (or answered in a snapshot). */
  private told: RunState | null = null;
  /** The Retry in flight: a later Retry joins its answer (SR-090), so several clients make one call to the node. */
  private retrying: Promise<void> | null = null;

  constructor(
    readonly ref: RunStatusRunRef,
    private readonly sources: RunStatusSources,
    /** A peer run's node answered (it is back, CR-461-094): the ended observations of its other runs are observed again. */
    private readonly nodeAnswered: (nodeId: string) => void = () => undefined,
  ) {
    this.ready = this.start().catch((error: unknown) => { console.warn(`Run '${ref.runId}': its statuses could not be followed: ${String(error)}`); });
  }

  close(): void {
    this.closed = true;
    for (const release of this.releases.splice(0)) release();
  }

  /**
   * Retry (autobyteus-278; SR-090): a peer run whose observation ended is observed again (DEC-807 Phase 1: an observation
   * never reconnects alone), and its node is asked again for its answer. One is in flight at a time: a later Retry joins
   * its answer. Once answered, its state is told again, changed or not, so each client's "Checking {node}…" settles.
   */
  retry(): Promise<void> {
    if (!this.peer) return Promise.resolve();
    if (this.retrying) return this.retrying;
    this.observePeer?.();
    const retrying = this.askSummary(this.peer, true).then(() => {
      if (this.retrying === retrying) this.retrying = null;
      if (!this.closed) this.tellState(true);
    });
    this.retrying = retrying;
    return retrying;
  }

  /** Its node is back: an ended observation is observed again (an open one stays as it is). */
  reobserve(): void { this.observePeer?.(); }

  /**
   * Another client now shows this run (CR-461-107): a peer run whose observation ended (its run stopped there) has no
   * way to learn that its node went away since, so its node is asked once for a current answer. It neither observes
   * again nor brings other runs back (no churn, RTP-09).
   */
  refreshEnded(): void {
    if (this.peer && !this.peerObserved() && !this.closed) void this.askSummary(this.peer, false);
  }

  /** The node a peer run runs on; `null` for a run on this node. */
  get nodeId(): string | null { return this.peerNodeId; }

  /**
   * The run's own state (G-A4): an agent run's own agent's status; a Team's or an Org's from its own agents by the one
   * team status rule (base's), on the server, never derived by a client. No status unless the node answered for it.
   * Its background task count: its own agent's, or the sum over a Team's or an Org's own agents (autobyteus-448).
   */
  get state(): RunState {
    if (this.answer !== "ok") return Object.freeze({ answer: this.answer, node: this.unreachableNode, status: null, backgroundTasksRunning: 0 });
    const answers = this.ref.kind === "agent" ? [this.answers.get(this.ref.runId) ?? OFFLINE] : [...this.answers.values()];
    const status = this.ref.kind === "agent" ? answers[0]!.status : foldTeamAggregateStatus(answers.map((agent) => agent.status), "live");
    const backgroundTasksRunning = answers.reduce((sum, agent) => sum + agent.backgroundTasksRunning, 0);
    return Object.freeze({ answer: this.answer, node: this.unreachableNode, status, backgroundTasksRunning });
  }

  /** A peer run's latest answer from its node (G-B2), kept while the run is held; its row's launches come from it. */
  summary: RemoteRunSummaryEvent | null = null;

  /**
   * A peer run's node answered: kept, and its state set. Answers whether its content (title, reachability, launches)
   * changed, and when its state is set (an unreachable node's name is read first).
   */
  private applySummary(summary: RemoteRunSummaryEvent): Readonly<{ changed: boolean; stateSet: Promise<void> }> {
    if (this.closed || !this.peerNodeId || summary.nodeId !== this.peerNodeId) return { changed: false, stateSet: Promise.resolve() };
    const content = (value: RemoteRunSummaryEvent | null) => JSON.stringify(value && [value.title, value.reachable, value.launches]);
    const changed = content(this.summary) !== content(summary);
    this.summary = summary;
    return { changed, stateSet: this.peerAnswered(summary) };
  }

  /** The state as a snapshot answers it: later changes are told against it. */
  stateForSnapshot(): RunState { this.told = this.state; return this.told; }

  /** A peer run's node answered about it (G-A3): reachable, or not, with the node's name. */
  private async peerAnswered(summary: Pick<RemoteRunSummaryEvent, "reachable">): Promise<void> {
    if (this.closed || !this.peerNodeId) return;
    if (summary.reachable) { this.answer = "ok"; this.unreachableNode = null; this.tellState(); return; }
    const nodeId = this.peerNodeId;
    await this.sources.peerNodeName(nodeId).catch(() => nodeId).then((name) => {
      if (this.closed) return;
      this.answer = "unreachable";
      this.unreachableNode = name;
      this.tellState();
    });
  }

  /** Tells its listeners a changed state; `again` tells it unchanged too (a Retry's answer, SR-090). */
  private tellState(again = false): void {
    const state = this.state;
    const told = this.told;
    if (!again && told && told.answer === state.answer && told.node === state.node && told.status === state.status
      && told.backgroundTasksRunning === state.backgroundTasksRunning) return;
    this.told = state;
    for (const listener of [...this.listeners]) listener.stateChanged(this.ref, state);
  }

  private set(agentRunId: string, answer: RunAgentAnswer): void {
    const current = this.answers.get(agentRunId);
    if (this.closed || (current?.status === answer.status && current.backgroundTasksRunning === answer.backgroundTasksRunning)) return;
    this.answers.set(agentRunId, answer);
    for (const listener of [...this.listeners]) listener.statusChanged(this.ref, agentRunId, answer);
    this.tellState();
  }

  private allOffline(): void {
    for (const agentRunId of [...this.answers.keys()]) this.set(agentRunId, OFFLINE);
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
    for (const agent of await this.sources.agentsOf(root)) if (!this.answers.has(agent.agentRunId)) this.answers.set(agent.agentRunId, OFFLINE);
    if (this.closed) return;
    // A run this node has no file of and no root for is not one of its runs (G-A2); its registration answers it later.
    if (this.answers.size === 0 && !this.sources.registrations.resolve(root)) this.answer = "not_found";
    const access = this.sources.agents(kind);
    let observation: RunAgentObservation | null = null;
    let generation = 0;
    const stop = (): void => { generation += 1; observation?.close(); observation = null; };
    const observe = async (): Promise<void> => {
      stop();
      const mine = generation;
      const opened = await access.observeRunAgents(this.ref.runId, (agentRunId, message) => {
        const answer = mine === generation ? answerOfFrame(message) : null;
        if (answer) this.set(agentRunId, answer);
      }, () => { if (mine === generation) { observation = null; this.allOffline(); } });
      if (this.closed || mine !== generation) { opened?.close(); return; }
      observation = opened;
      for (const live of access.runAgentStatuses(this.ref.runId)) this.set(live.agentRunId, answerOf(live.status, live.backgroundTasksRunning));
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
   * agents read offline and its node is asked once for its answer (AR-403), never observed again from there (a node that
   * keeps refusing would loop); Retry, or its node answering another ask, observes it again.
   */
  private startPeer(peer: PeerRun): void {
    this.peerNodeId = peer.link.nodeId;
    this.peer = peer;
    const ids = peer.link.kind === "agent" ? [peer.link.agentRunId] : peer.link.members.map((member) => member.agentRunId);
    for (const agentRunId of ids) this.answers.set(agentRunId, OFFLINE);
    let stream: Readonly<{ close(): void }> | null = null;
    const observe = (): void => {
      if (this.closed || stream) return;
      let current: Readonly<{ close(): void }> | null = null;
      let ended = false;
      const end = (): void => {
        if (stream === current) stream = null;
        this.allOffline();
        if (!this.closed) void this.askSummary(peer, false);
      };
      current = peer.observe({
        onFrame: (agentRunId, message) => {
          const answer = !ended && ids.includes(agentRunId) ? answerOfFrame(message) : null;
          if (answer) this.set(agentRunId, answer);
        },
        onEnd: () => { ended = true; if (current) end(); },
      });
      if (ended || !current) { end(); return; }
      stream = current;
    };
    this.observePeer = observe;
    this.peerObserved = () => stream !== null;
    this.releases.push(() => { this.observePeer = null; stream?.close(); stream = null; });
    observe();
    void this.askSummary(peer, true);
  }

  /**
   * Asks the run's node for its answer: when first held, on Retry and after its observation ended unasked. An answer
   * that reaches it (not after an unasked end) says its node is back.
   */
  private askSummary(peer: PeerRun, nodeBack: boolean): Promise<void> {
    return this.sources.peerSummary(peer).then(async (summary) => {
      if (!summary || this.closed) return;
      const { changed, stateSet } = this.applySummary(summary);
      if (changed) this.sources.summaryChanged({ rootSubjectKind: this.ref.kind, rootRunId: this.ref.runId } as RootExecutionIdentity);
      if (nodeBack && summary.reachable) this.nodeAnswered(peer.link.nodeId);
      await stateSet;
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
   * Retry (`RETRY_PEERS` on `/ws/run-status`, SR-090): these peer runs' ended observations are observed again, and their
   * nodes asked again. A node that answers is back for each of its runs (CR-461-094), so every other ended observation
   * of a run on it follows again too, whichever client asked. Settles when each one's state was told again.
   */
  async retryPeers(peerRunIds: readonly string[]): Promise<void> {
    const ids = new Set(peerRunIds);
    await Promise.all([...this.entries.values()].filter((entry) => ids.has(entry.ref.runId)).map((entry) => entry.retry()));
  }

  private nodeAnswered(nodeId: string): void {
    for (const entry of this.entries.values()) if (entry.nodeId === nodeId) entry.reobserve();
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
    if (!entry) {
      entry = new RunStatusEntry(Object.freeze({ kind: ref.kind, runId: ref.runId }), this.sources, (nodeId) => this.nodeAnswered(nodeId));
      this.entries.set(key, entry);
    } else {
      entry.refreshEnded();
    }
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
    const snapshot: Array<RunStatusRunRef & RunState & { agents: ({ agentRunId: string } & RunAgentAnswer)[] }> = [];
    for (const entry of added) {
      if (this.closed || this.held.get(keyOf(entry.ref)) !== entry) continue;
      entry.listeners.add(this);
      snapshot.push({ ...entry.ref, ...entry.stateForSnapshot(), agents: [...entry.answers].map(([agentRunId, answer]) => ({ agentRunId, ...answer })) });
    }
    if (snapshot.length) this.send({ type: "RUN_STATUS_SNAPSHOT", payload: { runs: snapshot } });
  }

  /** Retry (SR-090): the held peer runs among these run IDs are asked again; a run this client does not hold is not. */
  retry(runIds: readonly string[]): Promise<void> {
    const ids = new Set(runIds);
    return this.service.retryPeers([...this.held.values()].map((entry) => entry.ref.runId).filter((runId) => ids.has(runId)));
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

  statusChanged(ref: RunStatusRunRef, agentRunId: string, answer: RunAgentAnswer): void {
    this.send({ type: "RUN_STATUS_CHANGED", payload: { ...ref, agentRunId, ...answer } });
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
