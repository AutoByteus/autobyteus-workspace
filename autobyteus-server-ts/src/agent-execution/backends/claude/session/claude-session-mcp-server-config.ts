import type { AgentToolMcpSession } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { buildClaudeSessionMcpServers } from "./build-claude-session-mcp-servers.js";

export const buildClaudeSessionMcpServerConfig = (input: {
  agentToolsMcpSession?: AgentToolMcpSession | null;
  sdkClient: Pick<ClaudeSdkClient, "createToolDefinition" | "createMcpServer">;
}): Promise<Record<string, unknown> | null> =>
  buildClaudeSessionMcpServers({
    agentToolsMcpSession: input.agentToolsMcpSession ?? null,
    sdkClient: input.sdkClient,
  });
