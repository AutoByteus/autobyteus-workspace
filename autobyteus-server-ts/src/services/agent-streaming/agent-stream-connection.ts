import type { SnapshotConnection } from "../../utils/snapshot-barrier.js";
import type { AgentStreamFrame, AgentStreamSequence } from "./agent-stream-sequence.js";
import {
  activeRunSnapshot,
  agentStreamSnapshotMessage,
  storedRunSnapshot,
  type AgentStreamSnapshotPayload,
  type ReadInputState,
  type ReadStoredRun,
} from "./agent-stream-snapshot.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

/**
 * One session's connection to an active run's own stream (autobyteus-461 SR-087): the snapshot, then the frames
 * after its base, in order. It starts with the base in one synchronous step (the sequence's barrier), so nothing is
 * lost or doubled. Returns its close; a failed read is reported to `onFailure` and sends nothing.
 */
export const connectToActiveRun = (input: Readonly<{
  sequence: AgentStreamSequence;
  sink: AgentStreamServerMessageSink;
  readStored: ReadStoredRun;
  /** The bound run's current input state, carried by the snapshot (autobyteus-540 D-8). */
  readInputState: ReadInputState;
  onFailure: (error: unknown) => void;
}>): (() => void) => {
  let closed = false;
  let connection: SnapshotConnection<AgentStreamSnapshotPayload, AgentStreamFrame> | null = null;
  let unsubscribe: () => void = () => undefined;
  void input.sequence.connect((base) => activeRunSnapshot(input.sequence, base, input.readStored, input.readInputState)).then((opened) => {
    if (closed) { opened.close(); return; }
    connection = opened;
    input.sink.send(agentStreamSnapshotMessage(opened.snapshot));
    unsubscribe = opened.subscribe((frame) => input.sink.send(frame.message));
  }, (error: unknown) => {
    if (!closed) input.onFailure(error);
  });
  return () => {
    closed = true;
    connection?.close();
    unsubscribe();
  };
};

/** A session of a stopped run (or one with no active sequence): its full stored conversation, with no frames. */
export const sendStoredSnapshot = async (input: Readonly<{
  runId: string;
  sink: AgentStreamServerMessageSink;
  readStored: ReadStoredRun;
  isCurrent: () => boolean;
}>): Promise<void> => {
  const snapshot = await storedRunSnapshot(input.runId, input.readStored);
  if (input.isCurrent()) input.sink.send(agentStreamSnapshotMessage(snapshot));
};
