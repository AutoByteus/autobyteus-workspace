import { getLlmProviderDisplayName, isBuiltInLlmProviderId } from "autobyteus-ts/llm/provider-display-names.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { TokenUsageUpdatedPayload } from "../../agent-execution/domain/agent-run-token-usage.js";
import {
  normalizeTokenUsageModelIdentifier,
  normalizeTokenUsageRuntimeKind,
} from "./token-usage-cost-summary-aggregate.js";

const COMPOSITE_MODEL_PREFIX = "openai-compatible:";
const COMPOSITE_MODEL_PATTERN = /^openai-compatible:([^:]+):(.+)$/;
const UNKNOWN_PROVIDER = "Unknown Provider";
const UNKNOWN_MODEL = "Unknown Model";

export interface TokenUsageCompositeModelValue {
  providerId: string;
  modelName: string;
}

export interface TokenUsageModelDisplayContext {
  customProviderNames: ReadonlyMap<string, string>;
  providerMapLoadFailed?: boolean;
}

export const EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT: TokenUsageModelDisplayContext = {
  customProviderNames: new Map(),
  providerMapLoadFailed: false,
};

export interface TokenUsageModelDisplayEntry {
  modelIdentifier: string;
  modelDisplayName: string;
}

const compact = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized || null;
};

/**
 * Parses only the canonical custom-provider identity shape. The suffix is not
 * split again, so model names containing `:` remain intact.
 */
export const parseTokenUsageCompositeModelValue = (
  value: string | null | undefined,
): TokenUsageCompositeModelValue | null => {
  const normalized = compact(value);
  if (!normalized) return null;
  const match = COMPOSITE_MODEL_PATTERN.exec(normalized);
  if (!match) return null;
  const providerId = match[1]?.trim() ?? "";
  const modelName = match[2]?.trim() ?? "";
  return providerId && modelName ? { providerId, modelName } : null;
};

const hasCompositeMarker = (value: string | null): boolean => Boolean(value?.startsWith(COMPOSITE_MODEL_PREFIX));

const resolveProviderLabel = (
  providerId: string | null,
  modelProvider: string | null | undefined,
  context: TokenUsageModelDisplayContext,
): string => {
  if (providerId) {
    if (!context.providerMapLoadFailed) {
      const savedName = compact(context.customProviderNames.get(providerId));
      if (savedName) return savedName;
    }
    return `OpenAI-Compatible (${providerId})`;
  }

  const normalizedProvider = compact(modelProvider);
  if (normalizedProvider) {
    const builtInProvider = normalizedProvider.toUpperCase();
    if (isBuiltInLlmProviderId(builtInProvider)) {
      return getLlmProviderDisplayName(builtInProvider);
    }
    if (builtInProvider === LLMProvider.OPENAI_COMPATIBLE) return UNKNOWN_PROVIDER;
    return `Unknown Provider (${normalizedProvider})`;
  }
  return UNKNOWN_PROVIDER;
};

const resolveAutobyteusDisplayName = (
  event: Pick<TokenUsageUpdatedPayload, "model_provider" | "model_identifier" | "model_value">,
  context: TokenUsageModelDisplayContext,
): string => {
  const modelIdentifier = compact(event.model_identifier);
  const modelValue = compact(event.model_value);
  const rawComposite = parseTokenUsageCompositeModelValue(modelIdentifier);
  const valueComposite = parseTokenUsageCompositeModelValue(modelValue);
  const rawIsMalformedComposite = hasCompositeMarker(modelIdentifier) && !rawComposite;
  const valueIsMalformedComposite = hasCompositeMarker(modelValue) && !valueComposite;

  let providerId: string | null = rawComposite?.providerId ?? null;
  let modelName: string | null = null;

  if (valueIsMalformedComposite) {
    modelName = rawComposite?.modelName ?? (!rawIsMalformedComposite ? modelIdentifier : null);
  } else if (valueComposite) {
    if (rawComposite) {
      // Matching and conflicting composites both use the canonical raw
      // identity. The raw identity is the accounting authority.
      providerId = rawComposite.providerId;
      modelName = rawComposite.modelName;
    } else if (!modelIdentifier) {
      providerId = valueComposite.providerId;
      modelName = valueComposite.modelName;
    } else if (!rawIsMalformedComposite) {
      // A composite value cannot override a non-composite raw identity.
      modelName = modelIdentifier;
    }
  } else if (modelValue) {
    // Ordinary model values, including values containing additional colons,
    // are already the preferred concise model label.
    modelName = modelValue;
  } else if (rawComposite) {
    providerId = rawComposite.providerId;
    modelName = rawComposite.modelName;
  } else if (!rawIsMalformedComposite) {
    modelName = modelIdentifier;
  }

  const providerLabel = resolveProviderLabel(providerId, event.model_provider, context);
  return `${providerLabel}:${modelName ?? UNKNOWN_MODEL}`;
};

export const resolveTokenUsageModelDisplayName = (
  event: Pick<TokenUsageUpdatedPayload, "runtime_kind" | "model_provider" | "model_identifier" | "model_value">,
  context: TokenUsageModelDisplayContext = EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT,
): string => {
  if (normalizeTokenUsageRuntimeKind(event.runtime_kind).trim().toLowerCase() !== "autobyteus") {
    return normalizeTokenUsageModelIdentifier(event);
  }
  return resolveAutobyteusDisplayName(event, context);
};

export const buildTokenUsageModelDisplayEntries = (
  events: TokenUsageUpdatedPayload[],
  context: TokenUsageModelDisplayContext = EMPTY_TOKEN_USAGE_MODEL_DISPLAY_CONTEXT,
): TokenUsageModelDisplayEntry[] => {
  const modelIdentifiers = Array.from(new Set(events.map((event) => normalizeTokenUsageModelIdentifier(event)))).sort();
  return modelIdentifiers.map((modelIdentifier) => {
    const matchingEvents = events.filter((event) => normalizeTokenUsageModelIdentifier(event) === modelIdentifier);
    const runtimeKinds = new Set(matchingEvents.map((event) => normalizeTokenUsageRuntimeKind(event.runtime_kind).trim().toLowerCase()));
    const modelDisplayName = runtimeKinds.size === 1 && matchingEvents[0]
      ? resolveTokenUsageModelDisplayName(matchingEvents[0], context)
      : modelIdentifier;
    return { modelIdentifier, modelDisplayName: modelDisplayName || modelIdentifier };
  });
};
