import { agentInputStateSchema, type AgentInputStateDto } from '@autobyteus/agent-presentation-contracts';
import type { RunProjectionPayload } from '~/services/runHydration/runStoredStateLoader';
import type { SegmentContentPayload, ServerMessage } from './messageTypes';
import { parseServerMessage, validateCanonicalBoundary } from './messageParser';

/** A frame of an agent run's own stream carries its number in the run's sequence (autobyteus-461 SR-087). */
export type NumberedFrame = Readonly<{ sequence: number; sequence_through?: number }>;

/**
 * The run's snapshot: its stored part, its unconfirmed turns' frames (replayed through the stream handlers), the base
 * and the sequence it names (null: a stopped run, whose stored part is its whole conversation and which has no frames).
 */
export interface AgentStreamSnapshotPayload {
  stored: RunProjectionPayload;
  /** The run's current input state, or null when the node cannot tell it (a stopped run, a peer's relay; autobyteus-540 D-8). */
  input_state: AgentInputStateDto | null;
  turn_frames: Array<ServerMessage & NumberedFrame>;
  base_sequence: number;
  live_sequence_id: string | null;
}

/** What `/ws/agent` sends: the run's messages (numbered when they are frames of its stream), its snapshot, content batches. */
export type AgentStreamWireMessage =
  | (ServerMessage & Partial<NumberedFrame>)
  | { type: 'AGENT_STREAM_SNAPSHOT'; payload: AgentStreamSnapshotPayload }
  | ({ type: 'SEGMENT_CONTENT_BATCH'; payload: { items: SegmentContentPayload[] } } & NumberedFrame);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const isSequence = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;

/** Parses one `/ws/agent` message; every frame (a snapshot's turn frames too) passes the canonical boundary checks. */
export const parseAgentStreamMessage = (raw: string): AgentStreamWireMessage => {
  const data = JSON.parse(raw) as unknown;
  if (!isRecord(data) || typeof data.type !== 'string') return parseServerMessage(raw);
  if (data.type === 'AGENT_STREAM_SNAPSHOT') {
    const payload = data.payload;
    if (!isRecord(payload) || !isRecord(payload.stored) || !Array.isArray(payload.turn_frames)
      || !isSequence(payload.base_sequence) || !(payload.live_sequence_id === null || typeof payload.live_sequence_id === 'string')) {
      throw new Error('Invalid AGENT_STREAM_SNAPSHOT payload');
    }
    if (payload.input_state !== null) agentInputStateSchema.parse(payload.input_state);
    for (const frame of payload.turn_frames) {
      if (!isRecord(frame) || typeof frame.type !== 'string' || !isSequence(frame.sequence)) throw new Error('Invalid snapshot turn frame');
      validateCanonicalBoundary(frame.type, frame.payload);
    }
    return data as unknown as AgentStreamWireMessage;
  }
  if (data.type === 'SEGMENT_CONTENT_BATCH') {
    const payload = data.payload;
    if (!isRecord(payload) || !Array.isArray(payload.items) || !isSequence(data.sequence)
      || !isSequence(data.sequence_through) || data.sequence_through < data.sequence) {
      throw new Error('Invalid SEGMENT_CONTENT_BATCH');
    }
    for (const item of payload.items) validateCanonicalBoundary('SEGMENT_CONTENT', item);
    return data as unknown as AgentStreamWireMessage;
  }
  const message = parseServerMessage(raw) as AgentStreamWireMessage;
  if (hasOwnSequence(data) && !isSequence(data.sequence)) throw new Error('Invalid frame sequence');
  return message;
};

const hasOwnSequence = (data: Record<string, unknown>): boolean => Object.prototype.hasOwnProperty.call(data, 'sequence');
