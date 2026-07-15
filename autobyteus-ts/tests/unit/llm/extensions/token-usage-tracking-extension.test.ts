import { describe, expect, it } from 'vitest';
import {
  buildLlmTokenUsageObservation,
  isLlmTokenUsageObservation,
} from '../../../../src/llm/utils/llm-token-usage-observation.js';

describe('native LLM token usage observation', () => {
  it('preserves raw provider usage and provider-specific dimensions', () => {
    const observation = buildLlmTokenUsageObservation({
      inputTokens: 100,
      outputTokens: 40,
      totalTokens: 140,
      rawUsage: {
        prompt_tokens: 100,
        completion_tokens: 40,
        prompt_tokens_details: { cached_tokens: 25 },
        completion_tokens_details: { reasoning_tokens: 8 },
      },
      model: {
        modelProvider: 'OPENAI',
        modelIdentifier: 'gpt-test',
        modelValue: 'gpt-test-value',
      },
      cacheReadInputTokens: 25,
      reasoningOutputTokens: 8,
    });

    expect(isLlmTokenUsageObservation(observation)).toBe(true);
    expect(observation.usage_scope).toBe('per_call');
    expect(observation.input_tokens).toBe(100);
    expect(observation.output_tokens).toBe(40);
    expect(observation.cache_read_input_tokens).toBe(25);
    expect(observation.reasoning_output_tokens).toBe(8);
    expect(observation.raw_usage_json).toEqual({
      prompt_tokens: 100,
      completion_tokens: 40,
      prompt_tokens_details: { cached_tokens: 25 },
      completion_tokens_details: { reasoning_tokens: 8 },
    });
  });

  it('marks missing reported dimensions without estimating local token counts', () => {
    const observation = buildLlmTokenUsageObservation({
      inputTokens: null,
      outputTokens: 12,
      rawUsage: { completion_tokens: 12 },
    });

    expect(observation.input_tokens).toBeNull();
    expect(observation.output_tokens).toBe(12);
    expect(observation.total_tokens).toBeNull();
    expect(observation.quality_flags).toContain('input_tokens_missing');
    expect(observation.quality_flags).toContain('total_tokens_missing');
  });
});
