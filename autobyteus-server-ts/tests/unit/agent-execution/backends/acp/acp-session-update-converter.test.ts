import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { AcpSessionUpdateConverter } from "../../../../../src/agent-execution/backends/acp/events/acp-session-update-converter.js";
import type { AcpAgentSessionProfile } from "../../../../../src/agent-execution/backends/acp/acp-agent-session-profile.js";

const profile: AcpAgentSessionProfile = {
  newSessionMeta: () => undefined,
  mcpServers: () => [],
  mcpReadiness: () => null,
  projectToolCall: (snapshot) => ({
    toolName: String(snapshot.title), segmentType: "tool_call", arguments: { input: snapshot.rawInput ?? null },
    ...(snapshot.status === "completed" ? { result: snapshot.rawOutput ?? null } : {}),
    ...(snapshot.status === "failed" ? { error: "tool failed" } : {}),
  }),
  interpretExtNotification: () => [],
};

const chunk = (kind: "agent_message_chunk" | "agent_thought_chunk", text: string) =>
  ({ sessionUpdate: kind, content: { type: "text", text } }) as never;
const types = (events: { eventType: string }[]) => events.map((event) => event.eventType);

describe("AcpSessionUpdateConverter", () => {
  it("ignores updates outside a turn and non-chat updates inside one", () => {
    const converter = new AcpSessionUpdateConverter("run-1", profile);
    expect(converter.convertUpdate(chunk("agent_message_chunk", "early"))).toEqual([]);
    converter.startTurn("t");
    expect(converter.convertUpdate({ sessionUpdate: "available_commands_update", availableCommands: [] } as never)).toEqual([]);
    expect(converter.convertUpdate({ sessionUpdate: "user_message_chunk", content: { type: "text", text: "echo" } } as never)).toEqual([]);
  });

  it("switches segment kinds by closing the open one first", () => {
    const converter = new AcpSessionUpdateConverter("run-1", profile);
    converter.startTurn("t");
    expect(types(converter.convertUpdate(chunk("agent_thought_chunk", "think")))).toEqual(["SEGMENT_START", "SEGMENT_CONTENT"]);
    expect(types(converter.convertUpdate(chunk("agent_thought_chunk", "more")))).toEqual(["SEGMENT_CONTENT"]);
    const switched = converter.convertUpdate(chunk("agent_message_chunk", "say"));
    expect(types(switched)).toEqual(["SEGMENT_END", "SEGMENT_START", "SEGMENT_CONTENT"]);
    expect(switched[1]?.payload).toMatchObject({ segment_type: "text", turn_id: "t" });
    expect(types(converter.usage({ usage: 1 }))).toEqual(["SEGMENT_END", "TOKEN_USAGE_UPDATED"]);
  });

  it("treats a tool call without status as pending and ends it on terminal status", () => {
    const converter = new AcpSessionUpdateConverter("run-1", profile);
    converter.startTurn("t");
    converter.convertUpdate(chunk("agent_message_chunk", "before tool"));
    const started = converter.convertUpdate({ sessionUpdate: "tool_call", toolCallId: "c1", title: "list", rawInput: { a: 1 } } as never);
    expect(types(started)).toEqual(["SEGMENT_END", "SEGMENT_START"]);
    expect(converter.hasOpenToolCall()).toBe(true);
    expect(types(converter.convertUpdate({ sessionUpdate: "tool_call_update", toolCallId: "c1", status: "in_progress" } as never)))
      .toEqual([AgentRunEventType.TOOL_EXECUTION_STARTED]);
    const done = converter.convertUpdate({ sessionUpdate: "tool_call_update", toolCallId: "c1", status: "completed", rawOutput: "ok" } as never);
    expect(types(done)).toEqual(["SEGMENT_END", AgentRunEventType.TOOL_EXECUTION_SUCCEEDED]);
    expect(done[1]?.payload).toMatchObject({ invocation_id: "c1", tool_name: "list", arguments: { input: { a: 1 } }, result: "ok", turn_id: "t" });
    expect(converter.hasOpenToolCall()).toBe(false);
    expect(converter.convertUpdate({ sessionUpdate: "tool_call_update", toolCallId: "c1", status: "failed" } as never)).toEqual([]);
  });

  it("reports failed tools and interrupts unfinished ones at the turn end", () => {
    const converter = new AcpSessionUpdateConverter("run-1", profile);
    converter.startTurn("t");
    converter.convertUpdate({ sessionUpdate: "tool_call", toolCallId: "bad", title: "x", status: "pending" } as never);
    expect(types(converter.convertUpdate({ sessionUpdate: "tool_call_update", toolCallId: "bad", status: "failed" } as never)))
      .toEqual([AgentRunEventType.TOOL_EXECUTION_STARTED, "SEGMENT_END", AgentRunEventType.TOOL_EXECUTION_FAILED]);
    converter.convertUpdate({ sessionUpdate: "tool_call", toolCallId: "slow", title: "y" } as never);
    const ended = converter.interruptTurn();
    expect(types(ended)).toEqual(["SEGMENT_END", AgentRunEventType.TOOL_EXECUTION_INTERRUPTED, AgentRunEventType.TURN_INTERRUPTED]);
    expect(ended[0]?.payload).toMatchObject({ id: "slow", interrupted: true });
    expect(converter.activeTurnId).toBeNull();
  });

  it("fails a turn with one turn-terminal error carrying the provider message", () => {
    const converter = new AcpSessionUpdateConverter("run-1", profile);
    converter.startTurn("t");
    const events = converter.failTurn("ACP_PROMPT_FAILED", "429 Too Many Requests");
    expect(events).toEqual([expect.objectContaining({ eventType: AgentRunEventType.ERROR, statusHint: "ERROR", payload: {
      code: "ACP_PROMPT_FAILED", message: "429 Too Many Requests", error_scope: "turn", error_effect: "terminal", turn_id: "t" } })]);
  });

  describe("provider compaction tracking", () => {
    /** Echoes the builder input so the tracker's decisions are visible. */
    const compactionProfile: AcpAgentSessionProfile = {
      ...profile,
      buildCompactionStatusPayload: (input) => ({ ...input }),
    };
    const effect = (phase: "started" | "completed" | "failed" | "cancelled", eventId: string | null, details = {}) =>
      ({ kind: "compaction" as const, phase, eventId, details });
    const started = () => {
      const converter = new AcpSessionUpdateConverter("run-1", compactionProfile);
      converter.startTurn("t");
      converter.compaction("s", effect("started", "e-47", { tokens_used: 1 }));
      return converter;
    };

    it("pairs a completion with the open start by order and gives both the start's operation id", () => {
      const converter = new AcpSessionUpdateConverter("run-1", compactionProfile);
      converter.startTurn("t");
      const [start] = converter.compaction("s", effect("started", "e-47"));
      const [done] = converter.compaction("s", effect("completed", "e-50", { tokens_before: 2 }));
      expect(start).toMatchObject({ eventType: "COMPACTION_STATUS", statusHint: null,
        payload: { phase: "started", operationId: "e-47", eventId: "e-47", trigger: "auto", sessionId: "s", turnId: "t" } });
      expect(done?.payload).toMatchObject({ phase: "completed", operationId: "e-47", eventId: "e-50", trigger: "auto",
        details: { tokens_before: 2 } });
      expect(types(converter.completeTurn("end_turn"))).toEqual(["TURN_COMPLETED"]);
    });

    it("treats a completion without a start as a manual compaction under its own id", () => {
      const converter = new AcpSessionUpdateConverter("run-1", compactionProfile);
      converter.startTurn("t");
      expect(converter.compaction("s", effect("completed", "e-84"))[0]?.payload)
        .toMatchObject({ phase: "completed", operationId: "e-84", trigger: "manual" });
    });

    it.each([
      ["completeTurn(end_turn)", (c: AcpSessionUpdateConverter) => c.completeTurn("end_turn"), "TURN_COMPLETED", "Turn ended before the compaction completed."],
      ["completeTurn(cancelled)", (c: AcpSessionUpdateConverter) => c.completeTurn("cancelled"), "TURN_COMPLETED", "Turn was cancelled before the compaction completed."],
      ["interruptTurn", (c: AcpSessionUpdateConverter) => c.interruptTurn(), "TURN_INTERRUPTED", "Turn was interrupted before the compaction completed."],
      ["failTurn", (c: AcpSessionUpdateConverter) => c.failTurn("X", "boom"), "ERROR", "Turn failed before the compaction completed."],
    ])("closes an open compaction as abandoned before the %s event", (_name, end, terminal, reason) => {
      const converter = started();
      const events = end(converter);
      expect(types(events)).toEqual(["COMPACTION_STATUS", terminal]);
      expect(events[0]?.payload).toMatchObject({ phase: "abandoned", operationId: "e-47", reason, trigger: "auto" });
      converter.startTurn("t2");
      expect(types(converter.completeTurn("end_turn"))).toEqual(["TURN_COMPLETED"]);
    });

    it.each(["failed", "cancelled"] as const)("closes the open compaction on a provider %s notification", (phase) => {
      const converter = started();
      expect(converter.compaction("s", effect(phase, "e-49", { error: "x" }))[0]?.payload)
        .toMatchObject({ phase, operationId: "e-47", eventId: "e-49", trigger: "auto" });
      expect(types(converter.completeTurn("end_turn"))).toEqual(["TURN_COMPLETED"]);
    });

    it("closes an unexpected open start as superseded before opening the new one", () => {
      const converter = started();
      const events = converter.compaction("s", effect("started", "e-60"));
      expect(events.map((event) => [event.payload.phase, event.payload.operationId])).toEqual([["abandoned", "e-47"], ["started", "e-60"]]);
      expect(events[0]?.payload.reason).toBe("A new compaction started before this one completed.");
    });

    it("emits nothing outside a turn or for a profile without a compaction builder", () => {
      const idle = new AcpSessionUpdateConverter("run-1", compactionProfile);
      expect(idle.compaction("s", effect("completed", "e-1"))).toEqual([]);
      const plain = new AcpSessionUpdateConverter("run-1", profile);
      plain.startTurn("t");
      expect(plain.compaction("s", effect("started", "e-1"))).toEqual([]);
      expect(types(plain.completeTurn("end_turn"))).toEqual(["TURN_COMPLETED"]);
    });

    it("gives an id-less compaction a turn-scoped operation id", () => {
      const converter = new AcpSessionUpdateConverter("run-1", compactionProfile);
      converter.startTurn("t");
      const [start] = converter.compaction("s", effect("started", null));
      const [done] = converter.compaction("s", effect("completed", null));
      expect(start?.payload.operationId).toBe("t:compaction:1");
      expect(done?.payload.operationId).toBe("t:compaction:1");
    });
  });
});
