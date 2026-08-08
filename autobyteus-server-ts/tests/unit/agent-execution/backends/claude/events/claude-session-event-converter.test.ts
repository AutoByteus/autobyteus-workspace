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

  it("normalizes Agent Tools MCP send_message_to segment and lifecycle events", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [segmentStart] = converter.convert({
      method: ClaudeSessionEventName.ITEM_ADDED,
      params: {
        id: "invoke-send-message",
        segment_type: "tool_call",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
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
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
      },
    });
    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-send-message",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        result: { accepted: true },
      },
    });
    const [segmentEnd] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMPLETED,
      params: {
        id: "invoke-send-message",
        segment_type: "tool_call",
        tool_name: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
      },
    });

    expect(segmentStart).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_START,
      payload: {
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
        },
      },
    });
    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-send-message",
        tool_name: "send_message_to",
        result: { accepted: true },
      },
    });
    expect(segmentEnd).toMatchObject({
      eventType: AgentRunEventType.SEGMENT_END,
      payload: {
        tool_name: "send_message_to",
        metadata: {
          tool_name: "send_message_to",
          arguments: {
            recipient_name: "pong",
            content: "hello",
          },
        },
      },
    });
    expect(JSON.stringify([segmentStart, started, completed, segmentEnd])).not.toContain(
      "mcp__autobyteus_agent_tools__send_message_to",
    );
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
        tool_name: "mcp__autobyteus_agent_tools__open_tab",
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

  it("normalizes Agent Tools MCP task-delegation envelopes to canonical task results", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");
    const taskResult = {
      task_id: "task_0001",
      status: "active",
    };

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-delegate-task",
        tool_name: "mcp__autobyteus_agent_tools__delegate_task",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify(taskResult),
            },
          ],
          structuredContent: null,
          _meta: null,
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-delegate-task",
        tool_name: "delegate_task",
        result: taskResult,
      },
    });
    expect(completed?.payload.result).not.toHaveProperty("content");
    expect(completed?.payload.result).not.toHaveProperty("structuredContent");
    expect(completed?.payload.result).not.toHaveProperty("_meta");
  });

  it("projects generic Claude MCP JSON text envelopes into parsed results", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-generic-json",
        tool_name: "mcp__custom_server__custom_tool",
        result: {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ok: true, count: 2 }),
            },
          ],
          structuredContent: null,
          _meta: { hidden: true },
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-generic-json",
        tool_name: "mcp__custom_server__custom_tool",
        result: { ok: true, count: 2 },
      },
    });
    expect(completed?.payload.result).not.toHaveProperty("content");
    expect(completed?.payload.result).not.toHaveProperty("_meta");
  });

  it("projects generic Claude MCP plain text envelopes into text results", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-generic-text",
        tool_name: "mcp__custom_server__plain_text_tool",
        result: {
          content: [{ type: "text", text: "completed" }],
          structuredContent: null,
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-generic-text",
        result: "completed",
      },
    });
  });

  it("projects generic Claude MCP structuredContent before text fallback", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-generic-structured",
        tool_name: "mcp__custom_server__structured_tool",
        result: {
          structuredContent: { answer: 42 },
          content: [{ type: "text", text: "fallback" }],
          _meta: { hidden: true },
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        result: { answer: 42 },
      },
    });
    expect(completed?.payload.result).not.toHaveProperty("_meta");
  });

  it("projects generic Claude MCP multi-text envelopes with deterministic separators", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-generic-multitext",
        tool_name: "mcp__custom_server__multi_text_tool",
        result: {
          content: [
            { type: "text", text: "one" },
            { type: "text", text: "two" },
          ],
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        result: "one\n\ntwo",
      },
    });
  });

  it("projects generic Claude MCP rich content envelopes into sanitized items", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-generic-rich",
        tool_name: "mcp__custom_server__rich_tool",
        result: {
          content: [
            { type: "text", text: "see image", _meta: { hidden: true } },
            {
              type: "image",
              data: "abc123",
              mimeType: "image/png",
              _meta: { hidden: true },
            },
          ],
          _meta: { hidden: true },
        },
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        result: {
          items: [
            { type: "text", text: "see image" },
            { type: "image", data: "abc123", mimeType: "image/png" },
          ],
        },
      },
    });
  });

  it("maps Claude MCP isError result envelopes into failure events without result", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [failed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-generic-error",
        tool_name: "mcp__custom_server__error_tool",
        result: {
          isError: true,
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: { message: "bad input" } }),
            },
          ],
        },
      },
    });

    expect(failed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_FAILED,
      payload: {
        invocation_id: "invoke-generic-error",
        error: "bad input",
      },
    });
    expect(failed?.payload).not.toHaveProperty("result");
  });

  it("does not project exact envelope-shaped non-MCP Claude results", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");
    const rawEnvelopeLikeResult = {
      content: [{ type: "text", text: JSON.stringify({ should: "stay wrapped" }) }],
      structuredContent: null,
      _meta: { domain: true },
    };

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-non-mcp-envelope",
        tool_name: "Write",
        result: rawEnvelopeLikeResult,
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-non-mcp-envelope",
        tool_name: "Write",
        result: rawEnvelopeLikeResult,
      },
    });
  });

  it("normalizes browser MCP content-block results to canonical browser result objects", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [completed] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
      params: {
        invocation_id: "invoke-browser-content-block",
        tool_name: "mcp__autobyteus_agent_tools__open_tab",
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
        tool_name: "mcp__autobyteus_agent_tools__open_tab",
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
        tool_name: "mcp__autobyteus_agent_tools__generate_image",
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

  it("strips the Agent Tools MCP provider from unknown migrated-provider names", () => {
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
        tool_name: "mcp__autobyteus_agent_tools__unknown_tool",
        result: rawResult,
      },
    });

    expect(completed).toMatchObject({
      eventType: AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
      payload: {
        invocation_id: "invoke-unknown-browser-like",
        tool_name: "unknown_tool",
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
        tool_name: "mcp__autobyteus_agent_tools__open_tab",
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
    expect(JSON.stringify(segmentStart.payload)).not.toContain("mcp__autobyteus_agent_tools__open_tab");
  });

  it("normalizes browser MCP tool names in provided segment end metadata", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [segmentEnd] = converter.convert({
      method: ClaudeSessionEventName.ITEM_COMPLETED,
      params: {
        id: "invoke-browser",
        turn_id: "turn-1",
        segment_type: "tool_call",
        tool_name: "mcp__autobyteus_agent_tools__open_tab",
        metadata: {
          tool_name: "mcp__autobyteus_agent_tools__open_tab",
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
    expect(JSON.stringify(segmentEnd.payload)).not.toContain("mcp__autobyteus_agent_tools__open_tab");
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

  it("emits only the neutral explicit turn-completed event", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const completed = converter.convert({
      method: ClaudeSessionEventName.TURN_COMPLETED,
      params: {
        turnId: "turn-claude-1",
        sessionId: "session-1",
      },
    });

    expect(completed).toHaveLength(1);
    expect(completed[0]).toMatchObject({
      eventType: AgentRunEventType.TURN_COMPLETED,
      payload: {
        turnId: "turn-claude-1",
      },
      statusHint: "IDLE",
    });
  });

  it("emits only the neutral explicit turn-started event", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const started = converter.convert({
      method: ClaudeSessionEventName.TURN_STARTED,
      params: {
        turnId: "turn-claude-2",
      },
    });

    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({
      eventType: AgentRunEventType.TURN_STARTED,
      payload: { turnId: "turn-claude-2" },
      statusHint: "ACTIVE",
    });
  });

  it("emits classified terminal error without a backend status companion", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");
    const converted = converter.convert({
      method: ClaudeSessionEventName.ERROR,
      params: {
        code: "CLAUDE_RUNTIME_TURN_FAILED",
        message: "failed",
        error_scope: "turn",
        error_effect: "terminal",
        turn_id: "turn-claude-3",
      },
    });

    expect(converted.map((event) => event.eventType)).toEqual([
      AgentRunEventType.ERROR,
    ]);
    expect(converted[0].payload).toMatchObject({
      error_scope: "turn",
      error_effect: "terminal",
      turn_id: "turn-claude-3",
    });
    expect(converted[0].statusHint).toBe("ERROR");
  });

  it("keeps unclassified Claude errors as content without a guessed status", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");
    const converted = converter.convert({
      method: ClaudeSessionEventName.ERROR,
      params: { code: "UNKNOWN", message: "unclassified" },
    });

    expect(converted).toHaveLength(1);
    expect(converted[0]).toMatchObject({
      eventType: AgentRunEventType.ERROR,
      statusHint: null,
    });
  });



  it("maps Claude token usage session events to TOKEN_USAGE_UPDATED agent-run events", () => {
    const converter = new ClaudeSessionEventConverter("run-claude-converter");

    const [event] = converter.convert({
      method: ClaudeSessionEventName.TOKEN_USAGE_UPDATED,
      params: {
        turn_id: "turn-claude-usage-1",
        session_id: "session-1",
        runtime_kind: "claude_agent_sdk",
        ingestion_kind: "claude_sdk_result",
        usage_scope: "per_turn",
        model_provider: "ANTHROPIC",
        provider_name: null,
        model_identifier: "claude-sonnet-4-6",
        reported_input_tokens: 100,
        reported_output_tokens: 20,
        reported_total_tokens: 120,
        cache_read_input_tokens: 10,
        raw_usage_json: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 10 },
      },
    });

    expect(event).toEqual(expect.objectContaining({
      eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
      runId: "run-claude-converter",
      payload: expect.objectContaining({
        turn_id: "turn-claude-usage-1",
        runtime_kind: "claude_agent_sdk",
        ingestion_kind: "claude_sdk_result",
        usage_scope: "per_turn",
        provider_name: null,
        reported_input_tokens: 100,
        reported_output_tokens: 20,
        reported_total_tokens: 120,
        cache_read_input_tokens: 10,
        raw_usage_json: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 10 },
      }),
    }));
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
