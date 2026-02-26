import { describe, it, expect } from 'vitest';
import { resolveTokenBudget } from '../../../src/agent/token-budget.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';

const makeModel = () => new LLMModel({
  name: 'dummy',
  value: 'dummy',
  canonicalName: 'dummy',
  provider: LLMProvider.OPENAI
});

describe('resolveTokenBudget', () => {
  it('prefers model context settings', () => {
    const model = makeModel();
    model.maxContextTokens = 12000;
    model.defaultCompactionRatio = 0.8;
    model.defaultSafetyMarginTokens = 256;

    const config = new LLMConfig({ maxTokens: 1000 });
    const policy = new CompactionPolicy();

    const budget = resolveTokenBudget(model, config, policy);

    expect(budget).not.toBeNull();
    expect(budget?.maxContextTokens).toBe(12000);
    expect(budget?.maxOutputTokens).toBe(1000);
    expect(budget?.safetyMarginTokens).toBe(256);
    expect(budget?.compactionRatio).toBe(0.8);
    expect(budget?.inputBudget).toBe(12000 - 1000 - 256);
  });

  it('uses config overrides for ratio and safety margin', () => {
    const model = makeModel();
    model.maxContextTokens = 8000;
    model.defaultCompactionRatio = 0.8;
    model.defaultSafetyMarginTokens = 256;

    const config = new LLMConfig({
      maxTokens: 500,
      compactionRatio: 0.5,
      safetyMarginTokens: 128
    });
    const policy = new CompactionPolicy({ triggerRatio: 0.9, safetyMarginTokens: 512 });

    const budget = resolveTokenBudget(model, config, policy);

    expect(budget?.compactionRatio).toBe(0.5);
    expect(budget?.safetyMarginTokens).toBe(128);
    expect(budget?.inputBudget).toBe(8000 - 500 - 128);
  });

  it('falls back to config tokenLimit when model lacks context', () => {
    const model = makeModel();
    model.maxContextTokens = null;
    model.defaultCompactionRatio = null;
    model.defaultSafetyMarginTokens = null;

    const config = new LLMConfig({ tokenLimit: 6000, maxTokens: 500 });
    const policy = new CompactionPolicy({ triggerRatio: 0.7, safetyMarginTokens: 200 });

    const budget = resolveTokenBudget(model, config, policy);

    expect(budget?.maxContextTokens).toBe(6000);
    expect(budget?.compactionRatio).toBe(0.7);
    expect(budget?.safetyMarginTokens).toBe(200);
    expect(budget?.inputBudget).toBe(6000 - 500 - 200);
  });

  it('returns null without context limits', () => {
    const model = makeModel();
    model.maxContextTokens = null;
    model.defaultCompactionRatio = null;
    model.defaultSafetyMarginTokens = null;

    const config = new LLMConfig();
    const policy = new CompactionPolicy();

    const budget = resolveTokenBudget(model, config, policy);

    expect(budget).toBeNull();
  });
});
