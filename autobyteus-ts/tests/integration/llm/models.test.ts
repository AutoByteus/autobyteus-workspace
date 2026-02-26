import { describe, it, expect } from 'vitest';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';

describe('LLMModel (integration)', () => {
  it('toModelInfo includes identifier and provider', () => {
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI
    });
    const info = model.toModelInfo();
    expect(info.model_identifier).toBe('gpt-4o');
    expect(info.provider).toBe('OPENAI');
  });
});
