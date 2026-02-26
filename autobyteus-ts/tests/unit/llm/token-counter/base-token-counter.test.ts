import { describe, it, expect } from 'vitest';
import { BaseTokenCounter } from '../../../../src/llm/token-counter/base-token-counter.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

class MockTokenCounter extends BaseTokenCounter {
  countInputTokens(messages: Message[]): number {
    return messages.length * 10;
  }
  countOutputTokens(message: Message): number {
    return (message.content?.length || 0);
  }
}

describe('BaseTokenCounter', () => {
  it('should initialize and calculate total tokens', () => {
    const counter = new MockTokenCounter('test-model'); // Fix: No second arg needed if optional
    expect(counter.getTotalTokens(10, 20)).toBe(30);
  });

  it('should count tokens via mock implementation', () => {
    const counter = new MockTokenCounter('test-model'); // Fix: No second arg needed
    const msgs = [new Message(MessageRole.USER, 'hi')];
    expect(counter.countInputTokens(msgs)).toBe(10);
    
    const outMsg = new Message(MessageRole.ASSISTANT, 'hello');
    expect(counter.countOutputTokens(outMsg)).toBe(5);
  });
});
