import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeSessionEventConverter } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";

describe("ClaudeSessionEventConverter", () => {
  it("converts a normal Claude tool lifecycle into TOOL_* events", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const started = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      params: {
        invocation_id: "invoke-write",
        tool_name: "Write",
        arguments: {
          file_path: "/tmp/example.txt",
          content: "hello",
        },
      },
    });
    expect(started).not.toBeNull();
    expect(started?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_STARTED);
    expect(started?.payload).toMatchObject({
      invocation_id: "invoke-write",
      tool_name: "Write",
      arguments: {
        file_path: "/tmp/example.txt",
        content: "hello",
      },
    });

    const completed = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-write",
        tool_name: "Write",
        result: {
          type: "create",
          filePath: "/tmp/example.txt",
        },
      },
    });
    expect(completed).not.toBeNull();
    expect(completed?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
    expect(completed?.payload).toMatchObject({
      invocation_id: "invoke-write",
      tool_name: "Write",
      result: {
        type: "create",
        filePath: "/tmp/example.txt",
      },
    });
  });

  it("keeps send_message_to tool-call segment events while suppressing TOOL_* lifecycle noise", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const segmentStart = converter.convert({
      method: ClaudeSessionEventName.ITEM_ADDED,
      params: {
        id: "invoke-send-message",
        segment_type: "tool_call",
        tool_name: "mcp__autobyteus_team__send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
          message_type: "roundtrip_ping",
        },
      },
    });
    expect(segmentStart).not.toBeNull();
    expect(segmentStart?.eventType).toBe(AgentRunEventType.SEGMENT_START);
    expect(segmentStart?.payload.segment_type).toBe("tool_call");
    expect(segmentStart?.payload.metadata).toMatchObject({
      tool_name: "mcp__autobyteus_team__send_message_to",
      arguments: {
        recipient_name: "pong",
        content: "hello",
        message_type: "roundtrip_ping",
      },
    });

    const approval = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
      params: {
        invocation_id: "invoke-send-message",
        tool_name: "mcp__autobyteus_team__send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
      },
    });
    expect(approval).toBeNull();

    const executionStarted = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      params: {
        invocation_id: "invoke-send-message",
        tool_name: "mcp__autobyteus_team__send_message_to",
      },
    });
    expect(executionStarted).toBeNull();

    const segmentEnd = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMPLETED,
      params: {
        id: "invoke-send-message",
        segment_type: "tool_call",
        tool_name: "mcp__autobyteus_team__send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
      },
    });
    expect(segmentEnd).not.toBeNull();
    expect(segmentEnd?.eventType).toBe(AgentRunEventType.SEGMENT_END);
    expect(segmentEnd?.payload.segment_type).toBe("tool_call");
  });

  it("normalizes preview MCP tool names to canonical preview tool names", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const completed = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-preview",
        tool_name: "mcp__autobyteus_preview__open_preview",
        result: {
          preview_session_id: "preview-1",
          status: "opened",
        },
      },
    });

    expect(completed).not.toBeNull();
    expect(completed?.eventType).toBe(AgentRunEventType.TOOL_EXECUTION_SUCCEEDED);
    expect(completed?.payload).toMatchObject({
      invocation_id: "invoke-preview",
      tool_name: "open_preview",
      result: {
        preview_session_id: "preview-1",
        status: "opened",
      },
    });
  });
});
