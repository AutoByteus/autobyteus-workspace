import { describe, it, expect } from 'vitest';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';

describe('LLMModel (integration)', () => {
  it('toModelInfo includes identifier, provider, and normalized metadata fields', () => {
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI,
      maxContextTokens: 128000,
      activeContextTokens: 64000,
      maxOutputTokens: 16384
    });
    const info = model.toModelInfo();
    expect(info.model_identifier).toBe('gpt-4o');
    expect(info.provider).toBe('OPENAI');
    expect(info.max_context_tokens).toBe(128000);
    expect(info.active_context_tokens).toBe(64000);
    expect(info.max_input_tokens).toBeNull();
    expect(info.max_output_tokens).toBe(16384);
  });

  it('keeps unknown context metadata as null instead of defaulting to a fake universal limit', () => {
    const model = new LLMModel({
      name: 'unknown-model',
      value: 'unknown-model',
      canonicalName: 'unknown-model',
      provider: LLMProvider.OPENAI
    });

    expect(model.maxContextTokens).toBeNull();
    expect(model.toModelInfo().max_context_tokens).toBeNull();
  });
});
