import { describe, expect, it } from 'vitest';
import { normalizeOpenAICompatibleEndpointDiscoveredModels } from '../../../src/llm/openai-compatible-endpoint-discovery.js';

describe('OpenAI-compatible endpoint discovery normalization', () => {
  it('accepts only the fixed top-level numeric alias allowlist in documented order', () => {
    const [model] = normalizeOpenAICompatibleEndpointDiscoveredModels({
      data: [{
        id: 'model-a',
        context_window: '100',
        contextWindow: 200,
        context_window_tokens: 300,
        max_input_tokens: false,
        maxInputTokens: 400,
        max_output_tokens: 0,
        maxOutputTokens: 500,
        max_tokens: 900,
        limits: { context_window: 999_999 },
      }],
    });

    expect(model).toMatchObject({
      id: 'model-a',
      maxContextTokens: 200,
      maxInputTokens: 400,
      maxOutputTokens: 500,
    });
    expect(model).not.toHaveProperty('max_tokens');
  });

  it('merges duplicate rows by first valid advertised field while allowing independent fall-through', () => {
    const models = normalizeOpenAICompatibleEndpointDiscoveredModels([
      { id: 'model-a', context_window: 100, maxInputTokens: 'invalid' },
      { name: 'model-a', contextWindow: 200, maxInputTokens: 400, maxOutputTokens: 500 },
      { model: 'model-b', maxOutputTokens: 600 },
      'model-c',
    ]);

    expect(models).toEqual([
      { id: 'model-a', name: 'model-a', value: 'model-a', canonicalName: 'model-a', maxContextTokens: 100, maxInputTokens: 400, maxOutputTokens: 500 },
      { id: 'model-b', name: 'model-b', value: 'model-b', canonicalName: 'model-b', maxOutputTokens: 600 },
      { id: 'model-c', name: 'model-c', value: 'model-c', canonicalName: 'model-c' },
    ]);
  });
});
