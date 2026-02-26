import { describe, it, expect } from 'vitest';
import { TokenUsageTracker } from '../../../../src/llm/utils/token-usage-tracker.js';
import { BaseTokenCounter } from '../../../../src/llm/token-counter/base-token-counter.js';
import { TokenPricingConfig } from '../../../../src/llm/utils/llm-config.js';

class MockCounter extends BaseTokenCounter {
  countInputTokens(): number { return 1; }
  countOutputTokens(): number { return 1; }
}

describe('TokenUsageTracker (integration)', () => {
  it('throws if output calculated before input', () => {
    const model = { defaultConfig: { pricingConfig: new TokenPricingConfig() } };
    const tracker = new TokenUsageTracker(model, new MockCounter('test'));
    expect(() => tracker.calculateOutputMessage({} as any)).toThrow(/calculateInputMessages/);
  });
});
