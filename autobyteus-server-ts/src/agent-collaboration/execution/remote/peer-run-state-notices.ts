import { taskExecutionReferenceKey } from "@autobyteus/collaboration-stream-contracts";
import type { TaskExecutionReference } from "../task/task-execution-reference.js";
import { REMOTE_REFUSAL } from "./remote-refusal-codes.js";
import type { RemoteRunChannel, RemoteStartedRunRef } from "./remote-run-channel.js";

/** A run on a peer node, by its identity and its node. */
export type PeerRunOnNode = Readonly<{ run: TaskExecutionReference; nodeId: string }>;
/** What the Task side, the owner of the entries, gives the notices (DN-1, DN-3). */
export type PeerNoticeTaskSide = Readonly<{
  /** Open while any open Task entry names the run on this node: the state to send, read at send time. */
  isOpen(run: TaskExecutionReference): boolean;
  setPeerNoticeOwed(run: TaskExecutionReference, owed: boolean): Promise<void>;
  owedPeerNotices(): readonly PeerRunOnNode[];
}>;
/** `confirmed`: the run's node holds the run's state on this node. Otherwise the reason it does not (yet). */
export type PeerNoticeOutcome = Readonly<{ confirmed: true }> | Readonly<{ confirmed: false; code: string; message: string }>;

/** The peer's 30 s retry while it has owed notices (REQ-002's bound). */
export const PEER_NOTICE_RETRY_MS = 30_000;
/** A state that changes again while its notice is in flight is sent again at once, this often at most per turn. */
const SENDS_PER_TURN = 3;
/**
 * Nothing to stop there: no such run, not this node's delegation, or a node that is no longer a peer (on either side). The
 * notice is dropped (DN-4). A peer to pair again keeps it owed.
 */
const DROPPED = new Set<string>([REMOTE_REFUSAL.TARGET_NOT_FOUND, REMOTE_REFUSAL.TARGET_NOT_PERMITTED, REMOTE_REFUSAL.PEER_NOT_REGISTERED]);
const CONFIRMED: PeerNoticeOutcome = Object.freeze({ confirmed: true });
const startedRunOf = (run: TaskExecutionReference): RemoteStartedRunRef => "agentRunId" in run
  ? { kind: "agent", runId: run.agentRunId } : { kind: "agent_team", runId: run.teamRunId };

/**
 * autobyteus-591 DN-1, DN-1b, DN-4: the one owner on this node of what a run's node is told about the run's delegation
 * state. The state is open while an open Task entry names the run here, closed otherwise; its node stops a closed run and
 * keeps it out of its run list. Per run, one ordered sequence: at most one notice in flight, the state read when it is
 * sent, the next sent after the previous answer. A notice is owed (persisted on the run's Task entries) from the change
 * until its node confirms the run's current state; owed notices are sent again on their peer's 30 s timer, also after a
 * restart. No heartbeat: a peer is only tried while it has owed notices.
 */
export class PeerRunStateNotices {
  private readonly sequences = new Map<string, Promise<unknown>>();
  /** Per peer node: its owed runs, by run key. */
  private readonly owed = new Map<string, Map<string, PeerRunOnNode>>();
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly retrying = new Set<string>();
  /** Per run: the code its last unconfirmed send was logged with (a retry logs only a new reason). */
  private readonly lastFailure = new Map<string, string>();
  private closed = false;

  constructor(private readonly dependencies: Readonly<{
    /** This node's channel to its peers; `null` on a host without peers, where nothing is sent and no timer runs. */
    channel: () => Pick<RemoteRunChannel, "deliveredRunState"> | null;
    tasks: PeerNoticeTaskSide;
    retryMs?: number;
  }>) {}

  /** Start-up (S-3): the owed notices the loaded Task entries name; each peer's timer sends them. */
  start(): void {
    for (const peerRun of this.dependencies.tasks.owedPeerNotices()) this.addOwed(peerRun);
  }

  /**
   * The run's Task entries changed (a closure, or a re-delegation's committed entry): its state is owed to its node, and
   * sent in the run's turn, after any notice in flight. Resolves once its node confirmed the run's current state, or with
   * why not (the notice stays owed); it never rejects. A re-delegation delivers its work after a confirmation (DN-8).
   */
  async changed(peerRun: PeerRunOnNode): Promise<PeerNoticeOutcome> {
    try { await this.dependencies.tasks.setPeerNoticeOwed(peerRun.run, true); }
    catch (error) { console.error("TASK_PEER_NOTICE_NOT_RECORDED", { ...this.logOf(peerRun), error: messageOf(error) }); }
    this.addOwed(peerRun);
    return this.inTurn(peerRun);
  }

  /** Stops the retry timers (shutdown). */
  close(): void {
    this.closed = true;
    for (const timer of this.timers.values()) clearInterval(timer);
    this.timers.clear();
  }

