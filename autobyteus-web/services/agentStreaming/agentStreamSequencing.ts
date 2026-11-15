import type { ServerMessage } from './protocol';
import type { AgentStreamWireMessage } from './protocol/agentStreamEnvelope';

/** What a numbered frame means for the view: its messages to apply, nothing (already applied), or a gap (reopen). */
export type FrameAdmission =
  | Readonly<{ kind: 'apply'; messages: readonly ServerMessage[] }>
  | Readonly<{ kind: 'skip' }>
  | Readonly<{ kind: 'gap'; reason: string }>;

/**
 * The client's place in an agent run's own stream (autobyteus-461 SR-087): the snapshot sets it at its base; each
 * numbered frame after it must continue it. A content batch covers a range of frames and expands to its messages.
 */
export class AgentStreamSequencing {
  private last: number | null = null;
  private liveSequenceId: string | null = null;

  /** A snapshot: frames continue from its base, in its sequence (a stopped run's has none: nothing follows). */
  reset(baseSequence: number, liveSequenceId: string | null): void {
    this.liveSequenceId = liveSequenceId;
    this.last = liveSequenceId === null ? null : baseSequence;
  }

  /** The stream closed: the next connection starts from its own snapshot. */
  clear(): void {
    this.last = null;
    this.liveSequenceId = null;
  }

  get sequenceId(): string | null { return this.liveSequenceId; }

  admit(message: Exclude<AgentStreamWireMessage, { type: 'AGENT_STREAM_SNAPSHOT' }> & { sequence: number }): FrameAdmission {
    if (this.last === null) return { kind: 'gap', reason: `Agent stream frame ${message.sequence} arrived before its snapshot.` };
    const through = message.type === 'SEGMENT_CONTENT_BATCH' ? message.sequence_through ?? message.sequence : message.sequence;
    if (through <= this.last) return { kind: 'skip' };
    if (message.sequence !== this.last + 1) {
      return { kind: 'gap', reason: `Agent stream sequence gap: expected ${this.last + 1}, received ${message.sequence}.` };
    }
    this.last = through;
    if (message.type === 'SEGMENT_CONTENT_BATCH') {
      return { kind: 'apply', messages: message.payload.items.map((payload) => ({ type: 'SEGMENT_CONTENT' as const, payload })) };
    }
    return { kind: 'apply', messages: [message as ServerMessage] };
  }
}
