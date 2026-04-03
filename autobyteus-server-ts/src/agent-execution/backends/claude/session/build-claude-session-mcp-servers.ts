import { buildClaudeTeamMcpServers } from "../../../../agent-team-execution/backends/claude/claude-team-mcp-server-builder.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { ClaudeSessionEvent } from "../claude-runtime-shared.js";
import type { ClaudeSendMessageToolApprovalHandler } from "../../../../agent-team-execution/backends/claude/claude-send-message-tool-call-handler.js";
import type { ClaudeRunContext } from "../backend/claude-agent-run-context.js";
import { buildClaudeBrowserMcpServers } from "../browser/build-claude-browser-mcp-servers.js";

const mergeMcpServerMaps = (
  ...maps: Array<Record<string, unknown> | null>
): Record<string, unknown> | null => {
  const merged: Record<string, unknown> = {};
  for (const map of maps) {
    if (!map) {
      continue;
    }
    Object.assign(merged, map);
  }
  return Object.keys(merged).length > 0 ? merged : null;
};

export const buildClaudeSessionMcpServers = async (options: {
  sendMessageToToolingEnabled: boolean;
  enabledBrowserToolNames?: Iterable<string> | null;
  runContext: ClaudeRunContext;
  sdkClient: ClaudeSdkClient;
  requestToolApproval: ClaudeSendMessageToolApprovalHandler | null;
  emitEvent: (runContext: ClaudeRunContext, event: ClaudeSessionEvent) => void;
}): Promise<Record<string, unknown> | null> => {
  const teamMcpServers = options.sendMessageToToolingEnabled
    ? await buildClaudeTeamMcpServers({
        runContext: options.runContext,
        sdkClient: options.sdkClient,
        requestToolApproval: options.requestToolApproval,
        emitEvent: options.emitEvent,
      })
    : null;

  if (options.sendMessageToToolingEnabled && !teamMcpServers) {
    throw new Error(
      "CLAUDE_QUERY_MCP_UNAVAILABLE: Unable to build team MCP server configuration.",
    );
  }

  const browserMcpServers = await buildClaudeBrowserMcpServers({
    sdkClient: options.sdkClient,
    enabledToolNames: options.enabledBrowserToolNames,
  });

  return mergeMcpServerMaps(teamMcpServers, browserMcpServers);
};
