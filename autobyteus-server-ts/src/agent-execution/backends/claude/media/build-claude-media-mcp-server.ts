import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { buildClaudeMediaToolDefinitions } from "./build-claude-media-tool-definitions.js";

export const CLAUDE_MEDIA_MCP_SERVER_NAME = "autobyteus_image_audio";

export const buildClaudeMediaMcpServer = async (options: {
  sdkClient: ClaudeSdkClient;
  enabledToolNames?: Iterable<string> | null;
  workingDirectory: string;
}): Promise<Record<string, unknown> | null> => {
  const toolDefinitions = await buildClaudeMediaToolDefinitions(options);
  if (!toolDefinitions || toolDefinitions.length === 0) {
    return null;
  }

  const normalized = await options.sdkClient.createMcpServer({
    name: CLAUDE_MEDIA_MCP_SERVER_NAME,
    tools: toolDefinitions,
  });
  if (!normalized) {
    throw new Error(
      "CLAUDE_MEDIA_MCP_UNAVAILABLE: Unable to build media MCP server configuration.",
    );
  }

  return {
    [CLAUDE_MEDIA_MCP_SERVER_NAME]: normalized,
  };
};
