import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { buildClaudeBrowserToolDefinitions } from "./build-claude-browser-tool-definitions.js";

export const buildClaudeBrowserMcpServers = async (options: {
  sdkClient: ClaudeSdkClient;
  enabledToolNames?: Iterable<string> | null;
}): Promise<Record<string, unknown> | null> => {
  const toolDefinitions = await buildClaudeBrowserToolDefinitions(options);
  if (!toolDefinitions || toolDefinitions.length === 0) {
    return null;
  }

  const normalized = await options.sdkClient.createMcpServer({
    name: "autobyteus_browser",
    tools: toolDefinitions,
  });
  if (!normalized) {
    throw new Error(
      "CLAUDE_BROWSER_MCP_UNAVAILABLE: Unable to build browser MCP server configuration.",
    );
  }

  return {
    autobyteus_browser: normalized,
  };
};
