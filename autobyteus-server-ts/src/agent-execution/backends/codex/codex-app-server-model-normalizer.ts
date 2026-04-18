import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { getLlmProviderDisplayName } from "autobyteus-ts/llm/provider-display-names.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { asObject, asString, type JsonObject } from "./codex-app-server-json.js";

const VALID_REASONING_EFFORTS = new Set(["none", "low", "medium", "high", "xhigh"]);

export const normalizeCodexReasoningEffort = (value: unknown): string | null => {
  const normalized = asString(value)?.toLowerCase() ?? null;
  if (!normalized || !VALID_REASONING_EFFORTS.has(normalized)) {
    return null;
  }
  return normalized;
};

const resolveEffortFromConfig = (
  llmConfig: Record<string, unknown> | null | undefined,
): string | null => normalizeCodexReasoningEffort(llmConfig?.reasoning_effort);

export const resolveCodexSessionReasoningEffort = (
  llmConfig: Record<string, unknown> | null | undefined,
): string | null => resolveEffortFromConfig(llmConfig);

const toReasoningEffortConfigSchema = (
  supportedEfforts: string[],
  defaultReasoningEffort: string | null,
): Record<string, unknown> | undefined => {
  if (supportedEfforts.length === 0) {
    return undefined;
  }

  const enumValues = supportedEfforts.slice();
  if (defaultReasoningEffort && !enumValues.includes(defaultReasoningEffort)) {
    enumValues.push(defaultReasoningEffort);
  }

  return {
    parameters: [
      {
        name: "reasoning_effort",
        type: "enum",
        description:
          "Controls reasoning depth for Codex turn/start. Higher effort may improve quality but increase latency.",
        required: false,
        default_value: defaultReasoningEffort ?? enumValues[0] ?? null,
        enum_values: enumValues,
      },
    ],
  };
};

const toReasoningDisplayLabel = (displayName: string, defaultReasoningEffort: string | null): string =>
  defaultReasoningEffort ? `${displayName} (default reasoning: ${defaultReasoningEffort})` : displayName;

const toSupportedReasoningEfforts = (row: JsonObject): string[] => {
  const source = row.supportedReasoningEfforts ?? row.supported_reasoning_efforts;
  if (!Array.isArray(source)) {
    return [];
  }

  const efforts: string[] = [];
  for (const entry of source) {
    const objectEntry = asObject(entry);
    const value = normalizeCodexReasoningEffort(
      objectEntry?.reasoningEffort ?? objectEntry?.reasoning_effort ?? objectEntry?.effort ?? entry,
    );
    if (value && !efforts.includes(value)) {
      efforts.push(value);
    }
  }
  return efforts;
};

export const mapCodexModelListRowToModelInfo = (row: unknown): ModelInfo | null => {
  const model = asObject(row);
  const modelName = asString(model?.model) ?? asString(model?.id);
  if (!model || !modelName) {
    return null;
  }

  const defaultReasoningEffort = normalizeCodexReasoningEffort(
    model.defaultReasoningEffort ?? model.default_reasoning_effort,
  );
  const supportedReasoningEfforts = toSupportedReasoningEfforts(model);
  const configSchema = toReasoningEffortConfigSchema(supportedReasoningEfforts, defaultReasoningEffort);
  const displayName = asString(model.displayName) ?? modelName;

  return {
    model_identifier: modelName,
    display_name: toReasoningDisplayLabel(displayName, defaultReasoningEffort),
    value: modelName,
    canonical_name: modelName,
    provider_id: LLMProvider.OPENAI,
    provider_name: getLlmProviderDisplayName(LLMProvider.OPENAI),
    provider_type: LLMProvider.OPENAI,
    runtime: "api",
    config_schema: configSchema,
    max_context_tokens: null,
    active_context_tokens: null,
    max_input_tokens: null,
    max_output_tokens: null,
  };
};
