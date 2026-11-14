import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import type { RunAgentStatus, RunStatusRunRef, RunStatusServerMessage } from "@autobyteus/collaboration-stream-contracts";
import type { RootExecutionIdentity } from "./domain/root-execution-identity.js";
import type { ActiveCollaborationRootDirectory } from "./services/active-collaboration-root-directory.js";
import type { PairedAgentAccess, PairedAgentObservation } from "./remote/paired-agent-access.js";
import type { PeerRun, PeerRunOf } from "./remote/peer-runs.js";

/** Where a run's statuses come from: the run itself (its own root, or its peer's handle), never its delegator. */
export type RunStatusSources = Readonly<{
  /** A local run's own agents: their live statuses and changes, while its root runs. */
  agents(kind: "agent" | "agent_team"): Pick<PairedAgentAccess, "observePairedAgents" | "pairedAgentStatuses">;
  /** Whether a run's root runs, and when that changes. */
  registrations: Pick<ActiveCollaborationRootDirectory, "onRegistrationChanged" | "resolve">;
  /** A local run's agents, from its own file (offline until its root says otherwise). */
  agentsOf(run: RootExecutionIdentity): Promise<readonly Readonly<{ agentRunId: string }>[]>;
  /** The handle of a run on a peer node, by its ID; `null` for a local run. */
  peerRunOf: PeerRunOf;
}>;

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

  constructor(readonly ref: RunStatusRunRef, private readonly sources: RunStatusSources) {
    this.ready = this.start().catch((error: unknown) => { console.warn(`Run '${ref.runId}': its statuses could not be followed: ${String(error)}`); });
  }

  close(): void {
    this.closed = true;
    for (const release of this.releases.splice(0)) release();
  }

  private set(agentRunId: string, status: RunAgentStatus): void {
    if (this.closed || this.answers.get(agentRunId) === status) return;
    this.answers.set(agentRunId, status);
    for (const listener of [...this.listeners]) listener.statusChanged(this.ref, agentRunId, status);
  }

  private allOffline(): void {
    for (const agentRunId of [...this.answers.keys()]) this.set(agentRunId, "offline");
  }

  /** An org run's own agents are its own stream's; it is held for its rows' notices only. */
  private async start(): Promise<void> {
    if (this.ref.kind === "agent_org") return;
    const peer = this.sources.peerRunOf(this.ref.runId);
    if (peer) { this.startPeer(peer); return; }
    await this.startLocal(this.ref.kind);
  }

  /**
   * A local run: its agents are offline until its root runs; while it runs, its own root's statuses. The listener is
   * attached first and the current statuses read after it, so no change falls between them; a restore observes again.
   */
  private async startLocal(kind: "agent" | "agent_team"): Promise<void> {
    const root: RootExecutionIdentity = { rootSubjectKind: kind, rootRunId: this.ref.runId } as RootExecutionIdentity;
    for (const agent of await this.sources.agentsOf(root)) if (!this.answers.has(agent.agentRunId)) this.answers.set(agent.agentRunId, "offline");
    if (this.closed) return;
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
      if (registered) void observe().catch((error: unknown) => console.warn(`Run '${this.ref.runId}': its statuses could not be followed: ${String(error)}`));
      else { stop(); this.allOffline(); }
    }), stop);
    if (this.sources.registrations.resolve(root)) await observe();
  }

  /** A peer run: its handle's own observation, shared by every subscriber (one entry per run); offline when it ends. */
  private startPeer(peer: PeerRun): void {
    const ids = peer.link.kind === "agent" ? [peer.link.agentRunId] : peer.link.members.map((member) => member.agentRunId);
    for (const agentRunId of ids) this.answers.set(agentRunId, "offline");
    const stream = peer.observe({
      onFrame: (agentRunId, message) => {
        const status = ids.includes(agentRunId) ? statusOfFrame(message) : null;
        if (status) this.set(agentRunId, status);
      },
      onEnd: () => this.allOffline(),
    });
    if (stream) this.releases.push(() => stream.close());
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
    const snapshot: Array<RunStatusRunRef & { agents: { agentRunId: string; status: RunAgentStatus }[] }> = [];
    for (const entry of added) {
      if (this.closed || this.held.get(keyOf(entry.ref)) !== entry) continue;
      entry.listeners.add(this);
      snapshot.push({ ...entry.ref, agents: [...entry.answers].map(([agentRunId, status]) => ({ agentRunId, status })) });
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

  treeChanged(ref: RunStatusRunRef): void {
    this.send({ type: "RUN_TREE_CHANGED", payload: { ...ref } });
  }

  private drop(entry: RunStatusEntry): void {
    entry.listeners.delete(this);
    this.service.release(entry);
  }
}
