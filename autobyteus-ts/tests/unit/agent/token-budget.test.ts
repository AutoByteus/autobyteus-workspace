import { describe, expect, it } from 'vitest';
import { resolveTokenBudget } from '../../../src/agent/token-budget.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';

const makeModel = () =>
  new LLMModel({
    name: 'dummy-model',
    value: 'dummy-model',
    canonicalName: 'dummy-model',
    provider: LLMProvider.OPENAI,
  });

describe('resolveTokenBudget', () => {
  it('uses the active-context override and subtracts reserved output exactly once', () => {
    const model = makeModel();
    model.activeContextTokens = 2000;
    model.maxContextTokens = 4000;
    model.maxOutputTokens = 500;
    model.defaultCompactionRatio = 0.8;
    model.defaultSafetyMarginTokens = 64;

    const budget = resolveTokenBudget(
      model,
      new LLMConfig({ maxTokens: 300 }),
      new CompactionPolicy({ triggerRatio: 0.9, safetyMarginTokens: 256 }),
      { activeContextTokensOverride: 1500, triggerRatioOverride: null }
    );

    expect(budget).not.toBeNull();
    expect(budget).toMatchObject({
      effectiveContextCapacity: 1500,
      contextDerivedInputCapTokens: 1200,
      providerInputCapTokens: null,
      effectiveInputCapacity: 1200,
      reservedOutputTokens: 300,
      safetyMarginTokens: 64,
      compactionRatio: 0.8,
      inputBudget: 1136,
      triggerThresholdTokens: Math.floor(0.8 * 1136),
      overrideActive: true,
    });
  });

  it('does not subtract output headroom again when maxInputTokens is the only cap', () => {
    const model = makeModel();
    model.maxInputTokens = 1000;
    model.maxOutputTokens = 250;
    model.defaultSafetyMarginTokens = null;

    const budget = resolveTokenBudget(
      model,
      new LLMConfig({ maxTokens: 100 }),
      new CompactionPolicy({ safetyMarginTokens: 50 })
    );

    expect(budget).not.toBeNull();
    expect(budget?.contextDerivedInputCapTokens).toBeNull();
    expect(budget?.providerInputCapTokens).toBe(1000);
    expect(budget?.effectiveInputCapacity).toBe(1000);
    expect(budget?.reservedOutputTokens).toBe(100);
    expect(budget?.inputBudget).toBe(950);
  });

  it('uses the minimum of the context-derived cap and maxInputTokens when both exist', () => {
    const model = makeModel();
    model.maxContextTokens = 5000;
    model.maxInputTokens = 1200;
    model.maxOutputTokens = 800;
    model.defaultCompactionRatio = null;

    const budget = resolveTokenBudget(
      model,
      new LLMConfig({ maxTokens: 400, safetyMarginTokens: 100 }),
      new CompactionPolicy({ triggerRatio: 0.75, safetyMarginTokens: 256 })
    );

    expect(budget).not.toBeNull();
    expect(budget).toMatchObject({
      effectiveContextCapacity: 5000,
      contextDerivedInputCapTokens: 4600,
      providerInputCapTokens: 1200,
      effectiveInputCapacity: 1200,
      reservedOutputTokens: 400,
      safetyMarginTokens: 100,
      compactionRatio: 0.75,
      inputBudget: 1100,
      triggerThresholdTokens: 825,
      overrideActive: false,
    });
  });

  it('uses the runtime ratio override when config does not specify one', () => {
    const model = makeModel();
    model.maxContextTokens = 3000;
    model.defaultCompactionRatio = 0.9;
    model.defaultSafetyMarginTokens = 200;

    const budget = resolveTokenBudget(
      model,
      new LLMConfig({ maxTokens: 200 }),
      new CompactionPolicy({ triggerRatio: 0.5, safetyMarginTokens: 128 }),
      { activeContextTokensOverride: null, triggerRatioOverride: 0.6 }
    );

    expect(budget?.compactionRatio).toBe(0.6);
    expect(budget?.safetyMarginTokens).toBe(200);
  });

  it('returns null when neither a context-derived cap nor maxInputTokens exists', () => {
    const model = makeModel();
    model.maxContextTokens = null;
    model.activeContextTokens = null;
    model.maxInputTokens = null;

    const budget = resolveTokenBudget(model, new LLMConfig(), new CompactionPolicy());
    expect(budget).toBeNull();
  });

  it('does not fall back directly to config.tokenLimit', () => {
    const model = makeModel();
    model.maxContextTokens = null;
    model.activeContextTokens = null;
    model.maxInputTokens = null;

    const budget = resolveTokenBudget(
      model,
      new LLMConfig({ tokenLimit: 6000, maxTokens: 200 }),
      new CompactionPolicy()
    );

    expect(budget).toBeNull();
  });
});
