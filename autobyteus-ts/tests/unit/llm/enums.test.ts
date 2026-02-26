import { describe, it, expect } from 'vitest';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';

describe('Enums', () => {
  it('LLMProvider should have expected values', () => {
    expect(LLMProvider.OPENAI).toBe('OPENAI');
    expect(LLMProvider.ANTHROPIC).toBe('ANTHROPIC');
  });

  it('LLMRuntime should have expected values', () => {
    expect(LLMRuntime.API).toBe('api');
    expect(LLMRuntime.OLLAMA).toBe('ollama');
  });
});
