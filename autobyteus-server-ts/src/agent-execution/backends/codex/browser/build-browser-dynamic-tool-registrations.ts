import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolCallResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import type { JsonObject } from "../codex-app-server-json.js";
import type { BrowserToolParameterSpec } from "../../../../agent-tools/browser/browser-tool-contract.js";
import { BROWSER_TOOL_MANIFEST } from "../../../../agent-tools/browser/browser-tool-manifest.js";
import {
  toBrowserToolErrorPayload,
  toBrowserJsonString,
} from "../../../../agent-tools/browser/browser-tool-serialization.js";
import { getBrowserToolService } from "../../../../agent-tools/browser/browser-tool-service.js";

const asRawArguments = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const buildCodexSchemaProperty = (parameter: BrowserToolParameterSpec): JsonObject => {
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
  parameters: BrowserToolParameterSpec[],
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

const runBrowserOperation = async (
  operation: () => Promise<unknown>,
): Promise<CodexDynamicToolCallResult> => {
  try {
    const result = await operation();
    return createCodexDynamicToolTextResult(toBrowserJsonString(result), true);
  } catch (error) {
    return createCodexDynamicToolTextResult(
      toBrowserJsonString(toBrowserToolErrorPayload(error)),
      false,
    );
  }
};

export const buildBrowserDynamicToolRegistrations = ():
  | CodexDynamicToolRegistration[]
  | null => {
  return buildBrowserDynamicToolRegistrationsForEnabledToolNames();
};

export const buildBrowserDynamicToolRegistrationsForEnabledToolNames = (
  enabledToolNames: Iterable<string> | null | undefined = null,
): CodexDynamicToolRegistration[] | null => {
  const browserToolService = getBrowserToolService();
  if (!browserToolService.isBrowserSupported()) {
    return null;
  }

  const enabledToolNameSet =
    enabledToolNames === null || enabledToolNames === undefined
      ? null
      : new Set(
          Array.from(enabledToolNames)
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

  return manifestEntries.map((entry) => ({
    spec: {
      name: entry.name,
      description: entry.description,
      inputSchema: buildCodexInputSchema(entry.parameters),
    },
    handler: async ({ arguments: toolArguments }) =>
      runBrowserOperation(async () =>
        entry.execute(browserToolService, entry.parseInput(asRawArguments(toolArguments))),
      ),
  }));
};
