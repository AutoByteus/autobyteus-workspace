import type { AgentToolMcpDescriptor } from "../../../../agent-tools/mcp/agent-tool-mcp-session.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { buildClaudeSessionMcpServers } from "./build-claude-session-mcp-servers.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";

export const buildClaudeSessionMcpServerConfig = (input: {
  sendMessageToToolingEnabled: boolean;
  agentToolsMcpDescriptor?: AgentToolMcpDescriptor | null;
  taskDelegationToolingEnabled: boolean;
  enabledTaskDelegationToolNames: string[];
  enabledBrowserToolNames: string[];
  enabledMediaToolNames: string[];
  publishArtifactsToolingEnabled: boolean;
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
}): Promise<Record<string, unknown> | null> =>
  buildClaudeSessionMcpServers({
    sendMessageToToolingEnabled: input.sendMessageToToolingEnabled,
    agentToolsMcpDescriptor: input.agentToolsMcpDescriptor ?? null,
    taskDelegationToolingEnabled: input.taskDelegationToolingEnabled,
    enabledTaskDelegationToolNames: input.enabledTaskDelegationToolNames,
    enabledBrowserToolNames: input.enabledBrowserToolNames,
    enabledMediaToolNames: input.enabledMediaToolNames,
    publishArtifactsToolingEnabled: input.publishArtifactsToolingEnabled,
    runContext: input.runContext,
    sdkClient: input.sdkClient,
  });
