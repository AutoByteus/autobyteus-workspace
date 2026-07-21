import { AGENT_TOOLS_MCP_SERVER_NAME, type AgentToolMcpSession } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import { getAgentToolMcpCatalog } from "../../../../agent-tools/mcp/agent-tool-mcp-catalog.js";
import { getAgentToolMcpToolExecutor } from "../../../../agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import { getAgentToolsMcpResultMapper } from "../../../../agent-tools/mcp/agent-tools-mcp-result-mapper.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";

export const buildClaudeSessionMcpServers = async (options: {
  agentToolsMcpSession?: AgentToolMcpSession | null;
  sdkClient: Pick<ClaudeSdkClient, "createToolDefinition" | "createMcpServer">;
}): Promise<Record<string, unknown> | null> => {
  const session = options.agentToolsMcpSession ?? null;
  if (!session || session.enabledTools.length === 0) {
    return null;
  }
  const catalog = getAgentToolMcpCatalog();
  const executor = getAgentToolMcpToolExecutor();
  const resultMapper = getAgentToolsMcpResultMapper();
  const tools = await Promise.all(catalog.listMcpToolsForSession(session).map((definition) =>
    options.sdkClient.createToolDefinition({
      name: definition.name,
      description: definition.description,
      inputSchema: definition.inputSchema,
      handler: async (rawArguments) => {
        const argumentsRecord = rawArguments && typeof rawArguments === "object" && !Array.isArray(rawArguments)
          ? rawArguments as Record<string, unknown>
          : {};
        const result = await executor.executeAgentToolMcpCall({
          session,
          toolName: definition.name,
          rawArguments: argumentsRecord,
        });
        return resultMapper.toolResultFromExecutionResult(definition.name, result);
      },
    }),
  ));
  const server = await options.sdkClient.createMcpServer({
    name: AGENT_TOOLS_MCP_SERVER_NAME,
    tools,
  });
  return server ? { [AGENT_TOOLS_MCP_SERVER_NAME]: server } : null;
};
