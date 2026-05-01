import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeSessionEventConverter } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";

describe("ClaudeSessionEventConverter", () => {
  it("converts a normal Claude tool lifecycle into TOOL_* events", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [started] = converter.convert({
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
    expect(started).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_STARTED,
      payload: {
        invocation_id: "invoke-write",
        tool_name: "Write",
        arguments: {
          file_path: "/tmp/example.txt",
          content: "hello",
        },
      },
    });

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-write",
        tool_name: "Write",
        arguments: {
          file_path: "/tmp/example.txt",
          content: "hello",
        },
        result: {
          type: "create",
          filePath: "/tmp/example.txt",
        },
      },
    });
    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-write",
        tool_name: "Write",
        arguments: {
          file_path: "/tmp/example.txt",
          content: "hello",
        },
        result: {
          type: "create",
          filePath: "/tmp/example.txt",
        },
      },
    });
  });

  it("keeps send_message_to tool-call segment events while suppressing TOOL_* lifecycle noise", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [segmentStart] = converter.convert({
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
    expect(segmentStart).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_START,
      payload: {
        segment_type: "tool_call",
        metadata: {
          tool_name: "mcp__autobyteus_team__send_message_to",
          arguments: {
            recipient_name: "pong",
            content: "hello",
            message_type: "roundtrip_ping",
          },
        },
      },
    });

    expect(
      converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
        params: {
          invocation_id: "invoke-send-message",
          tool_name: "mcp__autobyteus_team__send_message_to",
          arguments: {
            recipient_name: "pong",
            content: "hello",
          },
        },
      }),
    ).toEqual([]);

    expect(
      converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
        params: {
          invocation_id: "invoke-send-message",
          tool_name: "mcp__autobyteus_team__send_message_to",
        },
      }),
    ).toEqual([]);

    const [segmentEnd] = converter.convert({
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
    expect(segmentEnd).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        segment_type: "tool_call",
      },
    });
  });

  it("normalizes browser MCP tool names to canonical browser tool names", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-browser",
        tool_name: "mcp__autobyteus_browser__open_tab",
        result: {
          tab_id: "browser-1",
          status: "opened",
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-browser",
        tool_name: "open_tab",
        result: {
          tab_id: "browser-1",
          status: "opened",
        },
      },
    });
  });

  it("preserves arguments on failed Claude tool completion events", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [failed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-bash-failed",
        tool_name: "Bash",
        arguments: {
          command: "cat missing.txt",
        },
        error: "No such file or directory",
      },
    });

    expect(failed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_FAILED,
      payload: {
        invocation_id: "invoke-bash-failed",
        tool_name: "Bash",
        arguments: {
          command: "cat missing.txt",
        },
        error: "No such file or directory",
      },
    });
  });

  it("emits explicit turn completed plus preserved agent-status events", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const completed = converter.convert({
      method: ClaudeSessionEventName.TURN_COMPLETED,
      params: {
        turnId: "turn-claude-1",
        sessionId: "session-1",
      },
    });

    expect(completed).toHaveLength(2);
    expect(completed[0]).toMatchObject({
      eventType: AgentRunEventType.TURN_COMPLETED,
      payload: {
        turnId: "turn-claude-1",
      },
      statusHint: "IDLE",
    });
    expect(completed[1]).toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        new_status: "IDLE",
        old_status: "RUNNING",
        turnId: "turn-claude-1",
      },
      statusHint: "IDLE",
    });
  });

  it("emits explicit turn started before the running status event", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const started = converter.convert({
      method: ClaudeSessionEventName.TURN_STARTED,
      params: {
        turnId: "turn-claude-2",
      },
    });

    expect(started).toHaveLength(2);
    expect(started[0]).toMatchObject({
      eventType: AgentRunEventType.TURN_STARTED,
      payload: { turnId: "turn-claude-2" },
      statusHint: "ACTIVE",
    });
    expect(started[1]).toMatchObject({
      eventType: AgentRunEventType.AGENT_STATUS,
      payload: {
        new_status: "RUNNING",
        old_status: null,
        turnId: "turn-claude-2",
      },
      statusHint: "ACTIVE",
    });
  });

  it("normalizes compacting status without rotation eligibility", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [status] = converter.convert({
      method: ClaudeSessionEventName.STATUS_COMPACTING,
      params: {
        sessionId: "session-1",
        turnId: "turn-1",
        uuid: "status-1",
        pre_tokens: 100000,
      },
    });

    expect(status).toMatchObject({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      payload: {
        kind: "provider_compaction_boundary",
        runtime_kind: "CLAUDE",
        provider: "claude",
        source_surface: "claude.status_compacting",
        boundary_key: "claude:session-1:claude.status_compacting:status-1:turn-1",
        rotation_eligible: false,
        semantic_compaction: false,
      },
    });
  });

  it("normalizes compact_boundary as rotation eligible", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [boundary] = converter.convert({
      method: ClaudeSessionEventName.COMPACT_BOUNDARY,
      params: {
        sessionId: "session-1",
        turnId: "turn-1",
        uuid: "boundary-1",
      },
    });

    expect(boundary).toMatchObject({
      eventType: AgentRunEventType.COMPACTION_STATUS,
      payload: {
        kind: "provider_compaction_boundary",
        source_surface: "claude.compact_boundary",
        boundary_key: "claude:session-1:claude.compact_boundary:boundary-1:turn-1",
        rotation_eligible: true,
        semantic_compaction: false,
      },
    });
  });

  it("keeps compacting status and compact boundary keys distinct when provider uuid matches", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [status] = converter.convert({
      method: ClaudeSessionEventName.STATUS_COMPACTING,
      params: {
        sessionId: "session-1",
        turnId: "turn-1",
        uuid: "compaction-operation-1",
      },
    });
    const [boundary] = converter.convert({
      method: ClaudeSessionEventName.COMPACT_BOUNDARY,
      params: {
        sessionId: "session-1",
        turnId: "turn-1",
        uuid: "compaction-operation-1",
      },
    });

    expect(status.payload.boundary_key).toBe(
      "claude:session-1:claude.status_compacting:compaction-operation-1:turn-1",
    );
    expect(boundary.payload.boundary_key).toBe(
      "claude:session-1:claude.compact_boundary:compaction-operation-1:turn-1",
    );
    expect(status.payload.boundary_key).not.toBe(boundary.payload.boundary_key);
  });
});
