import { describe, expect, it } from "vitest";
import { AgentRunEventType, type AgentRunEvent } from "../../../../src/agent-execution/domain/agent-run-event.js";
import { AgentStreamSequence } from "../../../../src/services/agent-streaming/agent-stream-sequence.js";
import { activeRunSnapshot, storedRunSnapshot } from "../../../../src/services/agent-streaming/agent-stream-snapshot.js";
import { getAgentRunEventMessageMapper } from "../../../../src/services/agent-streaming/agent-run-event-message-mapper.js";
import { buildRunProjectionBundle } from "../../../../src/run-history/projection/run-projection-utils.js";
import type { RunProjectionConversationEntry } from "../../../../src/run-history/projection/run-projection-types.js";

const RUN = "run-1";
const event = (eventType: AgentRunEventType, payload: Record<string, unknown>): AgentRunEvent =>
  ({ runId: RUN, eventType, payload, statusHint: null });
const segment = (turnId: string, id: string, segmentType = "text") => [
  event(AgentRunEventType.SEGMENT_START, { id, turn_id: turnId, segment_type: segmentType }),
  event(AgentRunEventType.SEGMENT_CONTENT, { id, turn_id: turnId, segment_type: segmentType, delta: `${id}-text` }),
  event(AgentRunEventType.SEGMENT_END, { id, turn_id: turnId }),
];
const completed = (turnId: string) => event(AgentRunEventType.TURN_COMPLETED, { turn_id: turnId });
const stored = (turnId: string | null, content: string, kind = "message"): RunProjectionConversationEntry =>
  ({ kind, role: kind === "message" ? "assistant" : null, content, ...(turnId ? { turnId } : {}) });

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
};

/**
 * A run with its memory (the stored entries as the projection reads them), its sequence and its writer's queue. A turn's
 * records are written when the test says, as the native settle or the external recorder's queue would write them.
 */
const harness = (options: { predating?: string[]; memory?: RunProjectionConversationEntry[] } = {}) => {
  const memory = [...(options.memory ?? [])];
  const persisted: ReturnType<typeof deferred>[] = [];
  const mapper = getAgentRunEventMessageMapper();
  const sequence = new AgentStreamSequence(RUN, {
    storedTurnIds: () => new Set(options.predating ?? []),
    whenPersisted: () => { const next = deferred(); persisted.push(next); return next.promise; },
    map: (runEvent) => mapper.map(runEvent),
  });
  sequence.recordPredating();
  let duringRead: () => void = () => undefined;
  const readStored = async (runId: string) => {
    duringRead();
    return buildRunProjectionBundle(runId, [...memory], []);
  };
  const snapshot = async () => {
    const connection = await sequence.connect((base) => activeRunSnapshot(sequence, base, readStored, null));
    const after: unknown[] = [];
    connection.subscribe((frame) => after.push(frame.message.toJSON()));
    return { ...connection.snapshot, after };
  };
  /** How many sources carry the turn: its stored entries, its replayed frames, its frames after the base. */
  const sourcesOf = (result: Awaited<ReturnType<typeof snapshot>>, turnId: string) => [
    result.stored.conversation.some((entry) => entry.turnId === turnId),
    result.turn_frames.some((frame) => (frame.payload as { turn_id?: string }).turn_id === turnId),
    (result.after as { payload: { turn_id?: string } }[]).some((frame) => frame.payload.turn_id === turnId),
  ].filter(Boolean).length;
  return {
    sequence, memory, persisted, snapshot, sourcesOf,
    emit: (...events: AgentRunEvent[]) => events.forEach((runEvent) => sequence.accept(runEvent)),
    onRead: (work: () => void) => { duringRead = work; },
  };
};
const settle = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };

