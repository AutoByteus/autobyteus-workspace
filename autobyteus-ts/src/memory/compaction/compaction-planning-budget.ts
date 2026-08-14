import type { TokenBudget } from '../../agent/token-budget.js';

export type CompactionPlanningBudget = Readonly<{
  budgetKey: string;
  inputBudgetTokens: number;
  triggerThresholdTokens: number;
  observedPromptTokens: number;
  qualityRetentionCapTokens: number;
  triggerHeadroomTokens: number;
  postCompactionTargetTokens: number;
  replacementMemoryReserveTokens: number;
}>;

export class CompactionPlanningBudgetError extends Error {
  constructor(
    readonly code: 'invalid_budget' | 'invalid_target',
    message: string,
  ) {
    super(message);
    this.name = 'CompactionPlanningBudgetError';
  }
}

const requireNonNegativeInteger = (value: number, label: string): number => {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    throw new CompactionPlanningBudgetError(
      'invalid_budget',
      `Compaction planning ${label} must be a non-negative integer.`,
    );
  }
  return value;
};

export const resolveCompactionPlanningBudget = (
  budget: Pick<TokenBudget, 'inputBudget' | 'triggerThresholdTokens'>,
  observedPromptTokens: number,
): CompactionPlanningBudget => {
  const inputBudgetTokens = requireNonNegativeInteger(budget.inputBudget, 'input budget');
  const triggerThresholdTokens = requireNonNegativeInteger(
    budget.triggerThresholdTokens,
    'trigger threshold',
  );
  const observedTokens = requireNonNegativeInteger(observedPromptTokens, 'observed prompt');
  const qualityRetentionCapTokens = Math.floor(0.35 * inputBudgetTokens);
  const triggerHeadroomTokens = Math.max(256, Math.ceil(0.10 * triggerThresholdTokens));
  const postCompactionTargetTokens = Math.max(
    0,
    Math.min(
      qualityRetentionCapTokens,
      triggerThresholdTokens - triggerHeadroomTokens,
    ),
  );
  if (inputBudgetTokens <= 0 || triggerThresholdTokens <= 0) {
    throw new CompactionPlanningBudgetError(
      'invalid_target',
      'Compaction planning could not derive a positive post-compaction target.',
    );
  }
  const replacementMemoryReserveTokens = Math.min(
    8_192,
    Math.max(1_024, Math.floor(0.20 * postCompactionTargetTokens)),
  );
  const budgetKey = [
    inputBudgetTokens,
    triggerThresholdTokens,
    qualityRetentionCapTokens,
    triggerHeadroomTokens,
    postCompactionTargetTokens,
  ].join(':');

  return Object.freeze({
    budgetKey,
    inputBudgetTokens,
    triggerThresholdTokens,
    observedPromptTokens: observedTokens,
    qualityRetentionCapTokens,
    triggerHeadroomTokens,
    postCompactionTargetTokens,
    replacementMemoryReserveTokens,
  });
};

export const copyCompactionPlanningBudget = (
  budget: CompactionPlanningBudget,
): CompactionPlanningBudget => Object.freeze({ ...budget });