  private inTurn(peerRun: PeerRunOnNode): Promise<PeerNoticeOutcome> {
    const key = taskExecutionReferenceKey(peerRun.run);
    const next = (this.sequences.get(key) ?? Promise.resolve()).catch(() => undefined).then(() => this.send(peerRun, key));
    const settled = next.then(() => undefined, () => undefined);
    this.sequences.set(key, settled);
    void settled.then(() => { if (this.sequences.get(key) === settled) this.sequences.delete(key); });
    return next.catch((error: unknown) => ({ confirmed: false as const, code: "TASK_PEER_NOTICE_FAILED", message: messageOf(error) }));
  }

  /** One turn: sends the owed state, read now, again while it changes in flight; nothing owed is already confirmed. */
  private async send(peerRun: PeerRunOnNode, key: string): Promise<PeerNoticeOutcome> {
    for (let attempt = 0; attempt < SENDS_PER_TURN; attempt += 1) {
      if (!this.owed.get(peerRun.nodeId)?.has(key)) return CONFIRMED;
      const channel = this.dependencies.channel();
      if (!channel) return { confirmed: false, code: REMOTE_REFUSAL.OFF, message: "This node has no channel to its peers; the run's node is told once it has." };
      const open = this.dependencies.tasks.isOpen(peerRun.run);
      const receipt = await channel.deliveredRunState(peerRun.nodeId, startedRunOf(peerRun.run), open);
      if (receipt.accepted) {
        // A change committed while the notice was in flight, or while its mark was cleared, is sent in this turn (DN-1).
        if (this.dependencies.tasks.isOpen(peerRun.run) !== open) continue;
        if (!await this.cleared(peerRun)) return { confirmed: false, code: "TASK_PEER_NOTICE_NOT_CLEARED", message: "The run's node was told, but this node could not record it; it is told again shortly." };
        if (this.dependencies.tasks.isOpen(peerRun.run) !== open) {
          await this.dependencies.tasks.setPeerNoticeOwed(peerRun.run, true).catch(() => undefined);
          continue;
        }
        this.settle(peerRun, key, "TASK_PEER_NOTICE_CONFIRMED", { open });
        return CONFIRMED;
      }
      if (DROPPED.has(receipt.code)) {
        if (await this.cleared(peerRun)) this.settle(peerRun, key, "TASK_PEER_NOTICE_DROPPED", { open, code: receipt.code, reason: receipt.message });
      } else if (this.lastFailure.get(key) !== receipt.code) {
        this.lastFailure.set(key, receipt.code);
        console.warn("TASK_PEER_NOTICE_OWED", { ...this.logOf(peerRun), open, code: receipt.code, reason: receipt.message });
      }
      return { confirmed: false, code: receipt.code, message: receipt.message };
    }
    return { confirmed: false, code: "TASK_PEER_NOTICE_CHANGING", message: "The run's Task changed again while its node was being told; it is told again shortly." };
  }

  /** The run's owed marks are cleared; a failed clear keeps the notice owed (sent again). */
  private async cleared(peerRun: PeerRunOnNode): Promise<boolean> {
    try {
      await this.dependencies.tasks.setPeerNoticeOwed(peerRun.run, false);
      return true;
    } catch (error) {
      console.error("TASK_PEER_NOTICE_NOT_CLEARED", { ...this.logOf(peerRun), error: messageOf(error) });
      return false;
    }
  }

  /** Nothing is owed for the run any more (its marks were cleared). */
  private settle(peerRun: PeerRunOnNode, key: string, event: string, detail: Record<string, unknown>): void {
    const runs = this.owed.get(peerRun.nodeId);
    runs?.delete(key);
    this.lastFailure.delete(key);
    if (runs?.size === 0) this.stopRetrying(peerRun.nodeId);
    (event === "TASK_PEER_NOTICE_DROPPED" ? console.warn : console.info)(event, { ...this.logOf(peerRun), ...detail });
  }

  private addOwed(peerRun: PeerRunOnNode): void {
    const runs = this.owed.get(peerRun.nodeId) ?? new Map<string, PeerRunOnNode>();
    runs.set(taskExecutionReferenceKey(peerRun.run), peerRun);
    this.owed.set(peerRun.nodeId, runs);
    if (this.closed || this.timers.has(peerRun.nodeId) || !this.dependencies.channel()) return;
    const timer = setInterval(() => void this.retry(peerRun.nodeId), this.dependencies.retryMs ?? PEER_NOTICE_RETRY_MS);
    timer.unref?.();
    this.timers.set(peerRun.nodeId, timer);
  }

  /** The peer's owed runs, one request per run, in turn; a tick while the previous one still sends is skipped. */
  private async retry(nodeId: string): Promise<void> {
    if (this.retrying.has(nodeId)) return;
    this.retrying.add(nodeId);
    try {
      for (const peerRun of [...this.owed.get(nodeId)?.values() ?? []]) await this.inTurn(peerRun);
    } finally {
      this.retrying.delete(nodeId);
    }
  }

  private stopRetrying(nodeId: string): void {
    this.owed.delete(nodeId);
    const timer = this.timers.get(nodeId);
    if (timer) clearInterval(timer);
    this.timers.delete(nodeId);
  }

  private logOf({ run, nodeId }: PeerRunOnNode): Record<string, unknown> {
    return { execution: run, nodeId };
  }
}

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
