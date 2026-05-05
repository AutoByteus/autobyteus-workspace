import type { ParameterSchema } from "autobyteus-ts/utils/parameter-schema.js";
import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolCallResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import type { JsonObject } from "../codex-app-server-json.js";
import { MEDIA_TOOL_MANIFEST } from "../../../../agent-tools/media/media-tool-manifest.js";
import {
  toMediaJsonString,
  toMediaToolErrorPayload,
} from "../../../../agent-tools/media/media-tool-serialization.js";
import { getMediaGenerationService } from "../../../../agent-tools/media/media-generation-service.js";
import type { MediaToolExecutionContext } from "../../../../agent-tools/media/media-tool-contract.js";

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const withNoAdditionalProperties = (schema: unknown): unknown => {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return schema;
  }

  const result: Record<string, unknown> = { ...(schema as Record<string, unknown>) };
  if (result.type === "object") {
    result.additionalProperties = false;
  }

  if (result.properties && typeof result.properties === "object" && !Array.isArray(result.properties)) {
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(result.properties as Record<string, unknown>)) {
      properties[key] = withNoAdditionalProperties(value);
    }
    result.properties = properties;
  }

  if (result.items) {
    result.items = withNoAdditionalProperties(result.items);
  }

  return result;
};

const buildCodexInputSchema = (parameterSchema: ParameterSchema): JsonObject =>
  withNoAdditionalProperties(parameterSchema.toJsonSchema()) as JsonObject;

const runMediaOperation = async (
  operation: () => Promise<unknown>,
): Promise<CodexDynamicToolCallResult> => {
  try {
    return createCodexDynamicToolTextResult(toMediaJsonString(await operation()), true);
  } catch (error) {
    return createCodexDynamicToolTextResult(
      toMediaJsonString(toMediaToolErrorPayload(error)),
      false,
    );
  }
};

export const buildMediaDynamicToolRegistrationsForEnabledToolNames = (options: {
  enabledToolNames?: Iterable<string> | null;
  workingDirectory: string;
}): CodexDynamicToolRegistration[] | null => {
  const enabledToolNameSet = new Set(
    Array.from(options.enabledToolNames ?? [])
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );

  const manifestEntries = MEDIA_TOOL_MANIFEST.filter((entry) =>
    enabledToolNameSet.has(entry.name),
  );

  if (manifestEntries.length === 0) {
    return null;
  }

  const mediaService = getMediaGenerationService();
  const executionContext: MediaToolExecutionContext = {
    workspaceRootPath: options.workingDirectory,
  };

  return manifestEntries.map((entry) => ({
    spec: {
      name: entry.name,
      description: entry.getDescription(),
      inputSchema: buildCodexInputSchema(entry.buildArgumentSchema()),
    },
    handler: async ({ arguments: toolArguments, runId }) =>
      runMediaOperation(async () =>
        entry.execute(
          mediaService,
          { ...executionContext, runId, agentId: runId },
          entry.parseInput(asRawArguments(toolArguments)),
        ),
      ),
  }));
};
