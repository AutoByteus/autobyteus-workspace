import { describe, expect, it } from 'vitest';
import { supportedModelDefinitions } from '../../../src/llm/supported-model-definitions.js';
import { BaseTokenCounter } from '../../../src/llm/token-counter/base-token-counter.js';
import { Message } from '../../../src/llm/utils/messages.js';
import { TokenUsageTracker } from '../../../src/llm/utils/token-usage-tracker.js';

class NoopTokenCounter extends BaseTokenCounter {
  countInputTokens(_messages: Message[]): number {
    return 0;
  }

  countOutputTokens(_message: Message): number {
    return 0;
  }
}

describe('supportedModelDefinitions', () => {
  it('prices Gemini 3.5 Flash with the official Standard paid-tier token rates', () => {
    const gemini35Flash = supportedModelDefinitions.find((model) => model.name === 'gemini-3.5-flash');
    if (!gemini35Flash?.defaultConfig) {
      throw new Error('gemini-3.5-flash definition with default config was not found.');
    }

    expect(gemini35Flash.defaultConfig.pricingConfig).toMatchObject({
      inputTokenPricing: 1.5,
      outputTokenPricing: 9.0
    });

    const usageTracker = new TokenUsageTracker(
      { defaultConfig: gemini35Flash.defaultConfig },
      new NoopTokenCounter('noop')
    );
    expect(usageTracker.calculateCost(1_000_000, true)).toBe(1.5);
    expect(usageTracker.calculateCost(1_000_000, false)).toBe(9.0);
  });
});