/** autobyteus-461 SR-087: each turn of an agent run's own stream comes from one source, never two, and is never lost. */
describe("AgentStreamSequence snapshot", () => {
  it("a segment closed before the base but not yet written appears once, from the turn's frames (native order)", async () => {
    const run = harness();
    run.emit(...segment("t1", "s1"));
    const result = await run.snapshot();
    expect(run.sourcesOf(result, "t1")).toBe(1);
    expect(result.turn_frames.map((frame) => frame.type)).toEqual(["SEGMENT_START", "SEGMENT_CONTENT", "SEGMENT_END"]);
    expect(result.base_sequence).toBe(3);
  });

  it("a completed turn still in the external writer's queue appears once, from its frames", async () => {
    const run = harness();
    run.emit(...segment("t1", "s1"), completed("t1"));
    run.memory.push(stored("t1", "partly written"));
    const result = await run.snapshot();
    expect(run.sourcesOf(result, "t1")).toBe(1);
    expect(result.stored.conversation).toEqual([]);
  });

  it("a segment written during the read appears once: its turn is unconfirmed at the base", async () => {
    const run = harness();
    run.emit(...segment("t1", "s1"));
    run.onRead(() => run.memory.push(stored("t1", "s1-text")));
    const result = await run.snapshot();
    expect(run.sourcesOf(result, "t1")).toBe(1);
  });

  it("reasoning flushed while still open at a tool boundary appears once", async () => {
    const run = harness();
    run.emit(
      event(AgentRunEventType.SEGMENT_START, { id: "r1", turn_id: "t1", segment_type: "reasoning" }),
      event(AgentRunEventType.SEGMENT_CONTENT, { id: "r1", turn_id: "t1", segment_type: "reasoning", delta: "thinking" }),
      event(AgentRunEventType.SEGMENT_START, { id: "tool-1", turn_id: "t1", segment_type: "tool_call" }),
    );
    run.memory.push(stored("t1", "thinking", "reasoning"));
    const result = await run.snapshot();
    expect(run.sourcesOf(result, "t1")).toBe(1);
    expect(result.stored.conversation).toEqual([]);
  });

  it("a turn confirmed during the read appears once: it is not in the base's confirmed set", async () => {
    const run = harness();
    run.emit(...segment("t1", "s1"), completed("t1"));
    run.onRead(() => { run.memory.push(stored("t1", "s1-text")); run.persisted[0]!.resolve(); });
    const result = await run.snapshot();
    expect(run.sourcesOf(result, "t1")).toBe(1);
    expect(result.turn_frames).toHaveLength(4);
  });

  it("a turn confirmed before the base comes from the stored read, and its frames are dropped", async () => {
    const run = harness();
    run.emit(...segment("t1", "s1"), completed("t1"));
    run.memory.push(stored("t1", "s1-text"));
    run.persisted[0]!.resolve();
    await settle();
    const result = await run.snapshot();
    expect(run.sourcesOf(result, "t1")).toBe(1);
    expect(result.stored.conversation).toEqual([stored("t1", "s1-text")]);
    expect(result.turn_frames).toEqual([]);
  });

  it("a run restored after an idle shutdown or a restart keeps its whole earlier conversation", async () => {
    const run = harness({ predating: ["t0"], memory: [stored(null, "hello"), stored("t0", "earlier answer")] });
    run.emit(...segment("t1", "s1"));
    const result = await run.snapshot();
    expect(result.stored.conversation.map((entry) => entry.content)).toEqual(["hello", "earlier answer"]);
    expect(run.sourcesOf(result, "t1")).toBe(1);
  });

  it("an earlier turn interrupted without TURN_COMPLETED appears once, from the stored read", async () => {
    const run = harness({ predating: ["t0"], memory: [stored("t0", "cut off")] });
    const result = await run.snapshot();
    expect(run.sourcesOf(result, "t0")).toBe(1);
  });

  it("a turn written before its first frame reaches the sequence appears once: it is not among the predating turns", async () => {
    const run = harness();
    run.memory.push(stored("t2", "settled first"));
    const pending = run.snapshot();
    run.emit(...segment("t2", "s2"));
    const result = await pending;
    expect(result.stored.conversation).toEqual([]);
    expect(run.sourcesOf(result, "t2")).toBe(1);
  });

  it("frames after the base continue in order; entries with no turn are always kept", async () => {
    const run = harness({ memory: [stored(null, "user message")] });
    run.onRead(() => run.emit(...segment("t3", "s3")));
    const result = await run.snapshot();
    expect(result.stored.conversation).toEqual([stored(null, "user message")]);
    expect((result.after as { sequence: number }[]).map((frame) => frame.sequence)).toEqual([1, 2, 3]);
  });

  it("an exact repeated status is not numbered", () => {
    const run = harness();
    run.emit(event(AgentRunEventType.AGENT_STATUS, { status: "running" }), event(AgentRunEventType.AGENT_STATUS, { status: "running" }));
    expect(run.sequence.base().baseSequence).toBe(1);
  });

  it("an active run's snapshot carries its input state, read after the stored part (autobyteus-540 D-8)", async () => {
    const run = harness();
    const order: string[] = [];
    const inputState = { run_instance_id: "instance-1", revision: 2, recoverableBlock: null, entries: [{ sequence: 1,
      message_id: "client_msg-2", dedupe_key: "client_msg-2", turn_id: null, state: "queued" as const, content: "next",
      sender_type: "user" as const, file_attachments: [] }] };
    const connection = await run.sequence.connect((base) => activeRunSnapshot(run.sequence, base,
      async (runId) => { order.push("stored"); return buildRunProjectionBundle(runId, [], []); },
      () => { order.push("input_state"); return inputState; }));
    expect(connection.snapshot.input_state).toEqual(inputState);
    expect(order).toEqual(["stored", "input_state"]);
    connection.close();
  });

  it("a stopped run's snapshot is its full stored conversation, with no frames", async () => {
    const result = await storedRunSnapshot(RUN, async (runId) =>
      buildRunProjectionBundle(runId, [stored("t9", "all of it")], []));
    expect(result).toMatchObject({ stored: { conversation: [stored("t9", "all of it")] }, input_state: null, turn_frames: [], base_sequence: 0, live_sequence_id: null });
  });

  it("a run whose stored turns could not be read refuses a snapshot instead of guessing", async () => {
    const sequence = new AgentStreamSequence(RUN, { storedTurnIds: () => { throw new Error("unreadable"); },
      whenPersisted: async () => undefined, map: (runEvent) => getAgentRunEventMessageMapper().map(runEvent) });
    sequence.recordPredating();
    await expect(sequence.connect((base) => activeRunSnapshot(sequence, base, async (runId) => buildRunProjectionBundle(runId, [], []), null)))
      .rejects.toThrow("no record of its stored turns");
  });

  it.each([
    ["interrupted", (turnId: string) => event(AgentRunEventType.TURN_INTERRUPTED, { turn_id: turnId })],
    ["ended by a turn-terminal error", (turnId: string) => event(AgentRunEventType.ERROR,
      { code: "X", message: "failed", error_scope: "turn", error_effect: "terminal", turn_id: turnId })],
  ] as const)("CR-461-100: a turn %s is confirmed once written, its frames dropped; a later snapshot reads it from the stored part once", async (_label, end) => {
    const run = harness();
    run.emit(...segment("t1", "s1"), end("t1"));
    run.memory.push(stored("t1", "s1-text"));
    run.persisted[0]!.resolve();
    await settle();
    const result = await run.snapshot();
    expect(result.turn_frames).toEqual([]);
    expect(result.stored.conversation).toEqual([stored("t1", "s1-text")]);
    expect(run.sourcesOf(result, "t1")).toBe(1);
  });

  // CR-461-116 (F-91): after an agent runtime switch, the hand-over notice shows once live, at the marker's stored place,
  // as a reload shows it (base showed one): the marker is written before the sequence begins, so every snapshot carries it.
  it("CR-461-116: the runtime hand-over notice comes from the stored marker only, never also from its live echo", async () => {
    const marker = { kind: "system_task_notification", role: null, senderId: "system.runtime_handover", content: "Agent runtime changed",
      turnId: "runtime_switch" } as unknown as RunProjectionConversationEntry;
    const run = harness({ predating: ["t0", "runtime_switch"], memory: [stored("t0", "earlier answer"), marker] });
    const echo = (turnId: string) => event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION,
      { sender_id: "system.runtime_handover", content: "Agent runtime changed", turn_id: turnId });
    run.emit(echo("t1"), ...segment("t1", "s1"));
    const result = await run.snapshot();
    const notices = [
      ...result.stored.conversation.filter((entry) => entry.kind === "system_task_notification"),
      ...result.turn_frames.filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION"),
    ];
    expect(notices).toEqual([marker]);
    run.emit(echo("t2"));
    expect((result.after as { type: string }[]).filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION")).toEqual([]);
    // Any other notice is a frame of its turn, as before.
    run.emit(event(AgentRunEventType.SYSTEM_TASK_NOTIFICATION, { sender_id: "system.skill_update_notifier", content: "skill changed", turn_id: "t2" }));
    expect((result.after as { type: string }[]).filter((frame) => frame.type === "SYSTEM_TASK_NOTIFICATION")).toHaveLength(1);
  });
});
