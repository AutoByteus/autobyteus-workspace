import { LLMModel } from '../llm/models.js';
import { LLMConfig } from '../llm/utils/llm-config.js';
import { CompactionPolicy } from '../memory/policies/compaction-policy.js';

export type TokenBudget = {
  maxContextTokens: number;
  maxOutputTokens: number;
  safetyMarginTokens: number;
  compactionRatio: number;
  inputBudget: number;
};

export const resolveTokenBudget = (
  model: LLMModel,
  config: LLMConfig,
  policy: CompactionPolicy
): TokenBudget | null => {
  const maxContextTokens = model.maxContextTokens ?? config.tokenLimit ?? null;
  if (!maxContextTokens) {
    return null;
  }

  const maxOutputTokens = config.maxTokens ?? 0;

  let safetyMargin = policy.safetyMarginTokens;
  if (config.safetyMarginTokens !== null && config.safetyMarginTokens !== undefined) {
    safetyMargin = config.safetyMarginTokens;
  } else if (model.defaultSafetyMarginTokens !== null && model.defaultSafetyMarginTokens !== undefined) {
    safetyMargin = model.defaultSafetyMarginTokens;
  }

  let compactionRatio = policy.triggerRatio;
  if (config.compactionRatio !== null && config.compactionRatio !== undefined) {
    compactionRatio = config.compactionRatio;
  } else if (model.defaultCompactionRatio !== null && model.defaultCompactionRatio !== undefined) {
    compactionRatio = model.defaultCompactionRatio;
  }

  const inputBudget = Math.max(0, maxContextTokens - maxOutputTokens - safetyMargin);

  return {
    maxContextTokens,
    maxOutputTokens,
    safetyMarginTokens: safetyMargin,
    compactionRatio,
    inputBudget
  };
};

export const applyCompactionPolicy = (policy: CompactionPolicy, budget: TokenBudget): void => {
  policy.triggerRatio = budget.compactionRatio;
  policy.safetyMarginTokens = budget.safetyMarginTokens;
};
