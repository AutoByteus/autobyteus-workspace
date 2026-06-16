import { describe, expect, it } from "vitest";
import {
  CODEX_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME,
  isCodexAgentToolsSendMessageToolName,
  materializeCodexAgentToolsMcpThreadConfig,
  normalizeCodexAgentToolsToolNameForEvent,
} from "../../../../../../src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.js";
import type { AgentToolMcpDescriptor } from "../../../../../../src/agent-tools/mcp/agent-tool-mcp-session.js";

const descriptor: AgentToolMcpDescriptor = {
  name: "autobyteus_agent_tools",
  transport: "streamable_http",
  serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-materializer",
  headers: {
    Authorization: "Bearer unit-test-token",
  },
  enabledTools: ["send_message_to", "generate_image", "db_query"],
};

describe("codex-agent-tools-mcp-materializer", () => {
  it("maps an Agent Tools MCP descriptor to Codex App Server thread-scoped config", () => {
    const result = materializeCodexAgentToolsMcpThreadConfig(descriptor);

    expect(result).toEqual({
      mcp_servers: {
        autobyteus_agent_tools: {
          url: "http://127.0.0.1:3000/mcp/agent-tools/session-materializer",
          http_headers: {
            Authorization: "Bearer unit-test-token",
          },
          enabled_tools: ["send_message_to", "generate_image", "db_query"],
          startup_timeout_sec: 5,
        },
      },
    });
    expect(result.mcp_servers.autobyteus_agent_tools).not.toHaveProperty("headers");
    expect(result.mcp_servers.autobyteus_agent_tools).not.toHaveProperty("enabledTools");
  });

  it("derives the Codex Agent Tools send_message_to MCP wire name and canonical event name", () => {
    expect(CODEX_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME).toBe(
      "mcp__autobyteus_agent_tools__send_message_to",
    );
    expect(
      normalizeCodexAgentToolsToolNameForEvent(
        "mcp__autobyteus_agent_tools__send_message_to",
      ),
    ).toBe("send_message_to");
    expect(
      normalizeCodexAgentToolsToolNameForEvent("autobyteus_agent_tools.send_message_to"),
    ).toBe("send_message_to");
    expect(
      normalizeCodexAgentToolsToolNameForEvent("mcp__autobyteus_agent_tools__generate_image"),
    ).toBe("generate_image");
    expect(
      normalizeCodexAgentToolsToolNameForEvent("mcp__autobyteus_agent_tools__db_query"),
    ).toBe("db_query");
    expect(
      normalizeCodexAgentToolsToolNameForEvent(
        "mcp__autobyteus_agent_tools__generate_image Authorization: Bearer secret",
      ),
    ).toBe("mcp__autobyteus_agent_tools__generate_image Authorization: Bearer secret");
    expect(isCodexAgentToolsSendMessageToolName("run_bash")).toBe(false);
  });
});
