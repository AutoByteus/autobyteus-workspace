import type { CompactionPressure } from '../compaction/compaction-threshold-gate.js';

export class CompactionPolicy {
  triggerRatio: number;
  maxItemChars: number;
  safetyMarginTokens: number;

  constructor(options?: {
    triggerRatio?: number;
    maxItemChars?: number;
    safetyMarginTokens?: number;
  }) {
    this.triggerRatio = options?.triggerRatio ?? 0.8;
    this.maxItemChars = options?.maxItemChars ?? 2000;
    this.safetyMarginTokens = options?.safetyMarginTokens ?? 256;
  }

  classifyPressure(
    promptTokens: number,
    inputBudgetTokens: number,
    triggerThresholdTokens = Math.floor(this.triggerRatio * inputBudgetTokens),
  ): CompactionPressure {
    if (inputBudgetTokens <= 0 || promptTokens >= inputBudgetTokens) {
      return 'hard_input_cap';
    }
    return promptTokens >= triggerThresholdTokens ? 'proactive' : 'none';
  }
}
