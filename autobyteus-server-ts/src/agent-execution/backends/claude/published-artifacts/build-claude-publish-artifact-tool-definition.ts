import { z } from "zod";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import {
  PUBLISH_ARTIFACT_TOOL_DESCRIPTION,
  PUBLISH_ARTIFACT_TOOL_NAME,
  normalizePublishArtifactToolInput,
} from "../../../../services/published-artifacts/published-artifact-tool-contract.js";
import { getPublishedArtifactPublicationService } from "../../../../services/published-artifacts/published-artifact-publication-service.js";

const createToolResult = (value: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

const createToolErrorResult = (error: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }],
  isError: true,
});

export const buildClaudePublishArtifactToolDefinition = async (options: {
  sdkClient: ClaudeSdkClient;
  runId: string;
}): Promise<Record<string, unknown>> =>
  options.sdkClient.createToolDefinition({
    name: PUBLISH_ARTIFACT_TOOL_NAME,
    description: PUBLISH_ARTIFACT_TOOL_DESCRIPTION,
    inputSchema: {
      path: z.string().min(1, "path is required").describe(
        "Workspace-relative path to the file that should be published as an artifact.",
      ),
      description: z.string().min(1).optional().describe(
        "Optional short description for reviewers and application consumers.",
      ),
    },
    handler: async (rawArguments) => {
      try {
        const input = normalizePublishArtifactToolInput(rawArguments);
        const artifact = await getPublishedArtifactPublicationService().publishForRun({
          runId: options.runId,
          path: input.path,
          description: input.description ?? null,
        });
        return createToolResult({ success: true, artifact });
      } catch (error) {
        return createToolErrorResult(error);
      }
    },
  });
