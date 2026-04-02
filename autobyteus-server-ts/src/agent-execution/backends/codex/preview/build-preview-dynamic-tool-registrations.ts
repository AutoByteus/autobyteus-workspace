import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolCallResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import type { JsonObject } from "../codex-app-server-json.js";
import type { PreviewToolParameterSpec } from "../../../../agent-tools/preview/preview-tool-contract.js";
import { PREVIEW_TOOL_MANIFEST } from "../../../../agent-tools/preview/preview-tool-manifest.js";
import {
  toPreviewErrorPayload,
  toPreviewJsonString,
} from "../../../../agent-tools/preview/preview-tool-serialization.js";
import { getPreviewToolService } from "../../../../agent-tools/preview/preview-tool-service.js";

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildCodexSchemaProperty = (parameter: PreviewToolParameterSpec): JsonObject => {
  const property: JsonObject = {
    description: parameter.description,
  };

  switch (parameter.type) {
    case "string":
      property.type = "string";
      break;
    case "boolean":
      property.type = "boolean";
      break;
    case "integer":
      property.type = "integer";
      if (parameter.minimum !== undefined) {
        property.minimum = parameter.minimum;
      }
      if (parameter.maximum !== undefined) {
        property.maximum = parameter.maximum;
      }
      break;
    case "enum":
      property.type = "string";
      property.enum = parameter.enum_values ? [...parameter.enum_values] : [];
      break;
  }

  return property;
};

const buildCodexInputSchema = (
  parameters: PreviewToolParameterSpec[],
): JsonObject => {
  const properties: JsonObject = {};
  const required: string[] = [];

  for (const parameter of parameters) {
    properties[parameter.name] = buildCodexSchemaProperty(parameter);
    if (parameter.required) {
      required.push(parameter.name);
    }
  }

  const inputSchema: JsonObject = {
    type: "object",
    properties,
    additionalProperties: false,
  };

  if (required.length > 0) {
    inputSchema.required = required;
  }

  return inputSchema;
};

const runPreviewOperation = async (
  operation: () => Promise<unknown>,
): Promise<CodexDynamicToolCallResult> => {
  try {
    const result = await operation();
    return createCodexDynamicToolTextResult(toPreviewJsonString(result), true);
  } catch (error) {
    return createCodexDynamicToolTextResult(
      toPreviewJsonString(toPreviewErrorPayload(error)),
      false,
    );
  }
};

export const buildPreviewDynamicToolRegistrations = ():
  | CodexDynamicToolRegistration[]
  | null => {
  const previewToolService = getPreviewToolService();
  if (!previewToolService.isPreviewSupported()) {
    return null;
  }

  return PREVIEW_TOOL_MANIFEST.map((entry) => ({
    spec: {
      name: entry.name,
      description: entry.description,
      inputSchema: buildCodexInputSchema(entry.parameters),
    },
    handler: async ({ arguments: toolArguments }) =>
      runPreviewOperation(async () =>
        entry.execute(previewToolService, entry.parseInput(asRawArguments(toolArguments))),
      ),
  }));
};
