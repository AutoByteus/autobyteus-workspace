import { describe, expect, it } from 'vitest';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { createOpenAICompatibleTokenUsageObservation } from '../../../../src/llm/api/openai-compatible-token-usage-normalizer.js';
import {
  createAnthropicUsageAccumulator,
  createAnthropicTokenUsageObservationFromAccumulator,
  foldAnthropicUsage,
} from '../../../../src/llm/api/anthropic-token-usage-normalizer.js';

const buildModel = (provider: LLMProvider, name = 'provider-test-model') =>
  new LLMModel({
    name,
    value: `${name}-value`,
    canonicalName: name,
    provider,
  });

describe('provider token usage normalizers', () => {
  it('preserves OpenAI-compatible raw usage, cached input tokens, and reasoning tokens', () => {
    const model = buildModel(LLMProvider.OPENAI, 'gpt-test');
    const usage = {
      prompt_tokens: 1000,
      completion_tokens: 120,
      total_tokens: 1120,
      prompt_tokens_details: { cached_tokens: 700 },
      completion_tokens_details: { reasoning_tokens: 33 },
    };

    const observation = createOpenAICompatibleTokenUsageObservation(usage, model);

    expect(observation).toEqual(expect.objectContaining({
      input_tokens: 1000,
      output_tokens: 120,
      total_tokens: 1120,
      usage_scope: 'per_call',
      model_provider: LLMProvider.OPENAI,
      model_identifier: 'gpt-test',
      model_value: 'gpt-test-value',
      cache_read_input_tokens: 700,
      reasoning_output_tokens: 33,
      raw_usage_json: usage,
      quality_flags: [],
    }));
  });

  it('accumulates Anthropic streaming usage without fabricating missing input tokens as zero', () => {
    const model = buildModel(LLMProvider.ANTHROPIC, 'claude-test');
    const accumulator = createAnthropicUsageAccumulator();

    foldAnthropicUsage(accumulator, { input_tokens: 240, cache_creation_input_tokens: 10 });
    foldAnthropicUsage(accumulator, { output_tokens: 35, cache_read_input_tokens: 20 });

    const observation = createAnthropicTokenUsageObservationFromAccumulator(accumulator, model);

    expect(observation).toEqual(expect.objectContaining({
      input_tokens: 240,
      output_tokens: 35,
      total_tokens: 275,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 20,
      raw_usage_json: {
        events: [
          { input_tokens: 240, cache_creation_input_tokens: 10 },
          { output_tokens: 35, cache_read_input_tokens: 20 },
        ],
      },
      quality_flags: [],
    }));

    const outputOnly = createAnthropicTokenUsageObservationFromAccumulator(
      foldAnthropicUsage(createAnthropicUsageAccumulator(), { output_tokens: 9 }),
      model,
    );

    expect(outputOnly?.input_tokens).toBeNull();
    expect(outputOnly?.output_tokens).toBe(9);
    expect(outputOnly?.total_tokens).toBeNull();
    expect(outputOnly?.quality_flags).toEqual(expect.arrayContaining([
      'input_tokens_missing',
      'total_tokens_missing',
    ]));
  });
});
