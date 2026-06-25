import { describe, expect, it } from 'vitest';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { createOpenAICompatibleTokenUsageObservation } from '../../../../src/llm/api/openai-compatible-token-usage-normalizer.js';
import { createGeminiTokenUsageObservation } from '../../../../src/llm/api/gemini-token-usage-normalizer.js';
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

  it('normalizes OpenAI Responses usage with reasoning as an output sub-breakdown', () => {
    const model = buildModel(LLMProvider.OPENAI, 'gpt-5.4-mini');
    const usage = {
      input_tokens: 13,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 17,
      output_tokens_details: { reasoning_tokens: 10 },
      total_tokens: 30,
    };

    const observation = createOpenAICompatibleTokenUsageObservation(usage, model);

    expect(observation).toEqual(expect.objectContaining({
      input_tokens: 13,
      output_tokens: 17,
      total_tokens: 30,
      cache_read_input_tokens: 0,
      reasoning_output_tokens: 10,
      billable_output_tokens: null,
      raw_usage_json: usage,
      quality_flags: [],
    }));
  });

  it('captures Kimi top-level cached_tokens without fabricating numeric reasoning tokens from reasoning_content', () => {
    const model = buildModel(LLMProvider.KIMI, 'kimi-k2.7-code');
    const usage = {
      prompt_tokens: 42,
      completion_tokens: 10,
      total_tokens: 52,
      cached_tokens: 14,
    };

    const observation = createOpenAICompatibleTokenUsageObservation(usage, model);

    expect(observation).toEqual(expect.objectContaining({
      input_tokens: 42,
      output_tokens: 10,
      total_tokens: 52,
      cache_read_input_tokens: 14,
      reasoning_output_tokens: null,
    }));
  });

  it('sets Gemini Vertex billable output to candidates plus thoughts while preserving visible output and reasoning breakdown', () => {
    const model = buildModel(LLMProvider.GEMINI, 'gemini-3.5-flash');
    const usage = {
      promptTokenCount: 15,
      candidatesTokenCount: 3,
      thoughtsTokenCount: 112,
      totalTokenCount: 130,
    };

    const observation = createGeminiTokenUsageObservation(usage, model);

    expect(observation).toEqual(expect.objectContaining({
      input_tokens: 15,
      output_tokens: 3,
      total_tokens: 130,
      reasoning_output_tokens: 112,
      billable_output_tokens: 115,
      raw_usage_json: usage,
      quality_flags: [],
    }));
  });

  it('accumulates Anthropic streaming usage with thinking tokens as an output sub-breakdown', () => {
    const model = buildModel(LLMProvider.ANTHROPIC, 'claude-test');
    const accumulator = createAnthropicUsageAccumulator();

    foldAnthropicUsage(accumulator, { input_tokens: 240, cache_creation_input_tokens: 10 });
    foldAnthropicUsage(accumulator, { output_tokens: 35, cache_read_input_tokens: 20, output_tokens_details: { thinking_tokens: 7 } });

    const observation = createAnthropicTokenUsageObservationFromAccumulator(accumulator, model);

    expect(observation).toEqual(expect.objectContaining({
      input_tokens: 240,
      output_tokens: 35,
      total_tokens: 275,
      cache_creation_input_tokens: 10,
      cache_read_input_tokens: 20,
      reasoning_output_tokens: 7,
      raw_usage_json: {
        events: [
          { input_tokens: 240, cache_creation_input_tokens: 10 },
          { output_tokens: 35, cache_read_input_tokens: 20, output_tokens_details: { thinking_tokens: 7 } },
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
