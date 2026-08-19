import { describe, expect, it } from "vitest";
import type { AgentToolMcpDescriptor } from "../../../../../../src/agent-tools/mcp/agent-tool-mcp-session.js";
import { buildClaudeSessionMcpServers } from "../../../../../../src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.js";

const fakeAgentToolsDescriptor: AgentToolMcpDescriptor = {
  name: "autobyteus_agent_tools",
  transport: "streamable_http",
  serverUrl: "http://127.0.0.1:3000/mcp/agent-tools/session-1",
  headers: {
    Authorization: "Bearer fake-token",
  },
  enabledTools: ["send_message_to", "open_tab", "generate_image", "publish_artifacts"],
};

describe("buildClaudeSessionMcpServers", () => {
  it("returns only the unified Agent Tools MCP HTTP server for migrated tools", async () => {
    const result = await buildClaudeSessionMcpServers({
      agentToolsMcpDescriptor: fakeAgentToolsDescriptor,
    });

    expect(result).toEqual({
      autobyteus_agent_tools: {
        type: "http",
        url: "http://127.0.0.1:3000/mcp/agent-tools/session-1",
        headers: {
          Authorization: "Bearer fake-token",
        },
        alwaysLoad: true,
      },
    });
    expect(Object.keys(result ?? {})).toEqual(["autobyteus_agent_tools"]);
  });

  it("returns null when no Agent Tools MCP descriptor has enabled tools", async () => {
    await expect(buildClaudeSessionMcpServers({})).resolves.toBeNull();
    await expect(
      buildClaudeSessionMcpServers({
        agentToolsMcpDescriptor: {
          ...fakeAgentToolsDescriptor,
          enabledTools: [],
        },
      }),
    ).resolves.toBeNull();
  });
});
