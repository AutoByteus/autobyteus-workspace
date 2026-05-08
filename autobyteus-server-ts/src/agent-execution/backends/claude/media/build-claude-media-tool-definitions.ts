import { z } from "zod";
import {
  ParameterSchema,
  ParameterType,
  type ParameterDefinition,
} from "autobyteus-ts/utils/parameter-schema.js";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import { MEDIA_TOOL_MANIFEST } from "../../../../agent-tools/media/media-tool-manifest.js";
import { getMediaGenerationService } from "../../../../agent-tools/media/media-generation-service.js";
import {
  toMediaJsonString,
  toMediaToolErrorPayload,
} from "../../../../agent-tools/media/media-tool-serialization.js";
import type { MediaToolExecutionContext } from "../../../../agent-tools/media/media-tool-contract.js";

const createClaudeMediaToolResult = (value: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: toMediaJsonString(value) }],
});

const createClaudeMediaToolErrorResult = (error: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: toMediaJsonString(toMediaToolErrorPayload(error)) }],
  isError: true,
});

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildClaudeSchemaFromParameterSchema = (
  parameterSchema: ParameterSchema,
): Record<string, z.ZodTypeAny> => {
  const inputSchema: Record<string, z.ZodTypeAny> = {};
  for (const parameter of parameterSchema.parameters) {
    inputSchema[parameter.name] = buildClaudeParameterSchema(parameter);
  }
  return inputSchema;
};

const buildArrayItemSchema = (
  itemSchema: ParameterDefinition["arrayItemSchema"],
): z.ZodTypeAny => {
  if (itemSchema instanceof ParameterSchema) {
    return z.object(buildClaudeSchemaFromParameterSchema(itemSchema));
  }
  if (typeof itemSchema === "string") {
    return buildPrimitiveZodType(itemSchema as ParameterType);
  }
  if (itemSchema && typeof itemSchema === "object") {
    return z.unknown();
  }
  return z.unknown();
};

const buildPrimitiveZodType = (type: ParameterType): z.ZodTypeAny => {
  switch (type) {
    case ParameterType.INTEGER:
      return z.number().int();
    case ParameterType.FLOAT:
      return z.number();
    case ParameterType.BOOLEAN:
      return z.boolean();
    case ParameterType.OBJECT:
      return z.record(z.string(), z.unknown());
    case ParameterType.ARRAY:
      return z.array(z.unknown());
    case ParameterType.STRING:
    case ParameterType.ENUM:
    default:
      return z.string();
  }
};

const buildClaudeParameterSchema = (
  parameter: ParameterDefinition,
): z.ZodTypeAny => {
  let schema: z.ZodTypeAny;

  switch (parameter.type) {
    case ParameterType.STRING:
      schema = z.string();
      break;
    case ParameterType.INTEGER:
      schema = z.number().int();
      if (parameter.minValue !== undefined) schema = (schema as z.ZodNumber).min(parameter.minValue);
      if (parameter.maxValue !== undefined) schema = (schema as z.ZodNumber).max(parameter.maxValue);
      break;
    case ParameterType.FLOAT:
      schema = z.number();
      if (parameter.minValue !== undefined) schema = (schema as z.ZodNumber).min(parameter.minValue);
      if (parameter.maxValue !== undefined) schema = (schema as z.ZodNumber).max(parameter.maxValue);
      break;
    case ParameterType.BOOLEAN:
      schema = z.boolean();
      break;
    case ParameterType.ENUM:
      schema = parameter.enumValues?.length
        ? z.enum(parameter.enumValues as [string, ...string[]])
        : z.string();
      break;
    case ParameterType.OBJECT:
      schema = parameter.objectSchema
        ? z.object(buildClaudeSchemaFromParameterSchema(parameter.objectSchema))
        : z.record(z.string(), z.unknown());
      break;
    case ParameterType.ARRAY:
      schema = z.array(buildArrayItemSchema(parameter.arrayItemSchema));
      break;
  }

  if (!parameter.required) {
    schema = schema.optional();
  }
  return schema.describe(parameter.description);
};

export const buildClaudeMediaToolDefinitions = async (options: {
  sdkClient: ClaudeSdkClient;
  enabledToolNames?: Iterable<string> | null;
  workingDirectory: string;
}): Promise<Record<string, unknown>[] | null> => {
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

  return Promise.all(
    manifestEntries.map((entry) =>
      options.sdkClient.createToolDefinition({
        name: entry.name,
        description: entry.getDescription(),
        inputSchema: buildClaudeSchemaFromParameterSchema(entry.buildArgumentSchema()),
        handler: async (rawArguments: unknown) => {
          try {
            return createClaudeMediaToolResult(
              await entry.execute(
                mediaService,
                executionContext,
                entry.parseInput(asRawArguments(rawArguments)),
              ),
            );
          } catch (error) {
            return createClaudeMediaToolErrorResult(error);
          }
        },
      }),
    ),
  );
};
