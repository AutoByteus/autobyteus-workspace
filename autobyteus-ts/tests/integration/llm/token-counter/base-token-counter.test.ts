import { describe, it, expect } from 'vitest';
import { BaseTokenCounter } from '../../../../src/llm/token-counter/base-token-counter.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';

class IntegrationCounter extends BaseTokenCounter {
  countInputTokens(messages: Message[]): number {
    return messages.reduce((sum, msg) => sum + (msg.content?.length || 0), 0);
  }
  countOutputTokens(message: Message): number {
    return message.content?.length || 0;
  }
}

describe('BaseTokenCounter (integration)', () => {
  it('counts input/output and supports reset', () => {
    const counter = new IntegrationCounter('model');
    const input = [new Message(MessageRole.USER, 'hi')];
    expect(counter.countInputTokens(input)).toBe(2);
    expect(counter.countOutputTokens(new Message(MessageRole.ASSISTANT, 'ok'))).toBe(2);
    counter.reset();
  });
});
