import { describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { AgentStreamSequences } from "../../../src/services/agent-streaming/agent-stream-sequence.js";
import { observePeerAgentStream, peerAgentStreamSnapshot, type PeerAgentStreamFrame } from "../../../src/remote-collaboration/inbound/peer-agent-stream.js";

/**
 * autobyteus-461 SR-088, SR-089 (ARCH-REV-064, -065): node B serves any of its agents' own stream to the peer that started
 * its run, a peer team's coordinator and members included: its snapshot by 3b's rule, and its numbered frames, following
 * it across a restore (a new `liveSequenceId`). Its delegator on node A may be stopped: nothing here depends on it.
 */
const fakeRun = (runId: string) => {
  const listeners = new Set<(event: unknown) => void>();
  return {
    run: { runId, config: { memoryDir: null }, subscribeToEvents: (listener: (event: unknown) => void) => { listeners.add(listener); return () => listeners.delete(listener); } },
    emit: (event: AgentRunEvent) => listeners.forEach((listener) => listener(event)),
  };
};
const segment = (runId: string, turnId: string, delta: string): AgentRunEvent[] => [
  { runId, eventType: AgentRunEventType.SEGMENT_START, payload: { id: `${turnId}-s`, turn_id: turnId, segment_type: "text" }, statusHint: null, occurredAt: 1795452909697 },
  { runId, eventType: AgentRunEventType.SEGMENT_CONTENT, payload: { id: `${turnId}-s`, turn_id: turnId, segment_type: "text", delta }, statusHint: null, occurredAt: 1795452909697 },
];
const stored = (agentRunId: string) => async () => ({ agentRunId, conversation: [{ kind: "message", role: "user", content: "the task" }],
  activities: [], summary: null, lastActivityAt: null, hasEarlierActiveTraceEvents: false });
const recorder = { whenPersisted: async () => undefined };

describe("node B's agent stream for the peer that started its run", () => {
  it("serves a peer team's coordinator and member: each snapshot, then each live frame once", async () => {
    const sequences = new AgentStreamSequences();
    const coordinator = fakeRun("coordinator-b"), member = fakeRun("member-b");
    sequences.attachToRun(coordinator.run as never, recorder);
    sequences.attachToRun(member.run as never, recorder);
    coordinator.emit(segment("coordinator-b", "t1", "planning ")[0]!);
    const frames: PeerAgentStreamFrame[] = [];
    const observations = ["coordinator-b", "member-b"].map((id) => observePeerAgentStream(sequences, id, (frame) => frames.push(frame)));
    const coordinatorSnapshot = await peerAgentStreamSnapshot(sequences, "coordinator-b", stored("coordinator-b"));
    const memberSnapshot = await peerAgentStreamSnapshot(sequences, "member-b", stored("member-b"));
    expect(coordinatorSnapshot).toMatchObject({ base_sequence: 1, turn_frames: [{ type: "SEGMENT_START", sequence: 1 }],
      stored: { conversation: [{ content: "the task" }] } });
    // autobyteus-540 D-8: the relay has no input-state read, so the peer's page settles a lost send as unknown.
    expect(coordinatorSnapshot.input_state).toBeNull();
    expect(memberSnapshot).toMatchObject({ base_sequence: 0, turn_frames: [] });
    coordinator.emit(segment("coordinator-b", "t1", "planning ")[1]!);
    segment("member-b", "t2", "building").forEach((event) => member.emit(event));
    expect(frames.map((frame) => [frame.agentRunId, frame.frame.type, frame.frame.sequence])).toEqual([
      ["coordinator-b", "SEGMENT_CONTENT", 2], ["member-b", "SEGMENT_START", 1], ["member-b", "SEGMENT_CONTENT", 2]]);
    observations.forEach((observation) => observation.close());
  });

  it("follows an agent across a stop and a restore: its frames name the new sequence; a stopped agent's snapshot is its stored read", async () => {
    const sequences = new AgentStreamSequences();
    const first = fakeRun("member-b");
    const detach = sequences.attachToRun(first.run as never, recorder);
    const frames: PeerAgentStreamFrame[] = [];
    const observation = observePeerAgentStream(sequences, "member-b", (frame) => frames.push(frame));
    first.emit(segment("member-b", "t1", "a")[0]!);
    const firstSequence = frames[0]!.liveSequenceId;
    detach();
    expect(await peerAgentStreamSnapshot(sequences, "member-b", stored("member-b"))).toMatchObject({ live_sequence_id: null, input_state: null, turn_frames: [], base_sequence: 0 });
    const restored = fakeRun("member-b");
    sequences.attachToRun(restored.run as never, recorder);
    restored.emit(segment("member-b", "t2", "b")[0]!);
    expect(frames).toHaveLength(2);
    expect(frames[1]!.liveSequenceId).not.toBe(firstSequence);
    expect(frames[1]!.frame.sequence).toBe(1);
    observation.close();
    restored.emit(segment("member-b", "t2", "b")[1]!);
    expect(frames).toHaveLength(2);
  });
});
