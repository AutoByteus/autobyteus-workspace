import { describe, it, expect, beforeEach } from 'vitest';
import { TokenUsageTracker } from '../../../../src/llm/utils/token-usage-tracker.js';
import { BaseTokenCounter } from '../../../../src/llm/token-counter/base-token-counter.js';
import { TokenPricingConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

class MockCounter extends BaseTokenCounter {
  countInputTokens(msgs: Message[]) { return 1000; }
  countOutputTokens(msg: Message) { return 500; }
}

describe('TokenUsageTracker', () => {
  let tracker: TokenUsageTracker;
  let model: any;

  beforeEach(() => {
    model = {
      defaultConfig: {
        pricingConfig: new TokenPricingConfig({
          inputTokenPricing: 10.0, // $10 per 1M
          outputTokenPricing: 20.0 // $20 per 1M
        })
      }
    };
    tracker = new TokenUsageTracker(model, new MockCounter('test'));
  });

  it('should calculate input cost correctly', () => {
    // 1000 tokens * $10 / 1M = $0.01
    tracker.calculateInputMessages([new Message(MessageRole.USER, 'hi')]);
    const latest = tracker.getLatestUsage();
    
    expect(latest?.prompt_tokens).toBe(1000);
    expect(latest?.prompt_cost).toBeCloseTo(0.01);
    expect(latest?.completion_tokens).toBe(0);
  });

  it('should calculate output cost and total', () => {
    tracker.calculateInputMessages([]);
    // 500 tokens * $20 / 1M = $0.01
    tracker.calculateOutputMessage(new Message(MessageRole.ASSISTANT, 'bye'));
    
    const latest = tracker.getLatestUsage();
    expect(latest?.completion_tokens).toBe(500);
    expect(latest?.completion_cost).toBeCloseTo(0.01);
    
    expect(latest?.total_tokens).toBe(1500);
    expect(latest?.total_cost).toBeCloseTo(0.02);
  });

  it('should totalize metrics', () => {
    tracker.calculateInputMessages([]);
    tracker.calculateOutputMessage(new Message(MessageRole.ASSISTANT, ''));
    
    // Do it again
    tracker.calculateInputMessages([]);
    tracker.calculateOutputMessage(new Message(MessageRole.ASSISTANT, ''));
    
    expect(tracker.getTotalInputTokens()).toBe(2000);
    expect(tracker.getTotalOutputTokens()).toBe(1000);
    expect(tracker.getTotalCost()).toBeCloseTo(0.04);
  });
});
