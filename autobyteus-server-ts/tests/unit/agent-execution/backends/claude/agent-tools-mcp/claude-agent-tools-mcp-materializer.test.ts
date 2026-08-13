import { describe, expect, it } from "vitest";
import {
  CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME,
  materializeClaudeAgentToolsMcpServers,
} from "../../../../../../src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-materializer.js";
import {
  normalizeClaudeAgentToolsToolNameForEvent,
} from "../../../../../../src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-tool-name.js";
import type { AgentToolMcpDescriptor } from "../../../../../../src/agent-tools/mcp/agent-tool-mcp-session.js";

const descriptor: AgentToolMcpDescriptor = {
  name: "autobyteus_agent_tools",
  transport: "streamable_http",
  serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-materializer",
  headers: {
    Authorization: "Bearer unit-test-token",
  },
  enabledTools: ["send_message_to", "open_tab"],
};

describe("claude-agent-tools-mcp-materializer", () => {
  it("maps an Agent Tools MCP descriptor to Claude SDK HTTP MCP server config", () => {
    const result = materializeClaudeAgentToolsMcpServers(descriptor);

    expect(result).toEqual({
      autobyteus_agent_tools: {
        type: "http",
        url: "http://127.0.0.1:3000/mcp/agent-tools/session-materializer",
        headers: {
          Authorization: "Bearer unit-test-token",
        },
        alwaysLoad: true,
      },
    });
    expect(result.autobyteus_agent_tools).not.toHaveProperty("enabledTools");
  });

  it("derives the Claude Agent Tools send_message_to MCP wire name and canonical event name", () => {
    expect(CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME).toBe(
      "mcp__autobyteus_agent_tools__send_message_to",
    );
    expect(
      normalizeClaudeAgentToolsToolNameForEvent(
        "mcp__autobyteus_agent_tools__send_message_to",
      ),
    ).toBe("send_message_to");
    expect(
      normalizeClaudeAgentToolsToolNameForEvent(
        "mcp__autobyteus_agent_tools__open_tab",
      ),
    ).toBe("open_tab");
    expect(
      normalizeClaudeAgentToolsToolNameForEvent(
        "mcp__autobyteus_agent_tools__open_tab Authorization: Bearer secret",
      ),
    ).toBe("mcp__autobyteus_agent_tools__open_tab Authorization: Bearer secret");
    expect(normalizeClaudeAgentToolsToolNameForEvent("Bash")).toBe("Bash");
  });
});
