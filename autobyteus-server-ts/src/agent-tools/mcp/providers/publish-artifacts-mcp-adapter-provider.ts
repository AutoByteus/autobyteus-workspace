import {
  PUBLISH_ARTIFACTS_TOOL_DESCRIPTION,
  PUBLISH_ARTIFACTS_TOOL_NAME,
  normalizePublishArtifactsToolInput,
} from "../../../services/published-artifacts/published-artifact-tool-contract.js";
import { buildPublishArtifactsParameterSchema } from "../../published-artifacts/publish-artifacts-tool.js";
import { toJsonString } from "../../json-utils.js";
import type {
  AgentToolMcpAdapterProvider,
  AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";
import {
  createAgentToolsMcpErrorResult,
  createAgentToolsMcpSuccessResult,
} from "../agent-tools-mcp-operation-result.js";

const buildErrorPayload = (error: unknown): Record<string, unknown> => ({
  error: {
    code: "publish_artifacts_failed",
    message: error instanceof Error ? error.message : String(error),
  },
});

export class PublishArtifactsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  getAdapters(): AgentToolMcpToolAdapter[] {
    return [
      {
        definition: {
          name: PUBLISH_ARTIFACTS_TOOL_NAME,
          description: PUBLISH_ARTIFACTS_TOOL_DESCRIPTION,
          inputSchema: buildPublishArtifactsParameterSchema(),
        },
        configuredMcpCollisionPolicy: "protect_static_adapter",
        isAvailable: () => true,
        execute: async ({ session, rawArguments }) => {
          try {
            const publication =
              session.executionAuthorities?.publishedArtifactPublication;
            if (!publication) {
              throw new Error(
                "Published artifact publication authority is unavailable for this session.",
              );
            }
            const input = normalizePublishArtifactsToolInput(rawArguments);
            const artifacts = await publication.publishManyForRun({
              runId: session.owner.runId,
              artifacts: input.artifacts,
              fallbackRuntimeContext: {
                memoryDir: session.executionContext.memoryDir ?? null,
                workspaceRootPath: session.executionContext.workingDirectory ?? null,
                applicationExecutionContext:
                  session.executionContext.applicationExecutionContext ?? null,
              },
            });
            return createAgentToolsMcpSuccessResult(toJsonString({ success: true, artifacts }));
          } catch (error) {
            return createAgentToolsMcpErrorResult(
              toJsonString(buildErrorPayload(error)),
              "publish_artifacts_failed",
            );
          }
        },
      },
    ];
  }
}
