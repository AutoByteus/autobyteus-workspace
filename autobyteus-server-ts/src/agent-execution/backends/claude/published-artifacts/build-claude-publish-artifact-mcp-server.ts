import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { buildClaudePublishArtifactToolDefinition } from "./build-claude-publish-artifact-tool-definition.js";

export const buildClaudePublishArtifactMcpServer = async (options: {
  sdkClient: ClaudeSdkClient;
  runId: string;
}): Promise<Record<string, unknown> | null> => {
  const toolDefinition = await buildClaudePublishArtifactToolDefinition(options);
  const normalized = await options.sdkClient.createMcpServer({
    name: "autobyteus_published_artifacts",
    tools: [toolDefinition],
  });
  if (!normalized) {
    throw new Error(
      "CLAUDE_PUBLISHED_ARTIFACT_MCP_UNAVAILABLE: Unable to build publish_artifact MCP server configuration.",
    );
  }

  return {
    autobyteus_published_artifacts: normalized,
  };
};
