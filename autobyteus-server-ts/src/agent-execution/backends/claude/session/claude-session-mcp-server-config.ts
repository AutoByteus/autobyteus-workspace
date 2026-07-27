import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { buildClaudeSessionMcpServers } from "./build-claude-session-mcp-servers.js";

export const buildClaudeSessionMcpServerConfig = (input: {
  agentToolsMcpDescriptor?: AgentToolMcpDescriptor | null;
}): Promise<Record<string, unknown> | null> =>
  buildClaudeSessionMcpServers({
    agentToolsMcpDescriptor: input.agentToolsMcpDescriptor ?? null,
  });
