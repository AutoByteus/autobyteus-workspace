import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import type { JsonObject } from "../codex-app-server-json.js";
import {
  PUBLISH_ARTIFACTS_TOOL_DESCRIPTION,
  PUBLISH_ARTIFACTS_TOOL_NAME,
  normalizePublishArtifactsToolInput,
} from "../../../../services/published-artifacts/published-artifact-tool-contract.js";
import { getPublishedArtifactPublicationService } from "../../../../services/published-artifacts/published-artifact-publication-service.js";

const buildInputSchema = (): JsonObject => ({
  type: "object",
  properties: {
    artifacts: {
      type: "array",
      minItems: 1,
      description:
        "Non-empty list of files to publish. Use a one-item array for a single artifact.",
      items: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description:
              "Absolute path to the file that should be published as an artifact. Prefer the exact absolute path returned by write_file; the file must still be inside the current workspace.",
          },
          description: {
            type: ["string", "null"],
            description: "Optional short description for reviewers and application consumers.",
          },
        },
        required: ["path"],
        additionalProperties: false,
      },
    },
  },
  required: ["artifacts"],
  additionalProperties: false,
});

export const buildCodexPublishArtifactsDynamicToolRegistration = ():
  | CodexDynamicToolRegistration[]
  | null => [{
  spec: {
    name: PUBLISH_ARTIFACTS_TOOL_NAME,
    description: PUBLISH_ARTIFACTS_TOOL_DESCRIPTION,
    inputSchema: buildInputSchema(),
  },
  handler: async ({ runId, arguments: rawArguments }) => {
    const input = normalizePublishArtifactsToolInput(rawArguments);
    const artifacts = await getPublishedArtifactPublicationService().publishManyForRun({
      runId,
      artifacts: input.artifacts,
    });
    return createCodexDynamicToolTextResult(JSON.stringify({ success: true, artifacts }), true);
  },
}];
