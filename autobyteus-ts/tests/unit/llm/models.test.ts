import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { OpenAICompatibleEndpointModel } from '../../../src/llm/openai-compatible-endpoint-model.js';

describe('LLMModel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes API models with provider-centered metadata', () => {
    const model = new LLMModel({
      name: 'gpt-4o',
      value: 'gpt-4o',
      canonicalName: 'gpt-4o',
      provider: LLMProvider.OPENAI,
      runtime: LLMRuntime.API,
    });

    expect(model.name).toBe('gpt-4o');
    expect(model.modelIdentifier).toBe('gpt-4o');
    expect(model.defaultConfig).toBeInstanceOf(LLMConfig);
    expect(model.toModelInfo()).toMatchObject({
      model_identifier: 'gpt-4o',
      provider_id: 'OPENAI',
      provider_name: 'OpenAI',
      provider_type: 'OPENAI',
      runtime: 'api',
    });
  });

  it('generates runtime-scoped identifiers for self-hosted runtimes', () => {
    const model = new LLMModel({
      name: 'llama3',
      value: 'llama3',
      canonicalName: 'llama3',
      provider: LLMProvider.OLLAMA,
      runtime: LLMRuntime.OLLAMA,
      hostUrl: 'http://localhost:11434',
    });

    expect(model.modelIdentifier).toBe('llama3:ollama@localhost:11434');
  });

  it('requires hostUrl for non-API runtimes', () => {
    expect(() => {
      new LLMModel({
        name: 'test',
        value: 'test',
        canonicalName: 'test',
        provider: LLMProvider.OLLAMA,
        runtime: LLMRuntime.OLLAMA,
      });
    }).toThrow(/hostUrl is required/);
  });

  it('adds custom-provider metadata for OpenAI-compatible models', () => {
    const model = new OpenAICompatibleEndpointModel({
      endpoint: {
        id: 'provider_1',
        name: 'Internal Gateway',
        providerType: LLMProvider.OPENAI_COMPATIBLE,
        baseUrl: 'https://gateway.example.com/v1',
        apiKey: 'secret',
      },
      discoveredModel: {
        id: 'model-a',
        name: 'model-a',
        value: 'model-a',
        canonicalName: 'model-a',
      },
    });

    expect(model.modelIdentifier).toBe('openai-compatible:provider_1:model-a');
    expect(model.toModelInfo()).toMatchObject({
      model_identifier: 'openai-compatible:provider_1:model-a',
      provider_id: 'provider_1',
      provider_name: 'Internal Gateway',
      provider_type: 'OPENAI_COMPATIBLE',
      runtime: 'openai_compatible',
      host_url: 'https://gateway.example.com/v1',
    });
  });
});
