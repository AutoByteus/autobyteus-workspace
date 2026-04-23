import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import type { JsonObject } from "../codex-app-server-json.js";
import {
  PUBLISH_ARTIFACT_TOOL_DESCRIPTION,
  PUBLISH_ARTIFACT_TOOL_NAME,
  normalizePublishArtifactToolInput,
} from "../../../../services/published-artifacts/published-artifact-tool-contract.js";
import { getPublishedArtifactPublicationService } from "../../../../services/published-artifacts/published-artifact-publication-service.js";

const buildInputSchema = (): JsonObject => ({
  type: "object",
  properties: {
    path: {
      type: "string",
      description:
        "Absolute path to the file that should be published as an artifact. Prefer the exact absolute path returned by write_file; the file must still be inside the current workspace.",
    },
    description: {
      type: "string",
      description: "Optional short description for reviewers and application consumers.",
    },
  },
  required: ["path"],
  additionalProperties: false,
});

export const buildCodexPublishArtifactDynamicToolRegistration = ():
  | CodexDynamicToolRegistration[]
  | null => [{
  spec: {
    name: PUBLISH_ARTIFACT_TOOL_NAME,
    description: PUBLISH_ARTIFACT_TOOL_DESCRIPTION,
    inputSchema: buildInputSchema(),
  },
  handler: async ({ runId, arguments: rawArguments }) => {
    const input = normalizePublishArtifactToolInput(rawArguments);
    const artifact = await getPublishedArtifactPublicationService().publishForRun({
      runId,
      path: input.path,
      description: input.description ?? null,
    });
    return createCodexDynamicToolTextResult(JSON.stringify({ success: true, artifact }), true);
  },
}];
