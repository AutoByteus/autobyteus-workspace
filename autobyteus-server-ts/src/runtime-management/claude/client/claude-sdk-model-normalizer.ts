import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { getLlmProviderDisplayName } from "autobyteus-ts/llm/provider-display-names.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { LLMRuntime } from "autobyteus-ts/llm/runtimes.js";
import { ParameterDefinition, ParameterSchema, ParameterType } from "autobyteus-ts";
import { asObject, asString } from "../../../agent-execution/backends/claude/claude-runtime-shared.js";

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return null;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const values: string[] = [];
  for (const entry of value) {
    const normalized = asString(entry);
    if (normalized && !values.includes(normalized)) {
      values.push(normalized);
    }
  }
  return values;
};

const buildClaudeThinkingConfigSchema = (
  supportedEffortLevels: string[],
): Record<string, unknown> => {
  const normalizedEffortLevels = supportedEffortLevels.length > 0 ? supportedEffortLevels : ["medium"];
  return new ParameterSchema([
    new ParameterDefinition({
      name: "thinking_enabled",
      type: ParameterType.BOOLEAN,
      description: "Enable Claude extended thinking.",
      required: false,
      defaultValue: false,
    }),
    new ParameterDefinition({
      name: "reasoning_effort",
      type: ParameterType.ENUM,
      description: "Controls Claude thinking depth. Higher effort may improve quality but increase latency.",
      required: false,
      defaultValue: normalizedEffortLevels.includes("medium")
        ? "medium"
        : (normalizedEffortLevels[0] ?? null),
      enumValues: normalizedEffortLevels,
    }),
  ]).toJsonSchemaDict();
};

const supportsClaudeThinking = (descriptor: NormalizedModelDescriptor): boolean =>
  descriptor.supportsAdaptiveThinking ||
  descriptor.supportsEffort ||
  descriptor.supportedEffortLevels.length > 0;

export const toModelInfo = (descriptor: NormalizedModelDescriptor): ModelInfo => ({
  model_identifier: descriptor.identifier,
  display_name:
    (typeof descriptor.displayName === "string" && descriptor.displayName.trim().length > 0
      ? descriptor.displayName.trim()
      : null) ?? descriptor.identifier,
  value: descriptor.identifier,
  canonical_name: descriptor.identifier,
  provider_id: LLMProvider.ANTHROPIC,
  provider_name: getLlmProviderDisplayName(LLMProvider.ANTHROPIC),
  provider_type: LLMProvider.ANTHROPIC,
  runtime: LLMRuntime.API,
  config_schema: supportsClaudeThinking(descriptor)
    ? buildClaudeThinkingConfigSchema(descriptor.supportedEffortLevels)
    : undefined,
  max_context_tokens: null,
  active_context_tokens: null,
  max_input_tokens: null,
  max_output_tokens: null,
});

export type NormalizedModelDescriptor = {
  identifier: string;
  displayName: string | null;
  supportsEffort: boolean;
  supportedEffortLevels: string[];
  supportsAdaptiveThinking: boolean;
};

export const normalizeModelDescriptors = (value: unknown): NormalizedModelDescriptor[] => {
  if (!value) {
    return [];
  }

  const objectValue = asObject(value);
  const asArrayLike = Array.isArray(value)
    ? value
    : objectValue?.models && Array.isArray(objectValue.models)
      ? (objectValue.models as unknown[])
      : objectValue?.data && Array.isArray(objectValue.data)
        ? (objectValue.data as unknown[])
        : [];

  const descriptors = new Map<string, NormalizedModelDescriptor>();
  for (const row of asArrayLike) {
    if (typeof row === "string") {
      const existing = descriptors.get(row);
      if (!existing) {
        descriptors.set(row, {
          identifier: row,
          displayName: null,
          supportsEffort: false,
          supportedEffortLevels: [],
          supportsAdaptiveThinking: false,
        });
      }
      continue;
    }

    const payload = asObject(row);
    if (!payload) {
      continue;
    }

    const identifier =
      asString(payload.value) ??
      asString(payload.model_identifier) ??
      asString(payload.modelIdentifier) ??
      asString(payload.id) ??
      asString(payload.name);

    if (!identifier) {
      continue;
    }

    const displayName =
      asString(payload.displayName) ??
      asString(payload.display_name) ??
      asString(payload.label) ??
      (asString(payload.name) !== identifier ? asString(payload.name) : null);
    const supportsEffort =
      asBoolean(payload.supportsEffort ?? payload.supports_effort ?? payload.effortSupported) ?? false;
    const supportedEffortLevels = toStringArray(
      payload.supportedEffortLevels ?? payload.supported_effort_levels,
    );
    const supportsAdaptiveThinking =
      asBoolean(
        payload.supportsAdaptiveThinking ??
          payload.supports_adaptive_thinking ??
          payload.adaptiveThinkingSupported,
      ) ?? false;

    const existing = descriptors.get(identifier);
    if (!existing) {
      descriptors.set(identifier, {
        identifier,
        displayName,
        supportsEffort,
        supportedEffortLevels,
        supportsAdaptiveThinking,
      });
      continue;
    }

    descriptors.set(identifier, {
      identifier,
      displayName: existing.displayName ?? displayName,
      supportsEffort: existing.supportsEffort || supportsEffort,
      supportedEffortLevels: Array.from(
        new Set([...existing.supportedEffortLevels, ...supportedEffortLevels]),
      ),
      supportsAdaptiveThinking: existing.supportsAdaptiveThinking || supportsAdaptiveThinking,
    });
  }

  return Array.from(descriptors.values());
};
