import { afterEach, describe, expect, it, vi } from "vitest";
import { ServerMessage, ServerMessageType } from "../../../../src/services/agent-streaming/models.js";
import { AgentStreamWebSocketEgress } from "../../../../src/services/agent-streaming/websocket-egress/agent-stream-websocket-egress.js";

const content = (
  delta: unknown,
  id = "segment-a",
  extra: Record<string, unknown> = {},
): ServerMessage => new ServerMessage(ServerMessageType.SEGMENT_CONTENT, {
  id,
  turn_id: "turn-1",
  segment_type: "text",
  delta,
  ...extra,
});

const parseSent = (sendRaw: ReturnType<typeof vi.fn>) =>
  sendRaw.mock.calls.map(([raw]) => JSON.parse(String(raw)) as {
    type: ServerMessageType;
    payload: Record<string, unknown>;
  });

describe("AgentStreamWebSocketEgress", () => {
  afterEach(() => vi.useRealTimers());

  it.each([100, 500, 1_000, 2_000])(
    "uses one fixed non-sliding %d ms window",
    (interval) => {
      vi.useFakeTimers();
      const sendRaw = vi.fn();
      const egress = new AgentStreamWebSocketEgress({
        sendRaw,
        readIntervalMs: () => interval,
      });

      egress.send(content("a"));
      vi.advanceTimersByTime(interval - 10);
      egress.send(content("b"));
      vi.advanceTimersByTime(10);

      expect(parseSent(sendRaw)).toEqual([
        expect.objectContaining({ payload: expect.objectContaining({ delta: "ab" }) }),
      ]);
    },
  );

  it("preserves immutable input messages and ordered A/B/A groups", () => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });
    const first = content("a1", "A", { nested: { route: "root" } });
    const second = content("a2", "A", { nested: { route: "root" } });

    egress.send(first);
    egress.send(second);
    egress.send(new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "running" }));
    egress.send(content("b1", "B"));
    egress.send(content("a3", "A", { nested: { route: "root" } }));
    egress.flush();

    expect(first.payload.delta).toBe("a1");
    expect(second.payload.delta).toBe("a2");
    const sent = parseSent(sendRaw);
    expect(sent.filter(({ type }) => type === ServerMessageType.AGENT_STATUS)).toHaveLength(1);
    expect(sent
      .filter(({ type }) => type === ServerMessageType.SEGMENT_CONTENT)
      .map(({ payload }) => [payload.id, payload.delta])).toEqual([
      ["A", "a1a2"],
      ["B", "b1"],
      ["A", "a3"],
    ]);
  });

  it("keeps same-identity content mergeable across running without moving the original timer", () => {
    vi.useFakeTimers();
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });

    egress.send(new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "running" }));
    egress.send(content("a1"));
    vi.advanceTimersByTime(200);
    egress.send(new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "running" }));
    egress.send(content("a2"));

    expect(parseSent(sendRaw)).toEqual([
      { type: ServerMessageType.AGENT_STATUS, payload: { status: "running" } },
      { type: ServerMessageType.AGENT_STATUS, payload: { status: "running" } },
    ]);
    vi.advanceTimersByTime(299);
    expect(sendRaw).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1);
    expect(parseSent(sendRaw).map(({ type, payload }) => [type, payload.delta ?? payload.status]))
      .toEqual([
        [ServerMessageType.AGENT_STATUS, "running"],
        [ServerMessageType.AGENT_STATUS, "running"],
        [ServerMessageType.SEGMENT_CONTENT, "a1a2"],
      ]);
  });

  it.each([
    new ServerMessage(ServerMessageType.CONNECTED, { session_id: "session-1" }),
    new ServerMessage(ServerMessageType.AGENT_COMMAND_ACK, { accepted: true }),
    new ServerMessage(ServerMessageType.TOKEN_USAGE_UPDATED, { input_tokens: 1 }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "initializing" }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "running" }),
  ])("sends declared companion $type without changing pending tail or timer", (companion) => {
    vi.useFakeTimers();
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });

    egress.send(content("a1"));
    vi.advanceTimersByTime(200);
    egress.send(companion);
    egress.send(content("a2"));

    expect(parseSent(sendRaw).map(({ type }) => type)).toEqual([companion.type]);
    vi.advanceTimersByTime(299);
    expect(sendRaw).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(parseSent(sendRaw).map(({ type, payload }) => [type, payload.delta])).toEqual([
      [companion.type, undefined],
      [ServerMessageType.SEGMENT_CONTENT, "a1a2"],
    ]);
  });

  it.each([
    new ServerMessage(ServerMessageType.SEGMENT_END, { id: "segment-a" }),
    new ServerMessage(ServerMessageType.TURN_COMPLETED, { turn_id: "turn-1" }),
    new ServerMessage(ServerMessageType.TURN_INTERRUPTED, { turn_id: "turn-1" }),
    new ServerMessage(ServerMessageType.ASSISTANT_COMPLETE, { turn_id: "turn-1" }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "idle" }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "offline" }),
    new ServerMessage(ServerMessageType.AGENT_STATUS, { status: "error" }),
    new ServerMessage(ServerMessageType.ERROR, { code: "FAILED" }),
    new ServerMessage(ServerMessageType.TOOL_EXECUTION_STARTED, { invocation_id: "tool-1" }),
    new ServerMessage(ServerMessageType.TOOL_EXECUTION_INTERRUPTED, { invocation_id: "tool-1" }),
    new ServerMessage(ServerMessageType.TEAM_RUN_LIFECYCLE, { state: "completed" }),
  ])("flushes content before dependent boundary $type", (boundary) => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });

    egress.send(content("exact"));
    egress.send(boundary);

    expect(parseSent(sendRaw).map(({ type }) => type)).toEqual([
      ServerMessageType.SEGMENT_CONTENT,
      boundary.type,
    ]);
  });

  it("treats invalid content delta conservatively without fabricating content", () => {
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });

    egress.send(content("valid"));
    egress.send(content(123));

    expect(parseSent(sendRaw).map(({ payload }) => payload.delta)).toEqual(["valid", 123]);
  });

  it("applies a changed setting only to the next newly opened window", () => {
    vi.useFakeTimers();
    const sendRaw = vi.fn();
    let interval = 500;
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => interval });

    egress.send(content("first"));
    interval = 1_000;
    vi.advanceTimersByTime(500);
    expect(sendRaw).toHaveBeenCalledTimes(1);

    egress.send(content("second"));
    vi.advanceTimersByTime(999);
    expect(sendRaw).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(sendRaw).toHaveBeenCalledTimes(2);
  });

  it("disposes pending unsendable connection state idempotently", () => {
    vi.useFakeTimers();
    const sendRaw = vi.fn();
    const egress = new AgentStreamWebSocketEgress({ sendRaw, readIntervalMs: () => 500 });
    egress.send(content("pending"));

    egress.dispose();
    egress.dispose();
    vi.runAllTimers();

    expect(sendRaw).not.toHaveBeenCalled();
  });

  it("reports timer-triggered send failure through the bounded error callback", () => {
    vi.useFakeTimers();
    const sendError = new Error("socket closed");
    const onSendError = vi.fn();
    const egress = new AgentStreamWebSocketEgress({
      sendRaw: () => { throw sendError; },
      readIntervalMs: () => 500,
      onSendError,
    });
    egress.send(content("pending"));

    vi.advanceTimersByTime(500);

    expect(onSendError).toHaveBeenCalledWith(sendError);
  });
});
