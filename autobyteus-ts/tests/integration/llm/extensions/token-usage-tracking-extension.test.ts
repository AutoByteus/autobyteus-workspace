import { describe, it, expect } from 'vitest';
import { TokenUsageTrackingExtension } from '../../../../src/llm/extensions/token-usage-tracking-extension.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { BaseTokenCounter } from '../../../../src/llm/token-counter/base-token-counter.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig, TokenPricingConfig } from '../../../../src/llm/utils/llm-config.js';

class MockLLM extends BaseLLM {
  async _sendMessagesToLLM(_messages: any[]): Promise<CompleteResponse> {
    return new CompleteResponse({ content: '' });
  }
  async *_streamMessagesToLLM(_messages: any[]): AsyncGenerator<any, void, unknown> {
    yield;
  }
}

class MockCounter extends BaseTokenCounter {
  countInputTokens(): number { return 10; }
  countOutputTokens(): number { return 5; }
}

const mockFactory = {
  getTokenCounter: () => new MockCounter('test')
};

describe('TokenUsageTrackingExtension (integration)', () => {
  it('updates latest usage after invoke with response usage', async () => {
    const model = new LLMModel({
      name: 'test',
      value: 'test',
      canonicalName: 'test',
      provider: LLMProvider.OPENAI,
      defaultConfig: new LLMConfig({
        pricingConfig: new TokenPricingConfig({ inputTokenPricing: 10.0, outputTokenPricing: 20.0 })
      })
    });
    const llm = new MockLLM(model, model.defaultConfig);
    const ext = new TokenUsageTrackingExtension(llm, mockFactory);

    const messages = [new Message(MessageRole.USER, 'hi')];
    await ext.beforeInvoke(messages);

    const response = new CompleteResponse({
      content: '',
      usage: {
        prompt_tokens: 10,
        completion_tokens: 5,
        total_tokens: 15
      }
    });

    await ext.afterInvoke(messages, response);
    const latest = ext.getLatestUsage();
    expect(latest?.total_tokens).toBe(15);
  });
});
