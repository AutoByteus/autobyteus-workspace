import {
  getMediaGenerationService,
  type MediaGenerationService,
} from "../../media/media-generation-service.js";
import { MEDIA_TOOL_MANIFEST } from "../../media/media-tool-manifest.js";
import type { MediaToolExecutionContext } from "../../media/media-tool-contract.js";
import {
  toMediaJsonString,
  toMediaToolErrorPayload,
} from "../../media/media-tool-serialization.js";
import type {
  AgentToolMcpAdapterProvider,
  AgentToolMcpToolAdapter,
} from "../agent-tool-mcp-adapter.js";
import {
  createAgentToolsMcpErrorResult,
  createAgentToolsMcpSuccessResult,
} from "../agent-tools-mcp-operation-result.js";

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export class MediaToolsMcpAdapterProvider implements AgentToolMcpAdapterProvider {
  constructor(
    private readonly mediaGenerationService: MediaGenerationService = getMediaGenerationService(),
  ) {}

  getAdapters(): AgentToolMcpToolAdapter[] {
    return MEDIA_TOOL_MANIFEST.map((entry) => ({
      definition: {
        name: entry.name,
        description: entry.getDescription(),
        inputSchema: entry.buildArgumentSchema(),
      },
      isAvailable: () => true,
      execute: async ({ session, rawArguments }) => {
        const context: MediaToolExecutionContext = {
          agentId: session.sender.senderRunId,
          runId: session.owner.runId,
          workspaceRootPath: session.executionContext.workingDirectory ?? null,
        };
        try {
          const result = await entry.execute(
            this.mediaGenerationService,
            context,
            entry.parseInput(asRawArguments(rawArguments)),
          );
          return createAgentToolsMcpSuccessResult(toMediaJsonString(result));
        } catch (error) {
          return createAgentToolsMcpErrorResult(
            toMediaJsonString(toMediaToolErrorPayload(error)),
            "media_tool_execution_failed",
          );
        }
      },
    }));
  }
}
