import { describe, expect, it } from "vitest";
import { AgentRunEventType } from "../../../../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeSessionEventConverter } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-converter.js";
import { ClaudeSessionEventName } from "../../../../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";

describe("ClaudeSessionEventConverter", () => {
  it("converts normal Claude tool segment lane metadata with arguments", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [segmentStart] = converter.convert({
      method: ClaudeSessionEventName.ITEM_ADDED,
      params: {
        id: "invoke-bash",
        turn_id: "turn-1",
        segment_type: "tool_call",
        tool_name: "Bash",
        arguments: {
          command: "pwd",
        },
      },
    });
    expect(segmentStart).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_START,
      payload: {
        id: "invoke-bash",
        turn_id: "turn-1",
        segment_type: "tool_call",
        metadata: {
          tool_name: "Bash",
          arguments: {
            command: "pwd",
          },
        },
      },
    });

    const [segmentEnd] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMPLETED,
      params: {
        id: "invoke-bash",
        turn_id: "turn-1",
        segment_type: "tool_call",
        tool_name: "Bash",
        arguments: {
          command: "pwd",
        },
        metadata: {
          tool_name: "Bash",
          arguments: {
            command: "pwd",
          },
          result: "workspace\n",
        },
      },
    });
    expect(segmentEnd).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        id: "invoke-bash",
        turn_id: "turn-1",
        segment_type: "tool_call",
        metadata: {
          tool_name: "Bash",
          arguments: {
            command: "pwd",
          },
          result: "workspace\n",
        },
      },
    });
  });

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

  it("suppresses raw MCP send_message_to segment and lifecycle transport noise", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    expect(
      converter.convert({
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
      }),
    ).toEqual([]);

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

    expect(
      converter.convert({
        method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
        params: {
          invocation_id: "invoke-send-message",
          tool_name: "mcp__autobyteus_team__send_message_to",
          result: { accepted: true },
        },
      }),
    ).toEqual([]);

    expect(
      converter.convert({
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
      }),
    ).toEqual([]);
  });

  it("passes canonical send_message_to segment and started lifecycle events", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [segmentStart] = converter.convert({
      method: ClaudeSessionEventName.ITEM_ADDED,
      params: {
        id: "invoke-send-message",
        segment_type: "tool_call",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
          message_type: "roundtrip_ping",
        },
      },
    });
    const [started] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_STARTED,
      params: {
        invocation_id: "invoke-send-message",
        tool_name: "send_message_to",
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
        id: "invoke-send-message",
        segment_type: "tool_call",
        tool_name: "send_message_to",
        metadata: {
          tool_name: "send_message_to",
          arguments: {
            recipient_name: "pong",
            content: "hello",
            message_type: "roundtrip_ping",
          },
        },
      },
    });
    expect(started).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_STARTED,
      payload: {
        invocation_id: "invoke-send-message",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
          message_type: "roundtrip_ping",
        },
      },
    });
  });

  it("passes canonical send_message_to success and failure lifecycle events with arguments", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [succeeded] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-send-message-success",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
        result: {
          accepted: true,
          code: null,
          message: "Delivered message to pong.",
        },
      },
    });
    const [failed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-send-message-failed",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "missing",
          content: "hello",
        },
        error: "Recipient missing was not found.",
      },
    });

    expect(succeeded).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-send-message-success",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
        result: {
          accepted: true,
          code: null,
          message: "Delivered message to pong.",
        },
      },
    });
    expect(failed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_FAILED,
      payload: {
        invocation_id: "invoke-send-message-failed",
        tool_name: "send_message_to",
        arguments: {
          recipient_name: "missing",
          content: "hello",
        },
        error: "Recipient missing was not found.",
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

  it("normalizes browser MCP content-block results to canonical browser result objects", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-browser-content-block",
        tool_name: "mcp__autobyteus_browser__open_tab",
        result: [
          {
            type: "text",
            text: JSON.stringify({
              tab_id: "983e18",
              status: "opened",
              url: "https://example.com/claude",
              title: "Claude Browser",
            }),
          },
        ],
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-browser-content-block",
        tool_name: "open_tab",
        result: {
          tab_id: "983e18",
          status: "opened",
          url: "https://example.com/claude",
          title: "Claude Browser",
        },
      },
    });
  });

  it("normalizes browser MCP content-envelope results to canonical browser result objects", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-browser-envelope",
        tool_name: "mcp__autobyteus_browser__open_tab",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                tab_id: "browser-envelope-1",
                status: "opened",
              }),
            },
          ],
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-browser-envelope",
        tool_name: "open_tab",
        result: {
          tab_id: "browser-envelope-1",
          status: "opened",
        },
      },
    });
  });

  it("normalizes media MCP tool names and content envelopes to canonical generated-output results", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-media",
        tool_name: "mcp__autobyteus_image_audio__generate_image",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                file_path: "/tmp/generated.png",
              }),
            },
          ],
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-media",
        tool_name: "generate_image",
        result: {
          file_path: "/tmp/generated.png",
        },
      },
    });
  });

  it("preserves unknown MCP browser-like names and results", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");
    const rawResult = [
      {
        type: "text",
        text: JSON.stringify({
          tab_id: "unknown-browser-1",
        }),
      },
    ];

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-unknown-browser-like",
        tool_name: "mcp__autobyteus_browser__unknown_tool",
        result: rawResult,
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-unknown-browser-like",
        tool_name: "mcp__autobyteus_browser__unknown_tool",
        result: rawResult,
      },
    });
  });

  it("preserves non-Autobyteus MCP tools with browser-like suffixes and results", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");
    const rawResult = [
      {
        type: "text",
        text: JSON.stringify({
          tab_id: "other-server-tab",
          status: "opened",
        }),
      },
    ];

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-other-server-open-tab",
        tool_name: "mcp__some_other_server__open_tab",
        result: rawResult,
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-other-server-open-tab",
        tool_name: "mcp__some_other_server__open_tab",
        result: rawResult,
      },
    });
  });

  it("normalizes browser MCP tool names in segment start metadata and top-level payload", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [segmentStart] = converter.convert({
      method: ClaudeSessionEventName.ITEM_ADDED,
      params: {
        id: "invoke-browser",
        turn_id: "turn-1",
        segment_type: "tool_call",
        tool_name: "mcp__autobyteus_browser__open_tab",
        arguments: {
          url: "http://localhost:3000",
        },
      },
    });

    expect(segmentStart).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_START,
      payload: {
        id: "invoke-browser",
        segment_type: "tool_call",
        tool_name: "open_tab",
        metadata: {
          tool_name: "open_tab",
          arguments: {
            url: "http://localhost:3000",
          },
        },
      },
    });
    expect(JSON.stringify(segmentStart.payload)).not.toContain("mcp__autobyteus_browser__open_tab");
  });

  it("normalizes browser MCP tool names in provided segment end metadata", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [segmentEnd] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMPLETED,
      params: {
        id: "invoke-browser",
        turn_id: "turn-1",
        segment_type: "tool_call",
        tool_name: "mcp__autobyteus_browser__open_tab",
        metadata: {
          tool_name: "mcp__autobyteus_browser__open_tab",
          result: {
            tab_id: "browser-1",
            status: "opened",
          },
        },
      },
    });

    expect(segmentEnd).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        id: "invoke-browser",
        segment_type: "tool_call",
        tool_name: "open_tab",
        metadata: {
          tool_name: "open_tab",
          result: {
            tab_id: "browser-1",
            status: "opened",
          },
        },
      },
    });
    expect(JSON.stringify(segmentEnd.payload)).not.toContain("mcp__autobyteus_browser__open_tab");
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

  it("preserves arguments on denied Claude tool lifecycle events", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [denied] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED,
      params: {
        invocation_id: "invoke-bash-denied",
        tool_name: "Bash",
        arguments: {
          command: "rm -rf /tmp/nope",
        },
        reason: "Denied by policy",
      },
    });

    expect(denied).toMatchObject({
      eventType: AgentRunEventType.TOOL_DENIED,
      payload: {
        invocation_id: "invoke-bash-denied",
        tool_name: "Bash",
        arguments: {
          command: "rm -rf /tmp/nope",
        },
        reason: "Denied by policy",
        error: "Denied by policy",
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
