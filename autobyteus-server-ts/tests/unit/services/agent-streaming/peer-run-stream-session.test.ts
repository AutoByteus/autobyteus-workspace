import { describe, expect, it, vi } from "vitest";
import { PeerRunStreamSession } from "../../../../src/services/agent-streaming/peer-run-stream-session.js";

/**
 * autobyteus-461 G-D1 (SR-088): node A's `/ws/peer-run` relays node B's own agent stream one for one: its snapshot, then
 * its numbered frames after the base; a gap or a restore (a new `liveSequenceId`) takes a new snapshot; a frame without
 * a sequence is dropped; a message and an interrupt go through the owner commands.
 */
const frame = (sequence: number | undefined, delta = `d${sequence}`) => ({ type: "SEGMENT_CONTENT", ...(sequence === undefined ? {} : { sequence }),
  payload: { id: "s1", turn_id: "t1", segment_type: "text", delta } });
const snapshot = (base: number, liveSequenceId: string | null = "live-1") => ({ accepted: true as const,
  snapshot: { stored: { conversation: [] }, input_state: null, turn_frames: [], base_sequence: base, live_sequence_id: liveSequenceId },
  status: { type: "AGENT_STATUS", payload: { status: "running" } } });

const harness = () => {
  let onFrame: (liveSequenceId: string, value: Record<string, unknown>) => void = () => undefined;
  let release: (value: ReturnType<typeof snapshot>) => void = () => undefined;
  const channel = {
    observeAgentStream: vi.fn((_node: string, _root: unknown, _agent: string, observer: { onFrame: typeof onFrame }) => {
      onFrame = observer.onFrame;
      return { close: vi.fn() };
    }),
    agentStreamSnapshot: vi.fn(() => new Promise<ReturnType<typeof snapshot>>((resolve) => { release = resolve; })),
    ownerCommand: vi.fn(async () => ({ accepted: true as const })),
  };
  const sent: Record<string, unknown>[] = [];
  const session = new PeerRunStreamSession({ channel: channel as never, nodeId: "node-b", targetRoot: { kind: "agent_team", runId: "team-b" },
    agentRunId: "member-b", sink: { send: (message) => sent.push(message as Record<string, unknown>), close: vi.fn() } });
  session.start();
  const flush = async () => { for (let i = 0; i < 5; i += 1) await Promise.resolve(); };
  return { channel, sent, session, flush, emit: (live: string, value: Record<string, unknown>) => onFrame(live, value),
    answer: async (value: ReturnType<typeof snapshot>) => { release(value); await flush(); },
    types: () => sent.map((message) => message.type), deltas: () => sent.flatMap((message) =>
      message.type === "SEGMENT_CONTENT" ? [(message.payload as { delta: string }).delta] : []) };
};

describe("PeerRunStreamSession", () => {
  it("relays node B's snapshot, then the frames after its base once; a frame during the read that the base covers is not sent", async () => {
    const h = harness();
    expect(h.channel.observeAgentStream).toHaveBeenCalledWith("node-b", { kind: "agent_team", runId: "team-b" }, "member-b", expect.anything());
    // Two deltas arrive while node B's snapshot is read: one its base covers, one after it.
    h.emit("live-1", frame(4));
    h.emit("live-1", frame(5));
    await h.answer(snapshot(4));
    h.emit("live-1", frame(6));
    expect(h.types()).toEqual(["CONNECTED", "AGENT_STATUS", "AGENT_STREAM_SNAPSHOT", "SEGMENT_CONTENT", "SEGMENT_CONTENT"]);
    expect(h.deltas()).toEqual(["d5", "d6"]);
    expect(h.sent.find((message) => message.type === "AGENT_STREAM_SNAPSHOT")).toMatchObject({ payload: { base_sequence: 4, live_sequence_id: "live-1" } });
  });

  it("a gap, or a restore on node B (a new liveSequenceId), takes a new snapshot, sent in-band", async () => {
    const h = harness();
    await h.answer(snapshot(2));
    h.emit("live-1", frame(4));
    expect(h.channel.agentStreamSnapshot).toHaveBeenCalledTimes(2);
    await h.answer(snapshot(4));
    h.emit("live-2", frame(1));
    expect(h.channel.agentStreamSnapshot).toHaveBeenCalledTimes(3);
    await h.answer(snapshot(1, "live-2"));
    h.emit("live-2", frame(2));
    expect(h.types().filter((type) => type === "AGENT_STREAM_SNAPSHOT")).toHaveLength(3);
    expect(h.deltas()).toEqual(["d2"]);
  });

  it("a frame without a sequence is a contract violation: logged and dropped", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const h = harness();
    await h.answer(snapshot(0));
    h.emit("live-1", frame(undefined));
    expect(h.deltas()).toEqual([]);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("has no sequence"));
    error.mockRestore();
  });

  it.each([
    ["RUN_NOT_ACTIVE", { state: "accepted" }],
    ["NO_ACTIVE_TURN", { state: "accepted" }],
    ["RUNTIME_COMMAND_FAILED", { state: "failed", code: "RUNTIME_COMMAND_FAILED", message: "detail" }],
  ] as const)("relays node B's Stop answer %s as %o (autobyteus-533 AC-004)", async (code, ack) => {
    const h = harness();
    await h.answer(snapshot(0));
    h.channel.ownerCommand.mockResolvedValueOnce({ accepted: false, code, message: "detail" } as never);
    await h.session.handleMessage(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: "c-r" } }));
    expect(h.sent.filter((message) => message.type === "AGENT_COMMAND_ACK").at(-1)?.payload).toEqual({
      command_type: "INTERRUPT_GENERATION", command_id: "c-r", target: { target_kind: "standalone_run", run_id: "member-b" }, ...ack });
  });

  it("a message and an interrupt go to the agent through the owner commands, each answered with its ACK", async () => {
    const h = harness();
    await h.answer(snapshot(0));
    await h.session.handleMessage(JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "hi", message_id: "m1", dedupe_key: "d1" } }));
    await h.session.handleMessage(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: "c1" } }));
    expect(h.channel.ownerCommand.mock.calls.map((call) => (call as unknown[])[3])).toEqual([
      { kind: "post_message", content: "hi", messageId: "m1", dedupeKey: "d1" }, { kind: "interrupt" }]);
    expect(h.sent.filter((message) => message.type === "AGENT_COMMAND_ACK").map((message) => message.payload)).toMatchObject([
      { command_type: "SEND_MESSAGE", message_id: "m1", dedupe_key: "d1", accepted: true, state: "accepted" },
      { command_type: "INTERRUPT_GENERATION", command_id: "c1", state: "accepted", target: { target_kind: "standalone_run", run_id: "member-b" } },
    ]);
  });
});
