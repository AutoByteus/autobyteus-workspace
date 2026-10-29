import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockFetch = vi.hoisted(() => vi.fn());

import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LMStudioModelProvider } from '../../../src/llm/lmstudio-provider.js';
import { OllamaModelProvider } from '../../../src/llm/ollama-provider.js';
import { OpenAILLM } from '../../../src/llm/api/openai-llm.js';
import { AnthropicLLM } from '../../../src/llm/api/anthropic-llm.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';

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
    const claudeOpus5 = anthropicModels.find((model) => model.model_identifier === 'claude-opus-5');
    expect(claudeOpus5).toMatchObject({
      model_identifier: 'claude-opus-5',
      display_name: 'claude-opus-5',
      value: 'claude-opus-5',
      canonical_name: 'claude-opus-5',
      provider_type: LLMProvider.ANTHROPIC,
      max_context_tokens: 1000000,
      max_input_tokens: 1000000,
      max_output_tokens: 128000
    });
    expect(claudeOpus5?.config_schema).toMatchObject({
      properties: {
        thinking_enabled: expect.objectContaining({ type: 'boolean' }),
        thinking_display: expect.objectContaining({ enum: ['omitted', 'summarized'] }),
        reasoning_effort: expect.objectContaining({ enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'high' })
      }
    });
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-fable-5')).toMatchObject({
      provider_type: LLMProvider.ANTHROPIC,
      value: 'claude-fable-5',
      max_context_tokens: 1000000,
      max_input_tokens: 1000000,
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
        thinking_display: expect.objectContaining({ enum: ['omitted', 'summarized'] }),
        reasoning_effort: expect.objectContaining({ enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'high' })
      }
    });
    const anthropicIdentifiers = anthropicModels.map((model) => model.model_identifier);
    for (const removed of ['claude-sonnet-4.8', 'claude-opus-4.8', 'claude-opus-4.7', 'claude-sonnet-4.6']) {
      expect(anthropicIdentifiers).not.toContain(removed);
    }
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
    const gemini38Flash = geminiModels.find((model) => model.model_identifier === 'gemini-3.8-flash');
    expect(gemini38Flash).toMatchObject({
      model_identifier: 'gemini-3.8-flash',
      display_name: 'gemini-3.8-flash',
      value: 'gemini-3.8-flash',
      canonical_name: 'gemini-3.8-flash',
      provider_type: LLMProvider.GEMINI,
      runtime: 'api',
      max_context_tokens: 1048576,
      max_input_tokens: 1048576,
      max_output_tokens: 65536
    });
    expect(gemini38Flash?.config_schema).toMatchObject({
      properties: {
        thinking_level: expect.objectContaining({
          enum: ['low', 'medium', 'high']
        }),
        include_thoughts: expect.objectContaining({
          type: 'boolean'
        })
      }
    });
    expect(kimiModels.find((model) => model.model_identifier === 'kimi-k3')).toMatchObject({
      provider_type: LLMProvider.KIMI,
      value: 'kimi-k3',
      max_context_tokens: 1000000
    });
    expect(kimiModels.find((model) => model.model_identifier === 'kimi-k3')?.config_schema).toMatchObject({
      properties: {
        reasoning_effort: expect.objectContaining({ enum: ['low', 'high', 'max'], default: 'max' }),
        thinking_type: expect.objectContaining({ enum: ['enabled'], default: 'enabled' })
      }
    });
    const glm53 = glmModels.find((model) => model.model_identifier === 'glm-5.3');
    expect(glm53).toMatchObject({
      model_identifier: 'glm-5.3',
      display_name: 'glm-5.3',
      value: 'glm-5.3',
      canonical_name: 'glm-5.3',
      provider_type: LLMProvider.GLM,
      max_context_tokens: 1000000,
      max_input_tokens: 1000000,
      max_output_tokens: 128000
    });
    expect(glm53?.config_schema).toMatchObject({
      properties: {
        reasoning_effort: expect.objectContaining({
          enum: ['low', 'high', 'max'],
          default: 'max'
        }),
        thinking_type: expect.objectContaining({
          enum: ['enabled'],
          default: 'enabled'
        })
      }
    });
    expect(deepseekModels.map((model) => model.model_identifier)).not.toContain('deepseek-chat');
    expect(deepseekModels.map((model) => model.model_identifier)).not.toContain('deepseek-reasoner');
    expect(kimiModels.map((model) => model.model_identifier)).not.toContain('kimi-k2.5');
    expect(kimiModels.map((model) => model.model_identifier)).not.toContain('kimi-k2-thinking');
    expect(kimiModels.map((model) => model.model_identifier)).not.toContain('kimi-k2.6');
    expect(kimiModels.map((model) => model.model_identifier)).not.toContain('kimi-k2.7-code');
    expect(glmModels.map((model) => model.model_identifier)).not.toContain('glm-5.1');
    expect(glmModels.map((model) => model.model_identifier)).not.toContain('glm-5.2');
    expect(qwenModels.find((model) => model.model_identifier === 'qwen3-max')?.max_context_tokens).toBe(262144);
    expect(grokModels).toHaveLength(1);
    expect(grokModels[0]).toMatchObject({
      model_identifier: 'grok-4.7',
      display_name: 'grok-4.7',
      value: 'grok-4.7',
      canonical_name: 'grok-4.7',
      provider_type: LLMProvider.GROK,
      max_context_tokens: 500000,
    });
    expect(grokModels[0]?.max_output_tokens).toBeNull();
    expect(grokModels[0]?.config_schema).toMatchObject({
      properties: {
        reasoning_effort: {
          default: 'high',
          enum: ['low', 'medium', 'high', 'xhigh'],
        },
      },
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('resolves every canonical GPT-5.6 identifier through the existing OpenAI adapter', async () => {
    for (const modelId of ['gpt-5.6-sol', 'gpt-5.6-terra', 'gpt-5.6-luna']) {
      const llm = await LLMFactory.createLLM(modelId, {
        authentication: {
          kind: 'apiKey',
          apiKey: SecretValue.fromString('synthetic-openai-construction-key'),
        },
      });
      expect(llm).toBeInstanceOf(OpenAILLM);
      expect(llm.model).toMatchObject({
        modelIdentifier: modelId,
        value: modelId,
        canonicalName: modelId,
      });
      await llm.cleanup();
    }
  });

  it('resolves exact Astra and Fable 5.1 metadata without aliases', async () => {
    const openaiModels = await LLMFactory.listModelsByProvider(LLMProvider.OPENAI);
    const anthropicModels = await LLMFactory.listModelsByProvider(LLMProvider.ANTHROPIC);

    expect(openaiModels.filter((model) => model.model_identifier === 'gpt-6-astra')).toHaveLength(1);
    expect(openaiModels.find((model) => model.model_identifier === 'gpt-6-astra')).toMatchObject({
      display_name: 'gpt-6-astra',
      value: 'gpt-6-astra',
      canonical_name: 'gpt-6-astra',
      provider_type: LLMProvider.OPENAI,
      runtime: 'api',
      max_context_tokens: 1_050_000,
      max_input_tokens: null,
      max_output_tokens: 128_000,
      config_schema: {
        properties: {
          reasoning_effort: {
            default: 'medium',
            enum: ['low', 'medium', 'high', 'xhigh', 'max'],
          },
        },
      },
    });
    expect(openaiModels.map((model) => model.model_identifier)).not.toContain('gpt-6');
    expect(openaiModels.map((model) => model.model_identifier)).not.toContain('astra');

    expect(anthropicModels.filter((model) => model.model_identifier === 'claude-fable-5-1')).toHaveLength(1);
    const fable = anthropicModels.find((model) => model.model_identifier === 'claude-fable-5-1');
    expect(fable).toMatchObject({
      display_name: 'claude-fable-5-1',
      value: 'claude-fable-5-1',
      canonical_name: 'claude-fable-5-1',
      provider_type: LLMProvider.ANTHROPIC,
      runtime: 'api',
      max_context_tokens: 1_000_000,
      max_input_tokens: 1_000_000,
      max_output_tokens: 128_000,
    });
    expect(Object.keys(fable?.config_schema?.properties ?? {})).toEqual(['reasoning_effort']);
    expect(fable?.config_schema).toMatchObject({
      properties: { reasoning_effort: { enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'high' } },
    });
    expect(anthropicModels.find((model) => model.model_identifier === 'claude-opus-5-5')?.config_schema).toMatchObject({
      properties: {
        thinking_display: { enum: ['omitted', 'summarized'], default: 'omitted' },
        reasoning_effort: { enum: ['low', 'medium', 'high', 'xhigh', 'max'], default: 'medium' },
      },
    });
    expect(anthropicModels.map((model) => model.model_identifier)).not.toContain('claude-fable-5.1');
  });

  it('constructs exact Astra and Fable 5.1 rows through their existing provider adapters', async () => {
    const astra = await LLMFactory.createLLM('gpt-6-astra', {
      authentication: {
        kind: 'apiKey',
        apiKey: SecretValue.fromString('synthetic-openai-construction-key'),
      },
    });
    expect(astra).toBeInstanceOf(OpenAILLM);
    expect(astra.model).toMatchObject({
      modelIdentifier: 'gpt-6-astra',
      value: 'gpt-6-astra',
      canonicalName: 'gpt-6-astra',
    });
    await astra.cleanup();

    const fable = await LLMFactory.createLLM('claude-fable-5-1', {
      authentication: {
        kind: 'apiKey',
        apiKey: SecretValue.fromString('synthetic-anthropic-construction-key'),
      },
    });
    expect(fable).toBeInstanceOf(AnthropicLLM);
    expect(fable.model).toMatchObject({
      modelIdentifier: 'claude-fable-5-1',
      value: 'claude-fable-5-1',
      canonicalName: 'claude-fable-5-1',
    });
    await fable.cleanup();
  });
});
