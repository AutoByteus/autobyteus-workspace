import { materializeClaudeAgentToolsMcpServers } from "../agent-tools-mcp/claude-agent-tools-mcp-materializer.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";

export const buildClaudeSessionMcpServers = async (options: {
  agentToolsMcpDescriptor?: AgentToolMcpDescriptor | null;
}): Promise<Record<string, unknown> | null> => {
  const descriptor = options.agentToolsMcpDescriptor ?? null;
  if (!descriptor || descriptor.enabledTools.length === 0) {
    return null;
  }
  return materializeClaudeAgentToolsMcpServers(descriptor);
};
