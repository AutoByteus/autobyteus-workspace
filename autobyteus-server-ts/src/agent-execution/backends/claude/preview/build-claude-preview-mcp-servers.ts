import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { buildClaudePreviewToolDefinitions } from "./build-claude-preview-tool-definitions.js";

export const buildClaudePreviewMcpServers = async (options: {
  sdkClient: ClaudeSdkClient;
}): Promise<Record<string, unknown> | null> => {
  const toolDefinitions = await buildClaudePreviewToolDefinitions(options);
  if (!toolDefinitions || toolDefinitions.length === 0) {
    return null;
  }

  const normalized = await options.sdkClient.createMcpServer({
    name: "autobyteus_preview",
    tools: toolDefinitions,
  });
  if (!normalized) {
    throw new Error(
      "CLAUDE_PREVIEW_MCP_UNAVAILABLE: Unable to build preview MCP server configuration.",
    );
  }

  return {
    autobyteus_preview: normalized,
  };
};
