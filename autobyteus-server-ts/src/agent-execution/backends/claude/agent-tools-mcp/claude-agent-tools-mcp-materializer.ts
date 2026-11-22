import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { AGENT_TOOLS_MCP_SERVER_NAME } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import {
  CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME,
  buildClaudeAgentToolsMcpToolName,
} from "./claude-agent-tools-mcp-tool-name.js";

/**
 * autobyteus-587 (RFC-001 RF-6): a tool call that sends files to another node waits until they arrived (up to about
 * 27 minutes for 4 GiB at 20 Mbit/s), so the Agent Tools server's calls may take up to an hour (the SDK's per-server
 * hard wall-clock limit, in milliseconds).
 */
export const CLAUDE_AGENT_TOOLS_TOOL_CALL_TIMEOUT_MS = 3_600_000;

export type ClaudeAgentToolsMcpHttpServerConfig = {
  type: "http";
  url: string;
  alwaysLoad: true;
  timeout: typeof CLAUDE_AGENT_TOOLS_TOOL_CALL_TIMEOUT_MS;
};

export type ClaudeAgentToolsMcpConfig = {
  [AGENT_TOOLS_MCP_SERVER_NAME]: ClaudeAgentToolsMcpHttpServerConfig;
};

export const materializeClaudeAgentToolsMcpServers = (
  descriptor: AgentToolMcpDescriptor,
): ClaudeAgentToolsMcpConfig => ({
  [AGENT_TOOLS_MCP_SERVER_NAME]: {
    type: "http",
    url: descriptor.serverUrl,
    alwaysLoad: true,
    timeout: CLAUDE_AGENT_TOOLS_TOOL_CALL_TIMEOUT_MS,
  },
});

export { CLAUDE_AGENT_TOOLS_SEND_MESSAGE_MCP_TOOL_NAME, buildClaudeAgentToolsMcpToolName };
