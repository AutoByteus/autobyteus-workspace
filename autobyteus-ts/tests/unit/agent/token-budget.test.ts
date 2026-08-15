import { describe, expect, it } from 'vitest';
import {
  resolveCompactionTokenBudget,
  resolveLlmRequestCapacity,
} from '../../../src/agent/token-budget.js';
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

describe('LLM request capacity and compaction token budget', () => {
  it('resolves common capacity before adding the enabled compaction threshold', () => {
    const model = makeModel();
    model.activeContextTokens = 2000;
    model.maxContextTokens = 4000;
    model.maxOutputTokens = 500;
    model.defaultCompactionRatio = 0.8;
    model.defaultSafetyMarginTokens = 64;
    const config = new LLMConfig({ maxTokens: 300 });
    const settings = { activeContextTokensOverride: 1500, triggerRatioOverride: null };

    const capacity = resolveLlmRequestCapacity(model, config, settings, 256);
    expect(capacity).toMatchObject({
      effectiveContextCapacity: 1500,
      contextDerivedInputCapTokens: 1200,
      providerInputCapTokens: null,
      effectiveInputCapacity: 1200,
      reservedOutputTokens: 300,
      safetyMarginTokens: 64,
      inputBudget: 1136,
      overrideActive: true,
    });
    expect(capacity).not.toHaveProperty('compactionRatio');
    expect(capacity).not.toHaveProperty('triggerThresholdTokens');

    const budget = resolveCompactionTokenBudget(
      capacity!,
      model,
      config,
      new CompactionPolicy({ triggerRatio: 0.9, safetyMarginTokens: 256 }),
      settings,
    );
    expect(budget).toMatchObject({
      ...capacity,
      compactionRatio: 0.8,
      triggerThresholdTokens: Math.floor(0.8 * 1136),
    });
  });

  it('does not subtract output headroom again when maxInputTokens is the only cap', () => {
    const model = makeModel();
    model.maxInputTokens = 1000;
    model.maxOutputTokens = 250;
    model.defaultSafetyMarginTokens = null;

    const capacity = resolveLlmRequestCapacity(
      model,
      new LLMConfig({ maxTokens: 100 }),
      null,
      50,
    );

    expect(capacity).toMatchObject({
      contextDerivedInputCapTokens: null,
      providerInputCapTokens: 1000,
      effectiveInputCapacity: 1000,
      reservedOutputTokens: 100,
      safetyMarginTokens: 50,
      inputBudget: 950,
    });
  });

  it('uses the minimum of context-derived and provider input caps', () => {
    const model = makeModel();
    model.maxContextTokens = 5000;
    model.maxInputTokens = 1200;
    model.maxOutputTokens = 800;

    const capacity = resolveLlmRequestCapacity(
      model,
      new LLMConfig({ maxTokens: 400, safetyMarginTokens: 100 }),
      null,
      256,
    );

    expect(capacity).toMatchObject({
      effectiveContextCapacity: 5000,
      contextDerivedInputCapTokens: 4600,
      providerInputCapTokens: 1200,
      effectiveInputCapacity: 1200,
      reservedOutputTokens: 400,
      safetyMarginTokens: 100,
      inputBudget: 1100,
      overrideActive: false,
    });
  });

  it.each([
    [0.01, 11],
    [0.20, 220],
    [0.80, 880],
  ])('derives ratio %d only for an enabled compaction budget', (ratio, threshold) => {
    const model = makeModel();
    model.maxInputTokens = 1200;
    model.defaultSafetyMarginTokens = 100;
    const config = new LLMConfig({ compactionRatio: ratio });
    const capacity = resolveLlmRequestCapacity(model, config);

    expect(capacity?.inputBudget).toBe(1100);
    expect(resolveCompactionTokenBudget(
      capacity!,
      model,
      config,
      new CompactionPolicy(),
    )).toMatchObject({
      compactionRatio: ratio,
      triggerThresholdTokens: threshold,
    });
  });

  it('preserves trigger-ratio precedence independently of request capacity', () => {
    const model = makeModel();
    model.maxContextTokens = 3000;
    model.defaultCompactionRatio = 0.9;
    model.defaultSafetyMarginTokens = 200;
    const config = new LLMConfig({ maxTokens: 200 });
    const settings = { activeContextTokensOverride: null, triggerRatioOverride: 0.6 };
    const capacity = resolveLlmRequestCapacity(model, config, settings, 128);

    expect(capacity?.safetyMarginTokens).toBe(200);
    expect(resolveCompactionTokenBudget(
      capacity!,
      model,
      config,
      new CompactionPolicy({ triggerRatio: 0.5, safetyMarginTokens: 128 }),
      settings,
    ).compactionRatio).toBe(0.6);
  });

  it('returns null when neither a context-derived nor provider input cap exists', () => {
    const model = makeModel();
    model.maxContextTokens = null;
    model.activeContextTokens = null;
    model.maxInputTokens = null;

    expect(resolveLlmRequestCapacity(model, new LLMConfig())).toBeNull();
    expect(resolveLlmRequestCapacity(
      model,
      new LLMConfig({ tokenLimit: 6000, maxTokens: 200 }),
    )).toBeNull();
  });
});
