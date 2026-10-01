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
});
