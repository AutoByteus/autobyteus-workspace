export class CompactionPolicy {
  triggerRatio: number;
  rawTailTurns: number;
  maxItemChars: number;
  safetyMarginTokens: number;

  constructor(options?: {
    triggerRatio?: number;
    rawTailTurns?: number;
    maxItemChars?: number;
    safetyMarginTokens?: number;
  }) {
    this.triggerRatio = options?.triggerRatio ?? 0.8;
    this.rawTailTurns = options?.rawTailTurns ?? 4;
    this.maxItemChars = options?.maxItemChars ?? 2000;
    this.safetyMarginTokens = options?.safetyMarginTokens ?? 256;
  }

  shouldCompact(promptTokens: number, inputBudget: number): boolean {
    if (inputBudget <= 0) {
      return true;
    }
    if (promptTokens >= inputBudget) {
      return true;
    }
    return promptTokens >= Math.floor(this.triggerRatio * inputBudget);
  }
}
