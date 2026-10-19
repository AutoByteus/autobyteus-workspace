import type {
  AgentStreamEgressForward,
  AgentStreamEgressScheduler,
  StreamEgressMessage,
} from "./agent-stream-egress-control.js";
import type { SequencedStreamShape } from "./sequenced-stream-shape.js";
import { cloneStreamPayload, streamPayloadsEqual } from "./stream-payload-equality.js";

/** Unsequenced messages that may pass a pending batch: they carry no root sequence. */
const UNSEQUENCED_COMPANION_TYPES = new Set<string>(["CONNECTED", "AGENT_COMMAND_ACK"]);

type PendingBatch<I> = {
  first: number;
  through: number;
  /** One aggregate per content identity, in order of first appearance. */
  aggregates: Map<string, { item: I; text: string }>;
};

export type SequencedContentCadenceSchedulerOptions = {
  readIntervalMs: () => number;
  onScheduledError: (error: unknown) => void;
};

/**
 * Content cadence for a sequenced stream (Team, Org, delegated agents). Clients require every root
 * sequence exactly once and in order, so coalesced text leaves as one batch frame that covers the
 * contiguous range of everything it absorbed, and no sequenced message overtakes a pending batch.
 *
 * `accept`, in order:
 * 1. an unsequenced companion is forwarded without flushing;
 * 2. a sequenced message that does not continue the pending range flushes the batch first;
 * 3. content (any identity) joins the pending batch; the first one opens the window timer;
 * 4. a status identical to the last status this connection forwarded or absorbed for that agent
 *    run is absorbed into the pending batch's range;
 * 5. anything else flushes the batch, then is forwarded.
 */
export class SequencedContentCadenceScheduler<M extends StreamEgressMessage, I>
implements AgentStreamEgressScheduler<M> {
  private pending: PendingBatch<I> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly lastStatusByAgentRun = new Map<string, unknown>();
  private disposed = false;

  constructor(
    private readonly shape: SequencedStreamShape<M, I>,
    private readonly options: SequencedContentCadenceSchedulerOptions,
  ) {}

  accept(message: M, forward: AgentStreamEgressForward<M>): void {
    if (this.disposed) return;
    if (UNSEQUENCED_COMPANION_TYPES.has(message.type)) {
      forward(message);
      return;
    }
    const sequence = this.shape.sequenceOf(message);
    if (this.pending && sequence !== null && sequence !== this.pending.through + 1) this.flush(forward);
    if (sequence !== null) {
      const content = this.shape.contentOf(message);
      if (content) {
        this.addContent(sequence, content.identityKey, content.item, content.delta, forward);
        return;
      }
    }
    const status = this.shape.statusOf(message);
    if (status && this.pending && sequence !== null && this.isRepeat(status.agentRunId, status.comparable)) {
      this.pending.through = sequence;
      return;
    }
    this.flush(forward);
    if (this.shape.isSnapshot(message)) this.lastStatusByAgentRun.clear();
    forward(message);
    if (status) this.lastStatusByAgentRun.set(status.agentRunId, cloneStreamPayload(status.comparable));
  }

  flush(forward: AgentStreamEgressForward<M>): void {
    this.cancelTimer();
    const batch = this.pending;
    this.pending = null;
    if (!batch) return;
    forward(this.shape.buildBatch(batch.first, batch.through, [...batch.aggregates.values()]));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelTimer();
    this.pending = null;
    this.lastStatusByAgentRun.clear();
  }

  private addContent(
    sequence: number,
    identityKey: string,
    item: I,
    delta: string,
    forward: AgentStreamEgressForward<M>,
  ): void {
    const batch = this.pending ?? (this.pending = { first: sequence, through: sequence, aggregates: new Map() });
    batch.through = sequence;
    const aggregate = batch.aggregates.get(identityKey);
    if (aggregate) aggregate.text += delta;
    else batch.aggregates.set(identityKey, { item, text: delta });
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      try {
        this.flush(forward);
      } catch (error) {
        this.options.onScheduledError(error);
      }
    }, this.options.readIntervalMs());
  }

  private isRepeat(agentRunId: string, comparable: unknown): boolean {
    return this.lastStatusByAgentRun.has(agentRunId)
      && streamPayloadsEqual(this.lastStatusByAgentRun.get(agentRunId), comparable);
  }

  private cancelTimer(): void {
    if (this.flushTimer === null) return;
    clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }
}
