import { describe, it, expect } from 'vitest';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';

describe('Enums (integration)', () => {
  it('LLMProvider and LLMRuntime are string enums', () => {
    expect(typeof LLMProvider.OPENAI).toBe('string');
    expect(typeof LLMRuntime.API).toBe('string');
  });
});
