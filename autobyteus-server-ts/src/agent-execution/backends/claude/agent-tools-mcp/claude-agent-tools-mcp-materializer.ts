import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { AGENT_TOOLS_MCP_SERVER_NAME } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME } from "./claude-agent-tools-mcp-tool-name.js";

export type ClaudeAgentToolsMcpHttpServerConfig = {
  type: "http";
  url: string;
  headers: AgentToolMcpDescriptor["headers"];
};

export type ClaudeAgentToolsMcpServerMap = {
  [AGENT_TOOLS_MCP_SERVER_NAME]: ClaudeAgentToolsMcpHttpServerConfig;
};

export const materializeClaudeAgentToolsMcpServers = (
  descriptor: AgentToolMcpDescriptor,
): ClaudeAgentToolsMcpServerMap => ({
  [AGENT_TOOLS_MCP_SERVER_NAME]: {
    type: "http",
    url: descriptor.serverUrl,
    headers: { ...descriptor.headers },
  },
});

export { CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME };
