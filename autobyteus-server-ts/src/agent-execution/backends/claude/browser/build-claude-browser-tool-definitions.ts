import { z } from "zod";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
import type { BrowserToolParameterSpec } from "../../../../agent-tools/browser/browser-tool-contract.js";
import { BROWSER_TOOL_MANIFEST } from "../../../../agent-tools/browser/browser-tool-manifest.js";
import {
  toBrowserToolErrorPayload,
  toBrowserJsonString,
} from "../../../../agent-tools/browser/browser-tool-serialization.js";
import { getBrowserToolService } from "../../../../agent-tools/browser/browser-tool-service.js";

const createClaudeBrowserToolResult = (
  value: unknown,
): Record<string, unknown> => ({
  content: [{ type: "text", text: toBrowserJsonString(value) }],
});

const createClaudeBrowserToolErrorResult = (
  error: unknown,
): Record<string, unknown> => ({
  content: [{ type: "text", text: toBrowserJsonString(toBrowserToolErrorPayload(error)) }],
  isError: true,
});

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildClaudeParameterSchema = (
  parameter: BrowserToolParameterSpec,
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
        throw new Error(`Browser manifest enum parameter '${parameter.name}' has no values.`);
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
  parameters: BrowserToolParameterSpec[],
): Record<string, z.ZodTypeAny> => {
  const inputSchema: Record<string, z.ZodTypeAny> = {};

  for (const parameter of parameters) {
    inputSchema[parameter.name] = buildClaudeParameterSchema(parameter);
  }

  return inputSchema;
};

export const buildClaudeBrowserToolDefinitions = async (options: {
  sdkClient: ClaudeSdkClient;
  enabledToolNames?: Iterable<string> | null;
}): Promise<Record<string, unknown>[] | null> => {
  const browserToolService = getBrowserToolService();
  if (!browserToolService.isBrowserSupported()) {
    return null;
  }

  const enabledToolNameSet =
    options.enabledToolNames === null || options.enabledToolNames === undefined
      ? null
      : new Set(
          Array.from(options.enabledToolNames)
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter((value) => value.length > 0),
        );

  const manifestEntries = enabledToolNameSet
    ? BROWSER_TOOL_MANIFEST.filter((entry) => enabledToolNameSet.has(entry.name))
    : BROWSER_TOOL_MANIFEST;

  if (manifestEntries.length === 0) {
    return null;
  }

  return Promise.all(
    manifestEntries.map((entry) =>
      options.sdkClient.createToolDefinition({
        name: entry.name,
        description: entry.description,
        inputSchema: buildClaudeInputSchema(entry.parameters),
        handler: async (rawArguments) => {
          try {
            return createClaudeBrowserToolResult(
              await entry.execute(
                browserToolService,
                entry.parseInput(asRawArguments(rawArguments)),
              ),
            );
          } catch (error) {
            return createClaudeBrowserToolErrorResult(error);
          }
        },
      }),
    ),
  );
};
