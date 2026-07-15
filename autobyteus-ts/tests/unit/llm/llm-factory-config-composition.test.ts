import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BaseLLM, type LLMInvocationOptions } from '../../../src/llm/base.js';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { CompleteResponse, ChunkResponse } from '../../../src/llm/utils/response-types.js';

class CapturingLLM extends BaseLLM {
  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'ok' });
  }

  protected async *_streamMessagesToLLM(
    _messages: unknown,
    _kwargs?: Record<string, unknown>,
    _options?: LLMInvocationOptions,
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield new ChunkResponse({ content: 'ok' });
  }
}

const factoryAny = LLMFactory as unknown as {
  initialized: boolean;
  modelsByIdentifier: Map<string, LLMModel>;
  modelsByProvider: Map<LLMProvider, LLMModel[]>;
};

const buildModel = (name: string, defaultConfig: LLMConfig) =>
  new LLMModel({
    name,
    value: name,
    provider: LLMProvider.OPENAI,
    canonicalName: name,
    llmClass: CapturingLLM,
    defaultConfig,
  });

describe('LLMFactory config composition', () => {
  let originalInitialized: boolean;
  let originalModelsByIdentifier: Map<string, LLMModel>;
  let originalModelsByProvider: Map<LLMProvider, LLMModel[]>;

  beforeEach(() => {
    originalInitialized = factoryAny.initialized;
    originalModelsByIdentifier = factoryAny.modelsByIdentifier;
    originalModelsByProvider = factoryAny.modelsByProvider;

    factoryAny.initialized = true;
    factoryAny.modelsByIdentifier = new Map<string, LLMModel>();
    factoryAny.modelsByProvider = new Map<LLMProvider, LLMModel[]>();
  });

  afterEach(() => {
    factoryAny.initialized = originalInitialized;
    factoryAny.modelsByIdentifier = originalModelsByIdentifier;
    factoryAny.modelsByProvider = originalModelsByProvider;
  });

  it('preserves model default temperature when raw run config omits temperature', async () => {
    LLMFactory.registerModel(
      buildModel(
        'model-default-temperature',
        new LLMConfig({
          temperature: 1,
          topP: 0.95,
          extraParams: { model_default_extra: true },
        }),
      ),
    );

    const llm = await LLMFactory.createLLM('model-default-temperature', {
      provider_specific_flag: 'kept',
    });

    expect(llm.config.temperature).toBe(1);
    expect(llm.config.topP).toBe(0.95);
    expect(llm.config.extraParams).toEqual({
      model_default_extra: true,
      provider_specific_flag: 'kept',
    });
  });

  it('applies explicit raw standard fields as first-class configurable overrides', async () => {
    LLMFactory.registerModel(
      buildModel(
        'configurable-temperature',
        new LLMConfig({
          temperature: 0.8,
          maxTokens: 2048,
          extraParams: { model_default_extra: true },
        }),
      ),
    );

    const llm = await LLMFactory.createLLM('configurable-temperature', {
      temperature: 0.2,
      max_tokens: 512,
      unknown_provider_option: 'kept',
    });

    expect(llm.config.temperature).toBe(0.2);
    expect(llm.config.maxTokens).toBe(512);
    expect(llm.config.extraParams).toEqual({
      model_default_extra: true,
      unknown_provider_option: 'kept',
    });
  });

  it('keeps existing effective LLMConfig callers supported', async () => {
    LLMFactory.registerModel(
      buildModel(
        'effective-config-input',
        new LLMConfig({
          temperature: 0.8,
          extraParams: { model_default_extra: true },
        }),
      ),
    );

    const llm = await LLMFactory.createLLM(
      'effective-config-input',
      new LLMConfig({
        temperature: 0.3,
        extraParams: { explicit_effective_extra: true },
      }),
    );

    expect(llm.config.temperature).toBe(0.3);
    expect(llm.config.extraParams).toEqual({
      model_default_extra: true,
      explicit_effective_extra: true,
    });
  });
});
