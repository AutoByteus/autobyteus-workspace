import { describe, it, expect } from 'vitest';
import { LLMUserMessage } from '../../../src/llm/user-message.js';

describe('LLMUserMessage', () => {
  it('should initialize with valid data', () => {
    const msg = new LLMUserMessage({ content: 'Hello' });
    expect(msg.content).toBe('Hello');
  });

  it('should validate empty content and media', () => {
    expect(() => {
      new LLMUserMessage({ content: '' });
    }).toThrow('must have either content or at least one media URL');
  });

  it('should validate types', () => {
    expect(() => {
      new LLMUserMessage({ content: 'Hi', image_urls: ['valid', 123] as any });
    }).toThrow('must be a list of strings');
  });

  it('should serialize to dict', () => {
    const msg = new LLMUserMessage({
       content: 'Pic',
       image_urls: ['http://example.com/img.png']
    });
    const dict = msg.toDict();
    expect(dict.content).toBe('Pic');
    expect(dict.image_urls).toHaveLength(1);
    expect(dict).not.toHaveProperty('audio_urls');
  });
});
