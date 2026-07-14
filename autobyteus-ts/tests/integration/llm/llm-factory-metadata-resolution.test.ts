import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.hoisted(() => vi.fn());

import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { AutobyteusModelProvider } from '../../../src/llm/autobyteus-provider.js';
import { LMStudioModelProvider } from '../../../src/llm/lmstudio-provider.js';
import { OllamaModelProvider } from '../../../src/llm/ollama-provider.js';
import { OpenAILLM } from '../../../src/llm/api/openai-llm.js';

const ENV_KEYS = [
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'KIMI_API_KEY',
  'MISTRAL_API_KEY',
  'GEMINI_API_KEY',
  'VERTEX_AI_API_KEY',
  'LLM_MODEL_METADATA_TIMEOUT_MS'
] as const;

describe('LLMFactory metadata resolution', () => {
  const originalEnv = new Map<string, string | undefined>();

  beforeEach(async () => {
    for (const key of ENV_KEYS) {
      originalEnv.set(key, process.env[key]);
      delete process.env[key];
    }

    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    vi.spyOn(OllamaModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(LMStudioModelProvider, 'discoverAndRegister').mockResolvedValue(0);
    vi.spyOn(AutobyteusModelProvider, 'discoverAndRegister').mockResolvedValue(0);

    await LLMFactory.reinitialize();
  });

  afterEach(async () => {
    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    await LLMFactory.reinitialize();

    vi.unstubAllGlobals();
    vi.restoreAllMocks();

    for (const key of ENV_KEYS) {
      const value = originalEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('uses curated metadata for supported models and leaves unknown providers truthful', async () => {
    const openaiModels = await LLMFactory.listModelsByProvider(LLMProvider.OPENAI);
    const anthropicModels = await LLMFactory.listModelsByProvider(LLMProvider.ANTHROPIC);
    const deepseekModels = await LLMFactory.listModelsByProvider(LLMProvider.DEEPSEEK);
    const geminiModels = await LLMFactory.listModelsByProvider(LLMProvider.GEMINI);
    const kimiModels = await LLMFactory.listModelsByProvider(LLMProvider.KIMI);
    const glmModels = await LLMFactory.listModelsByProvider(LLMProvider.GLM);
    const qwenModels = await LLMFactory.listModelsByProvider(LLMProvider.QWEN);
    const grokModels = await LLMFactory.listModelsByProvider(LLMProvider.GROK);

    const gpt55 = openaiModels.find((model) => model.model_identifier === 'gpt-5.5');
    expect(gpt55).toMatchObject({
      provider_type: LLMProvider.OPENAI,
      value: 'gpt-5.5',
      max_context_tokens: 1050000,
      max_output_tokens: 128000
    });
    expect(openaiModels.find((model) => model.model_identifier === 'gpt-5.4')?.max_context_tokens).toBe(1000000);
    expect(openaiModels.find((model) => model.model_identifier === 'gpt-5.4-mini')?.max_output_tokens).toBe(128000);
    const gpt56Models = openaiModels.filter((model) => model.model_identifier.startsWith('gpt-5.6'));
    expect(gpt56Models.map((model) => model.model_identifier).sort()).toEqual([
      'gpt-5.6-luna',
      'gpt-5.6-sol',
      'gpt-5.6-terra',
    ]);
    for (const model of gpt56Models) {
      expect(model).toMatchObject({
        display_name: model.model_identifier,
        value: model.model_identifier,
        canonical_name: model.model_identifier,
        provider_type: LLMProvider.OPENAI,
        runtime: 'api',
        max_context_tokens: 1050000,
        max_output_tokens: 128000,
        config_schema: {
          properties: {
            reasoning_effort: {
              default: 'medium',
              enum: ['none', 'low', 'medium', 'high', 'xhigh', 'max'],
            },
          },
        },
      });
    }
    expect(openaiModels.map((model) => model.model_identifier)).not.toContain('gpt-5.6');
    expect(gpt55?.config_schema).toMatchObject({
      properties: {
        reasoning_effort: {
          default: 'none',
          enum: ['none', 'low', 'medium', 'high', 'xhigh'],
        },
      },
    });
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-opus-4.7')).toMatchObject({
      provider_type: LLMProvider.ANTHROPIC,
      value: 'claude-opus-4-7',
      max_context_tokens: 1000000,
      max_output_tokens: 128000
    });
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-fable-5')).toMatchObject({
      provider_type: LLMProvider.ANTHROPIC,
      value: 'claude-fable-5',
      max_context_tokens: 1000000,
      max_input_tokens: 1000000,
      max_output_tokens: 128000
    });
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-opus-4.8')).toMatchObject({
      provider_type: LLMProvider.ANTHROPIC,
      value: 'claude-opus-4-8',
      max_context_tokens: 1000000,
      max_output_tokens: 128000
    });
    const claudeSonnet5 = anthropicModels.find((model) => model.model_identifier === 'claude-sonnet-5');
    expect(claudeSonnet5).toMatchObject({
      provider_type: LLMProvider.ANTHROPIC,
      value: 'claude-sonnet-5',
      max_context_tokens: 1000000,
      max_input_tokens: 1000000,
      max_output_tokens: 128000
    });
    expect(claudeSonnet5?.config_schema).toMatchObject({
      properties: {
        thinking_enabled: expect.objectContaining({ type: 'boolean' }),
        thinking_display: expect.objectContaining({ enum: ['omitted', 'summarized'] })
      }
    });
    expect(claudeSonnet5?.config_schema?.properties ?? {}).not.toHaveProperty('thinking_budget_tokens');
    expect(anthropicModels.map((model) => model.model_identifier)).not.toContain('claude-sonnet-4.8');
    const deepseekV4Flash = deepseekModels.find((model) => model.model_identifier === 'deepseek-v4-flash');
    expect(deepseekV4Flash).toMatchObject({
      provider_type: LLMProvider.DEEPSEEK,
      value: 'deepseek-v4-flash',
      max_context_tokens: 1000000,
      max_output_tokens: 384000
    });
    expect(deepseekV4Flash?.config_schema).toMatchObject({
      properties: {
        reasoning_effort: expect.objectContaining({
          enum: ['high', 'max']
        }),
        thinking_type: expect.objectContaining({
          enum: ['enabled', 'disabled'],
          default: 'enabled'
        })
      }
    });
    const deepseekV4FlashProperties = (deepseekV4Flash?.config_schema?.properties ?? {}) as Record<string, unknown>;
    expect(deepseekV4FlashProperties).not.toHaveProperty('thinking');
    expect(deepseekModels.find((model) => model.model_identifier === 'deepseek-v4-pro')).toMatchObject({
      provider_type: LLMProvider.DEEPSEEK,
      value: 'deepseek-v4-pro',
      max_context_tokens: 1000000,
      max_output_tokens: 384000
    });
    const gemini35Flash = geminiModels.find((model) => model.model_identifier === 'gemini-3.5-flash');
    expect(gemini35Flash).toMatchObject({
      model_identifier: 'gemini-3.5-flash',
      display_name: 'gemini-3.5-flash',
      value: 'gemini-3.5-flash',
      canonical_name: 'gemini-3.5-flash',
      provider_type: LLMProvider.GEMINI,
      runtime: 'api',
      max_context_tokens: 1048576,
      max_input_tokens: 1048576,
      max_output_tokens: 65536
    });
    expect(gemini35Flash?.config_schema).toMatchObject({
      properties: {
        thinking_level: expect.objectContaining({
          enum: ['minimal', 'low', 'medium', 'high']
        }),
        include_thoughts: expect.objectContaining({
          type: 'boolean'
        })
      }
    });
    expect(kimiModels.find((model) => model.model_identifier === 'kimi-k2.6')).toMatchObject({
      provider_type: LLMProvider.KIMI,
      value: 'kimi-k2.6',
      max_context_tokens: 256000
    });
    expect(kimiModels.find((model) => model.model_identifier === 'kimi-k2.6')?.config_schema).toBeUndefined();
    expect(kimiModels.find((model) => model.model_identifier === 'kimi-k2.7-code')).toMatchObject({
      provider_type: LLMProvider.KIMI,
      value: 'kimi-k2.7-code',
      max_context_tokens: 256000
    });
    expect(kimiModels.find((model) => model.model_identifier === 'kimi-k2.7-code')?.config_schema).toBeUndefined();
    const glm52 = glmModels.find((model) => model.model_identifier === 'glm-5.2');
    expect(glm52).toMatchObject({
      model_identifier: 'glm-5.2',
      display_name: 'glm-5.2',
      value: 'glm-5.2',
      canonical_name: 'glm-5.2',
      provider_type: LLMProvider.GLM,
      max_context_tokens: 1000000,
      max_input_tokens: 1000000,
      max_output_tokens: 128000
    });
    expect(glm52?.config_schema).toMatchObject({
      properties: {
        reasoning_effort: expect.objectContaining({
          enum: ['high', 'max'],
          default: 'max'
        }),
        thinking_type: expect.objectContaining({
          enum: ['enabled', 'disabled'],
          default: 'enabled'
        })
      }
    });
    expect(deepseekModels.map((model) => model.model_identifier)).not.toContain('deepseek-chat');
    expect(deepseekModels.map((model) => model.model_identifier)).not.toContain('deepseek-reasoner');
    expect(kimiModels.map((model) => model.model_identifier)).not.toContain('kimi-k2.5');
    expect(kimiModels.map((model) => model.model_identifier)).not.toContain('kimi-k2-thinking');
    expect(glmModels.map((model) => model.model_identifier)).not.toContain('glm-5.1');
    expect(qwenModels.find((model) => model.model_identifier === 'qwen3-max')?.max_context_tokens).toBe(262144);
    expect(grokModels).toHaveLength(1);
    expect(grokModels[0]).toMatchObject({
      model_identifier: 'grok-4.5',
      display_name: 'grok-4.5',
      value: 'grok-4.5',
      canonical_name: 'grok-4.5',
      provider_type: LLMProvider.GROK,
      max_context_tokens: 500000,
    });
    expect(grokModels[0]?.max_output_tokens).toBeNull();
    expect(grokModels[0]?.config_schema).toMatchObject({
      properties: {
        reasoning_effort: {
          default: 'high',
          enum: ['low', 'medium', 'high'],
        },
      },
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resolves every canonical GPT-5.6 identifier through the existing OpenAI adapter', async () => {
    process.env.OPENAI_API_KEY = 'test-openai-key';

    for (const modelId of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
      const llm = await LLMFactory.createLLM(modelId);
      expect(llm).toBeInstanceOf(OpenAILLM);
      expect(llm.model).toMatchObject({
        modelIdentifier: modelId,
        value: modelId,
        canonicalName: modelId,
      });
      await llm.cleanup();
    }
  });

  it('applies live provider metadata during registry initialization when official endpoints are configured', async () => {
    process.env.ANTHROPIC_API_KEY = 'anthropic-key';
    process.env.KIMI_API_KEY = 'kimi-key';
    process.env.MISTRAL_API_KEY = 'mistral-key';
    process.env.GEMINI_API_KEY = 'gemini-key';

    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

      if (url.includes('anthropic.com')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 'claude-fable-5', max_input_tokens: 1000000, max_tokens: 128000 },
              { id: 'claude-sonnet-5', max_input_tokens: 1000000, max_tokens: 128000 },
              { id: 'claude-opus-4-8', max_input_tokens: 1000000, max_tokens: 128000 },
              { id: 'claude-sonnet-4-6', max_input_tokens: 1200000, max_tokens: 64000 },
              { id: 'claude-opus-4-7', max_input_tokens: 1000000, max_tokens: 128000 },
              { id: 'claude-opus-4-6', max_input_tokens: 1000000, max_tokens: 128000 }
            ]
          })
        } as Response;
      }

      if (url.includes('moonshot.ai')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              { id: 'kimi-k2.6', context_length: 256000 },
              { id: 'kimi-k2.7-code', context_length: 262144 },
              { id: 'kimi-k2-thinking', context_length: 131072 }
            ]
          })
        } as Response;
      }

      if (url.includes('mistral.ai')) {
        return {
          ok: true,
          json: async () => ([
            { id: 'mistral-large-2512', max_context_length: 300000 },
            { id: 'devstral-2512', max_context_length: 280000 }
          ])
        } as Response;
      }

      if (url.includes('generativelanguage.googleapis.com')) {
        return {
          ok: true,
          json: async () => ({
            models: [
              {
                name: 'models/gemini-3.1-pro-preview',
                baseModelId: 'gemini-3.1-pro-preview',
                inputTokenLimit: 1048576,
                outputTokenLimit: 65536
              },
              {
                name: 'models/gemini-3-flash-preview',
                baseModelId: 'gemini-3-flash-preview',
                inputTokenLimit: 1048576,
                outputTokenLimit: 65536
              },
              {
                name: 'models/gemini-3.5-flash',
                baseModelId: 'gemini-3.5-flash',
                inputTokenLimit: 1048576,
                outputTokenLimit: 65536
              }
            ]
          })
        } as Response;
      }

      throw new Error(`Unexpected metadata URL: ${url}`);
    });

    await LLMFactory.reinitialize();

    const anthropicModels = await LLMFactory.listModelsByProvider(LLMProvider.ANTHROPIC);
    const kimiModels = await LLMFactory.listModelsByProvider(LLMProvider.KIMI);
    const mistralModels = await LLMFactory.listModelsByProvider(LLMProvider.MISTRAL);
    const geminiModels = await LLMFactory.listModelsByProvider(LLMProvider.GEMINI);

    expect(anthropicModels.find((model) => model.model_identifier === 'claude-sonnet-4.6')?.max_context_tokens).toBe(1200000);
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-sonnet-4.6')?.max_output_tokens).toBe(64000);
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-fable-5')?.max_output_tokens).toBe(128000);
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-sonnet-5')?.max_context_tokens).toBe(1000000);
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-opus-4.7')?.max_output_tokens).toBe(128000);
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-opus-4.7')?.value).toBe('claude-opus-4-7');
    expect(kimiModels.find((model) => model.model_identifier === 'kimi-k2.6')?.max_context_tokens).toBe(256000);
    expect(kimiModels.find((model) => model.model_identifier === 'kimi-k2.7-code')?.max_context_tokens).toBe(262144);
    expect(kimiModels.map((model) => model.model_identifier)).not.toContain('kimi-k2-thinking');
    expect(kimiModels.map((model) => model.model_identifier)).not.toContain('kimi-k2.5');
    expect(mistralModels.find((model) => model.model_identifier === 'mistral-large-3')?.max_context_tokens).toBe(300000);
    expect(geminiModels.find((model) => model.model_identifier === 'gemini-3.1-pro-preview')?.max_input_tokens).toBe(1048576);
    expect(geminiModels.find((model) => model.model_identifier === 'gemini-3.1-pro-preview')?.max_output_tokens).toBe(65536);
    expect(geminiModels.find((model) => model.model_identifier === 'gemini-3.5-flash')).toMatchObject({
      value: 'gemini-3.5-flash',
      max_context_tokens: 1048576,
      max_input_tokens: 1048576,
      max_output_tokens: 65536
    });
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('falls back to curated metadata when a resolver-backed provider metadata call times out during initialization', async () => {
    process.env.GEMINI_API_KEY = 'gemini-key';
    process.env.LLM_MODEL_METADATA_TIMEOUT_MS = '10';

    mockFetch.mockImplementation(async (input: string | URL | Request) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.includes('generativelanguage.googleapis.com')) {
        return await new Promise<Response>(() => {});
      }

      throw new Error(`Unexpected metadata URL: ${url}`);
    });

    await LLMFactory.reinitialize();

    const geminiModels = await LLMFactory.listModelsByProvider(LLMProvider.GEMINI);

    expect(geminiModels.find((model) => model.model_identifier === 'gemini-3.1-pro-preview')?.max_input_tokens).toBe(
      1048576
    );
    expect(geminiModels.find((model) => model.model_identifier === 'gemini-3-flash-preview')?.max_output_tokens).toBe(
      65536
    );
    expect(geminiModels.find((model) => model.model_identifier === 'gemini-3.5-flash')?.max_context_tokens).toBe(
      1048576
    );
    expect(geminiModels.find((model) => model.model_identifier === 'gemini-3.5-flash')?.max_input_tokens).toBe(
      1048576
    );
    expect(geminiModels.find((model) => model.model_identifier === 'gemini-3.5-flash')?.max_output_tokens).toBe(
      65536
    );
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
