import { describe, expect, it } from "vitest";
import { normalizeCodexThreadHistoryItem } from "../../../../../../src/agent-execution/backends/codex/history/codex-thread-history-item-normalizer.js";

describe("codex-thread-history-item-normalizer", () => {
  it("keeps Agent Tools MCP send_message_to canonical in history tool traces", () => {
    const normalized = normalizeCodexThreadHistoryItem({
      item: {
        type: "mcpToolCall",
        id: "call-send-message",
        server: "autobyteus_agent_tools",
        tool: "mcp__autobyteus_agent_tools__send_message_to",
        arguments: {
          recipient_name: "pong",
          content: "hello",
        },
        status: "completed",
        contentItems: [
          {
            type: "inputText",
            text: "Delivered message to pong.",
          },
        ],
      },
      turnIndex: 0,
      itemIndex: 1,
    });

    expect(normalized).toMatchObject({
      family: "mcp_tool_call",
      invocationId: "call-send-message",
      toolName: "send_message_to",
      toolArgs: {
        recipient_name: "pong",
        content: "hello",
      },
      toolResult: "Delivered message to pong.",
      toolError: null,
      status: "success",
    });
  });

  it("keeps non-send Agent Tools MCP tool names canonical in history tool traces", () => {
    const normalized = normalizeCodexThreadHistoryItem({
      item: {
        type: "mcpToolCall",
        id: "call-generate-image",
        server: "autobyteus_agent_tools",
        tool: "mcp__autobyteus_agent_tools__generate_image",
        arguments: {
          prompt: "sunrise",
          output_file_path: "out.png",
        },
        status: "completed",
        contentItems: [
          {
            type: "inputText",
            text: "{\"file_path\":\"/tmp/out.png\"}",
          },
        ],
      },
      turnIndex: 0,
      itemIndex: 2,
    });

    expect(normalized).toMatchObject({
      family: "mcp_tool_call",
      invocationId: "call-generate-image",
      toolName: "generate_image",
      toolArgs: {
        prompt: "sunrise",
        output_file_path: "out.png",
      },
      toolResult: {
        file_path: "/tmp/out.png",
      },
      status: "success",
    });
  });

  it("still qualifies non-Agent Tools MCP history items with their server name", () => {
    const normalized = normalizeCodexThreadHistoryItem({
      item: {
        type: "mcpToolCall",
        id: "call-speak",
        server: "tts",
        tool: "speak",
        arguments: {
          text: "hello",
        },
        status: "completed",
        result: {
          ok: true,
        },
      },
      turnIndex: 0,
      itemIndex: 2,
    });

    expect(normalized).toMatchObject({
      toolName: "tts.speak",
      toolArgs: {
        text: "hello",
      },
      status: "success",
    });
  });
});
