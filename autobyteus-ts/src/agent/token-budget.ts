import { LLMModel } from '../llm/models.js';
import { LLMConfig } from '../llm/utils/llm-config.js';
import { CompactionPolicy } from '../memory/policies/compaction-policy.js';
import type { CompactionRuntimeSettings } from '../memory/compaction/compaction-runtime-settings.js';

export type TokenBudget = {
  effectiveContextCapacity: number | null;
  contextDerivedInputCapTokens: number | null;
  providerInputCapTokens: number | null;
  effectiveInputCapacity: number;
  reservedOutputTokens: number;
  safetyMarginTokens: number;
  compactionRatio: number;
  inputBudget: number;
  triggerThresholdTokens: number;
  overrideActive: boolean;
};

const normalizePositiveInteger = (value: number | null | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.floor(value);
};

const minPositive = (...values: Array<number | null | undefined>): number | null => {
  const positives = values
    .map((value) => normalizePositiveInteger(value))
    .filter((value): value is number => value !== null);

  if (!positives.length) {
    return null;
  }

  return Math.min(...positives);
};

export const resolveTokenBudget = (
  model: LLMModel,
  config: LLMConfig,
  policy: CompactionPolicy,
  runtimeSettings?: Pick<CompactionRuntimeSettings, 'triggerRatioOverride' | 'activeContextTokensOverride'> | null
): TokenBudget | null => {
  const overrideContext = normalizePositiveInteger(runtimeSettings?.activeContextTokensOverride);
  const effectiveContextCapacity = overrideContext
    ?? normalizePositiveInteger(model.activeContextTokens)
    ?? normalizePositiveInteger(model.maxContextTokens);

  const reservedOutputTokens = minPositive(config.maxTokens, model.maxOutputTokens)
    ?? normalizePositiveInteger(config.maxTokens)
    ?? normalizePositiveInteger(model.maxOutputTokens)
    ?? 0;

  const contextDerivedInputCapTokens = effectiveContextCapacity === null
    ? null
    : Math.max(0, effectiveContextCapacity - reservedOutputTokens);

  const providerInputCapTokens = normalizePositiveInteger(model.maxInputTokens);

  let effectiveInputCapacity: number | null;
  if (contextDerivedInputCapTokens !== null && providerInputCapTokens !== null) {
    effectiveInputCapacity = Math.min(contextDerivedInputCapTokens, providerInputCapTokens);
  } else if (contextDerivedInputCapTokens !== null) {
    effectiveInputCapacity = contextDerivedInputCapTokens;
  } else {
    effectiveInputCapacity = providerInputCapTokens;
  }

  if (effectiveInputCapacity === null) {
    return null;
  }

  const safetyMarginTokens = config.safetyMarginTokens
    ?? model.defaultSafetyMarginTokens
    ?? policy.safetyMarginTokens;

  const compactionRatio = config.compactionRatio
    ?? runtimeSettings?.triggerRatioOverride
    ?? model.defaultCompactionRatio
    ?? policy.triggerRatio;

  const inputBudget = Math.max(0, effectiveInputCapacity - safetyMarginTokens);
  const triggerThresholdTokens = Math.floor(compactionRatio * inputBudget);

  return {
    effectiveContextCapacity,
    contextDerivedInputCapTokens,
    providerInputCapTokens,
    effectiveInputCapacity,
    reservedOutputTokens,
    safetyMarginTokens,
    compactionRatio,
    inputBudget,
    triggerThresholdTokens,
    overrideActive: overrideContext !== null
  };
};

export const applyCompactionPolicy = (policy: CompactionPolicy, budget: TokenBudget): void => {
  policy.triggerRatio = budget.compactionRatio;
  policy.safetyMarginTokens = budget.safetyMarginTokens;
};
