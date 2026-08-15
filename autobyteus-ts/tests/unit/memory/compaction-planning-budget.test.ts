import { describe, expect, it } from 'vitest';
import {
  CompactionPlanningBudgetError,
  resolveCompactionPlanningBudget,
} from '../../../src/memory/compaction/compaction-planning-budget.js';

describe('resolveCompactionPlanningBudget', () => {
  it.each([
    [0.01, 6_157, 616, 5_541, 1_108],
    [0.20, 123_148, 12_315, 110_833, 8_192],
    [0.80, 492_595, 49_260, 215_510, 8_192],
  ])('derives the exact trigger-aligned target at ratio %s', (
    _ratio,
    triggerThresholdTokens,
    expectedHeadroom,
    expectedTarget,
    expectedReplacementReserve,
  ) => {
    const result = resolveCompactionPlanningBudget(
      { inputBudget: 615_744, triggerThresholdTokens },
      249_416,
    );
    expect(result).toMatchObject({
      inputBudgetTokens: 615_744,
      triggerThresholdTokens,
      observedPromptTokens: 249_416,
      qualityRetentionCapTokens: 215_510,
      triggerHeadroomTokens: expectedHeadroom,
      postCompactionTargetTokens: expectedTarget,
      replacementMemoryReserveTokens: expectedReplacementReserve,
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('clamps a low target to zero so planning can fail closed before child launch', () => {
    expect(resolveCompactionPlanningBudget(
      { inputBudget: 1_000, triggerThresholdTokens: 200 },
      300,
    ).postCompactionTargetTokens).toBe(0);
  });

  it('rejects invalid integer budgets', () => {
    expect(() => resolveCompactionPlanningBudget(
      { inputBudget: -1, triggerThresholdTokens: 1 },
      1,
    )).toThrow(CompactionPlanningBudgetError);
  });
});
