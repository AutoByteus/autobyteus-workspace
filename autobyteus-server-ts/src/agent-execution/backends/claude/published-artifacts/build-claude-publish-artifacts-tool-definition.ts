import { z } from "zod";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import {
  PUBLISH_ARTIFACTS_TOOL_DESCRIPTION,
  PUBLISH_ARTIFACTS_TOOL_NAME,
  normalizePublishArtifactsToolInput,
} from "../../../../services/published-artifacts/published-artifact-tool-contract.js";
import { getPublishedArtifactPublicationService } from "../../../../services/published-artifacts/published-artifact-publication-service.js";

const createToolResult = (value: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

const createToolErrorResult = (error: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }) }],
  isError: true,
});

export const buildClaudePublishArtifactsToolDefinition = async (options: {
  sdkClient: ClaudeSdkClient;
  runId: string;
}): Promise<Record<string, unknown>> =>
  options.sdkClient.createToolDefinition({
    name: PUBLISH_ARTIFACTS_TOOL_NAME,
    description: PUBLISH_ARTIFACTS_TOOL_DESCRIPTION,
    inputSchema: {
      artifacts: z.array(
        z.object({
          path: z.string().min(1, "path is required").describe(
            "Absolute path to the file that should be published as an artifact. Prefer the exact absolute path returned by write_file; the file must still be inside the current workspace.",
          ),
          description: z.string().nullable().optional().describe(
            "Optional short description for reviewers and application consumers.",
          ),
        }).strict(),
      ).min(1, "at least one artifact is required").describe(
        "Non-empty list of files to publish. Use a one-item array for a single artifact.",
      ),
    },
    handler: async (rawArguments) => {
      try {
        const input = normalizePublishArtifactsToolInput(rawArguments);
        const artifacts = await getPublishedArtifactPublicationService().publishManyForRun({
          runId: options.runId,
          artifacts: input.artifacts,
        });
        return createToolResult({ success: true, artifacts });
      } catch (error) {
        return createToolErrorResult(error);
      }
    },
  });
