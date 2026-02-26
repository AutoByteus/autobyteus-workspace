import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TokenUsageTrackingExtension } from '../../../../src/llm/extensions/token-usage-tracking-extension.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { BaseTokenCounter } from '../../../../src/llm/token-counter/base-token-counter.js';
import { TokenPricingConfig, LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

import { CompleteResponse, ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';

// Mocks
class MockLLM extends BaseLLM {
  async _sendMessagesToLLM(_messages: Message[], _kwargs: Record<string, unknown>): Promise<CompleteResponse> {
    return new CompleteResponse({ content: '' });
  }
  async *_streamMessagesToLLM(_messages: Message[], _kwargs: Record<string, unknown>): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: '' });
  }
  // No custom constructor needed if we pass correct args to super, or we override it.
  // BaseLLM constructor takes (model, config).
  // We can create a valid dummy model.
}

class MockCounter extends BaseTokenCounter {
  countInputTokens(msgs: Message[]) { return 10; }
  countOutputTokens(msg: Message) { return 5; }
}

const mockFactory = {
  getTokenCounter: () => new MockCounter('test')
};

describe('TokenUsageTrackingExtension', () => {
  let llm: MockLLM;
  let ext: TokenUsageTrackingExtension;

  beforeEach(() => {
    // Create valid minimal model
    const model = new LLMModel({
      name: 'test',
      value: 'test',
      canonicalName: 'test',
      provider: LLMProvider.OPENAI,
      defaultConfig: new LLMConfig({
        pricingConfig: new TokenPricingConfig({
          inputTokenPricing: 10.0,
          outputTokenPricing: 20.0
        })
      })
    });
    llm = new MockLLM(model, model.defaultConfig);
    ext = new TokenUsageTrackingExtension(llm, mockFactory);
  });

  it('should enable checking', () => {
    expect(ext.isEnabled).toBe(true);
  });

  it('should track input messages', () => {
    ext.beforeInvoke([new Message(MessageRole.USER, 'test')]);
    expect(ext.getTotalCost()).toBeCloseTo(0.0001); // 10 tokens * $10/1M
  });

  it('should track output messages', () => {
    const inputMessages = [new Message(MessageRole.USER, 'test')];
    ext.beforeInvoke(inputMessages);

    const response = new CompleteResponse({ content: 'resp' });
    ext.afterInvoke(inputMessages, response);

    // Input: 10 tokens * $10/1M = 0.0001
    // Output: 5 tokens * $20/1M = 0.0001
    expect(ext.getTotalCost()).toBeCloseTo(0.0002);
  });
});
