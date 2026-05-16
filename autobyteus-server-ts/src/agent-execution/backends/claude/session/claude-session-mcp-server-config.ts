import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import type { ClaudeSessionEvent } from "../claude-runtime-shared.js";
import type { ClaudeSessionToolUseCoordinator } from "./claude-session-tool-use-coordinator.js";
import { buildClaudeSessionMcpServers } from "./build-claude-session-mcp-servers.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";

export const buildClaudeSessionMcpServerConfig = (input: {
  sendMessageToToolingEnabled: boolean;
  enabledBrowserToolNames: string[];
  enabledMediaToolNames: string[];
  publishArtifactsToolingEnabled: boolean;
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  toolingCoordinator: ClaudeSessionToolUseCoordinator;
  emitRuntimeEvent: (event: ClaudeSessionEvent) => void;
}): Promise<Record<string, unknown> | null> =>
  buildClaudeSessionMcpServers({
    sendMessageToToolingEnabled: input.sendMessageToToolingEnabled,
    enabledBrowserToolNames: input.enabledBrowserToolNames,
    enabledMediaToolNames: input.enabledMediaToolNames,
    publishArtifactsToolingEnabled: input.publishArtifactsToolingEnabled,
    runContext: input.runContext,
    sdkClient: input.sdkClient,
    requestToolApproval: input.sendMessageToToolingEnabled
      ? ({ invocationId, toolName, toolArguments }) =>
          input.toolingCoordinator.requestToolApprovalDecision({
            runContext: input.runContext,
            invocationId,
            toolName,
            toolInput: toolArguments,
          })
      : null,
    emitEvent: (_runContext, event) => input.emitRuntimeEvent(event),
  });
