import { z } from "zod";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { PreviewToolParameterSpec } from "../../../../agent-tools/preview/preview-tool-contract.js";
import { PREVIEW_TOOL_MANIFEST } from "../../../../agent-tools/preview/preview-tool-manifest.js";
import {
  toPreviewErrorPayload,
  toPreviewJsonString,
} from "../../../../agent-tools/preview/preview-tool-serialization.js";
import { getPreviewToolService } from "../../../../agent-tools/preview/preview-tool-service.js";

const createClaudePreviewToolResult = (
  value: unknown,
): Record<string, unknown> => ({
  content: [{ type: "text", text: toPreviewJsonString(value) }],
});

const createClaudePreviewToolErrorResult = (
  error: unknown,
): Record<string, unknown> => ({
  content: [{ type: "text", text: toPreviewJsonString(toPreviewErrorPayload(error)) }],
  isError: true,
});

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildClaudeParameterSchema = (
  parameter: PreviewToolParameterSpec,
): z.ZodTypeAny => {
  let schema: z.ZodTypeAny;

  switch (parameter.type) {
    case "string":
      schema = z.string().min(1, `${parameter.name} is required`);
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "integer":
      schema = z.number().int();
      if (parameter.minimum !== undefined) {
        schema = (schema as z.ZodNumber).min(parameter.minimum);
      }
      if (parameter.maximum !== undefined) {
        schema = (schema as z.ZodNumber).max(parameter.maximum);
      }
      break;
    case "enum":
      if (!parameter.enum_values || parameter.enum_values.length === 0) {
        throw new Error(`Preview manifest enum parameter '${parameter.name}' has no values.`);
      }
      schema = z.enum(parameter.enum_values as [string, ...string[]]);
      break;
  }

  if (!parameter.required) {
    schema = schema.optional();
  }

  return schema.describe(parameter.description);
};

const buildClaudeInputSchema = (
  parameters: PreviewToolParameterSpec[],
): Record<string, z.ZodTypeAny> => {
  const inputSchema: Record<string, z.ZodTypeAny> = {};

  for (const parameter of parameters) {
    inputSchema[parameter.name] = buildClaudeParameterSchema(parameter);
  }

  return inputSchema;
};

export const buildClaudePreviewToolDefinitions = async (options: {
  sdkClient: ClaudeSdkClient;
}): Promise<Record<string, unknown>[] | null> => {
  const previewToolService = getPreviewToolService();
  if (!previewToolService.isPreviewSupported()) {
    return null;
  }

  return Promise.all(
    PREVIEW_TOOL_MANIFEST.map((entry) =>
      options.sdkClient.createToolDefinition({
        name: entry.name,
        description: entry.description,
        inputSchema: buildClaudeInputSchema(entry.parameters),
        handler: async (rawArguments) => {
          try {
            return createClaudePreviewToolResult(
              await entry.execute(
                previewToolService,
                entry.parseInput(asRawArguments(rawArguments)),
              ),
            );
          } catch (error) {
            return createClaudePreviewToolErrorResult(error);
          }
        },
      }),
    ),
  );
};
