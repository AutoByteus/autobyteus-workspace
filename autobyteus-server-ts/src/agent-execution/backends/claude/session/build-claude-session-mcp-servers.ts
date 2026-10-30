import { materializeClaudeAgentToolsMcpServers } from "../agent-tools-mcp/claude-agent-tools-mcp-materializer.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";

export const buildClaudeSessionMcpServers = async (options: {
  agentToolsMcpDescriptor: AgentToolMcpDescriptor;
}): Promise<Record<string, unknown>> =>
  materializeClaudeAgentToolsMcpServers(options.agentToolsMcpDescriptor);
