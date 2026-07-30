import { describe, expect, it } from 'vitest';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { createAutoByteusTokenUsageObservation } from '../../../../src/llm/api/autobyteus-token-usage-normalizer.js';
import { createOpenAICompatibleTokenUsageObservation } from '../../../../src/llm/api/openai-compatible-token-usage-normalizer.js';
import { createGeminiTokenUsageObservation } from '../../../../src/llm/api/gemini-token-usage-normalizer.js';
import { createOllamaTokenUsageObservation } from '../../../../src/llm/api/ollama-llm.js';
import {
  createAnthropicUsageAccumulator,
  createAnthropicTokenUsageObservationFromAccumulator,
  foldAnthropicUsage,
} from '../../../../src/llm/api/anthropic-token-usage-normalizer.js';

const buildModel = (provider: LLMProvider, name = 'provider-test-model', providerName?: string) =>
  new LLMModel({
    name,
    value: `${name}-value`,
    canonicalName: name,
    provider,
    providerName,
  });

describe('provider token usage normalizers', () => {
  it('propagates the AutoByteus provider-name snapshot through every shared normalizer', () => {
    const autoByteusModel = buildModel(LLMProvider.OPENAI_COMPATIBLE, 'custom-model', 'Custom Provider');
    const anthropicModel = buildModel(LLMProvider.ANTHROPIC, 'claude-test', 'Anthropic Built-in');
    const geminiModel = buildModel(LLMProvider.GEMINI, 'gemini-test', 'Gemini Built-in');
    const ollamaModel = buildModel(LLMProvider.OLLAMA, 'llama-test', 'Ollama Built-in');

    expect(createAutoByteusTokenUsageObservation({ prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }, autoByteusModel)?.provider_name)
      .toBe('Custom Provider');
    expect(createOpenAICompatibleTokenUsageObservation({ prompt_tokens: 2, completion_tokens: 3, total_tokens: 5 }, autoByteusModel)?.provider_name)
      .toBe('Custom Provider');
    expect(createAnthropicTokenUsageObservationFromAccumulator(
      foldAnthropicUsage(createAnthropicUsageAccumulator(), { input_tokens: 2, output_tokens: 3 }),
      anthropicModel,
    )?.provider_name).toBe('Anthropic Built-in');
    expect(createGeminiTokenUsageObservation({ promptTokenCount: 2, candidatesTokenCount: 3, totalTokenCount: 5 }, geminiModel)?.provider_name)
      .toBe('Gemini Built-in');
    expect(createOllamaTokenUsageObservation({ prompt_eval_count: 2, eval_count: 3 }, ollamaModel)?.provider_name)
      .toBe('Ollama Built-in');
  });

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

  it('normalizes nested OpenAI Responses cache writes and classifies write-only cache activity as positive', () => {
    const model = buildModel(LLMProvider.OPENAI, 'gpt-5.6-sol');
    const usage = {
      input_tokens: 1000,
      input_tokens_details: { cached_tokens: 0, cache_write_tokens: 400 },
      output_tokens: 20,
      total_tokens: 1020,
    };

    const observation = createOpenAICompatibleTokenUsageObservation(usage, model);

    expect(observation).toEqual(expect.objectContaining({
      input_tokens: 1000,
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: 400,
      cache_state: 'positive',
      raw_usage_json: usage,
    }));
  });

  it('normalizes nested Chat cache writes and keeps absent cache writes null', () => {
    const model = buildModel(LLMProvider.OPENAI, 'gpt-5.6-terra');
    const chatObservation = createOpenAICompatibleTokenUsageObservation({
      prompt_tokens: 500,
      prompt_tokens_details: { cached_tokens: 100, cache_write_tokens: 125 },
      completion_tokens: 10,
      total_tokens: 510,
    }, model);
    const absentObservation = createOpenAICompatibleTokenUsageObservation({
      input_tokens: 20,
      input_tokens_details: { cached_tokens: 0 },
      output_tokens: 5,
      total_tokens: 25,
    }, model);

    expect(chatObservation).toEqual(expect.objectContaining({
      cache_read_input_tokens: 100,
      cache_creation_input_tokens: 125,
      cache_state: 'positive',
    }));
    expect(absentObservation).toEqual(expect.objectContaining({
      cache_read_input_tokens: 0,
      cache_creation_input_tokens: null,
      cache_state: 'zero_reported',
    }));
  });

  it('uses top-level compatible cache writes only when the nested field is absent', () => {
    const model = buildModel(LLMProvider.OPENAI, 'gpt-5.6-luna');
    const fallback = createOpenAICompatibleTokenUsageObservation({
      input_tokens: 12,
      cache_write_tokens: 3,
      output_tokens: 1,
    }, model);
    const nestedZero = createOpenAICompatibleTokenUsageObservation({
      input_tokens: 12,
      input_tokens_details: { cache_write_tokens: 0 },
      cache_write_tokens: 3,
      output_tokens: 1,
    }, model);

    expect(fallback?.cache_creation_input_tokens).toBe(3);
    expect(fallback?.cache_state).toBe('positive');
    expect(nestedZero?.cache_creation_input_tokens).toBe(0);
    expect(nestedZero?.cache_state).toBe('zero_reported');
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
