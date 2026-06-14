import { materializeClaudeAgentToolsMcpServers } from "../agent-tools-mcp/claude-agent-tools-mcp-materializer.js";
import { buildClaudeTeamMcpServers } from "../team-communication/claude-team-mcp-server-builder.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { buildClaudeBrowserMcpServers } from "../browser/build-claude-browser-mcp-servers.js";
import { buildClaudeMediaMcpServer } from "../media/build-claude-media-mcp-server.js";
import { buildClaudePublishArtifactsMcpServer } from "../published-artifacts/build-claude-publish-artifacts-mcp-server.js";

const mergeMcpServerMaps = (
  ...maps: Array<Record<string, unknown> | null>
): Record<string, unknown> | null => {
  const merged: Record<string, unknown> = {};
  for (const map of maps) {
    if (!map) {
      continue;
    }
    for (const [name, serverConfig] of Object.entries(map)) {
      if (Object.prototype.hasOwnProperty.call(merged, name)) {
        throw new Error(
          `CLAUDE_MCP_SERVER_NAME_CONFLICT: MCP server '${name}' is already configured for this session.`,
        );
      }
      merged[name] = serverConfig;
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
};

export const buildClaudeSessionMcpServers = async (options: {
  sendMessageToToolingEnabled: boolean;
  agentToolsMcpDescriptor?: AgentToolMcpDescriptor | null;
  taskDelegationToolingEnabled?: boolean;
  enabledTaskDelegationToolNames?: Iterable<string> | null;
  enabledBrowserToolNames?: Iterable<string> | null;
  enabledMediaToolNames?: Iterable<string> | null;
  publishArtifactsToolingEnabled: boolean;
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
}): Promise<Record<string, unknown> | null> => {
  if (options.sendMessageToToolingEnabled && !options.agentToolsMcpDescriptor) {
    throw new Error(
      "CLAUDE_AGENT_TOOLS_MCP_DESCRIPTOR_MISSING: send_message_to tooling requires an Agent Tools MCP descriptor.",
    );
  }

  const agentToolsMcpServers = options.agentToolsMcpDescriptor
    ? materializeClaudeAgentToolsMcpServers(options.agentToolsMcpDescriptor)
    : null;

  const teamMcpServers = options.taskDelegationToolingEnabled === true
    ? await buildClaudeTeamMcpServers({
        runContext: options.runContext,
        sdkClient: options.sdkClient,
        enabledTaskDelegationToolNames: options.enabledTaskDelegationToolNames,
      })
    : null;

  if (options.taskDelegationToolingEnabled === true && !teamMcpServers) {
    throw new Error(
      "CLAUDE_QUERY_MCP_UNAVAILABLE: Unable to build team MCP server configuration.",
    );
  }

  const browserMcpServers = await buildClaudeBrowserMcpServers({
    sdkClient: options.sdkClient,
    enabledToolNames: options.enabledBrowserToolNames,
  });

  const enabledMediaToolNames = Array.from(options.enabledMediaToolNames ?? []);
  const mediaMcpServer = enabledMediaToolNames.length > 0
    ? await buildClaudeMediaMcpServer({
        sdkClient: options.sdkClient,
        enabledToolNames: enabledMediaToolNames,
        workingDirectory: options.runContext.runtimeContext.sessionConfig.workingDirectory,
      })
    : null;

  const publishedArtifactMcpServer = options.publishArtifactsToolingEnabled
    ? await buildClaudePublishArtifactsMcpServer({
        sdkClient: options.sdkClient,
        runId: options.runContext.runId,
      })
    : null;

  return mergeMcpServerMaps(
    agentToolsMcpServers,
    teamMcpServers,
    browserMcpServers,
    mediaMcpServer,
    publishedArtifactMcpServer,
  );
};
