import { beforeEach, describe, expect, it } from 'vitest';
import { OpenAICompatibleEndpointModelProvider } from '../../../src/llm/openai-compatible-endpoint-provider.js';
import { OpenAICompatibleEndpointModel } from '../../../src/llm/openai-compatible-endpoint-model.js';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { OpenAICompatibleEndpointLLM } from '../../../src/llm/api/openai-compatible-endpoint-llm.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';

const endpointA = {
  id: 'endpoint-a',
  name: 'Gateway A',
  providerType: LLMProvider.OPENAI_COMPATIBLE as const,
  baseUrl: 'https://gateway-a.example.com/v1',
};

const endpointB = {
  id: 'endpoint-b',
  name: 'Gateway B',
  providerType: LLMProvider.OPENAI_COMPATIBLE as const,
  baseUrl: 'https://gateway-b.example.com/v1',
};

const discovered = (id: string) => ({ id, name: id, value: id, canonicalName: id });

const unknownResolvedMetadata = {
  maxContextTokens: { value: null, source: { kind: 'unknown' as const } },
  maxInputTokens: { value: null, source: { kind: 'unknown' as const } },
  maxOutputTokens: { value: null, source: { kind: 'unknown' as const } },
};

describe('OpenAICompatibleEndpointModelProvider', () => {
  beforeEach(() => LLMFactory.resetForTests());

  it('builds models from credential-backed discovery results and marks the provider READY', async () => {
    const provider = new OpenAICompatibleEndpointModelProvider();
    const report = await provider.reloadSavedEndpoints([{
      endpoint: endpointA,
      discoveredModels: [discovered('model-b'), discovered('model-a')],
    }]);

    expect(report.statuses).toEqual([{
      endpointId: 'endpoint-a',
      status: 'READY',
      message: null,
      modelCount: 2,
      preservedPreviousModels: false,
    }]);
    expect(report.models.map((model) => model.modelIdentifier)).toEqual([
      'openai-compatible:endpoint-a:model-a',
      'openai-compatible:endpoint-a:model-b',
    ]);
  });

  it('constructs custom models with resolved endpoint metadata before registry use', async () => {
    const provider = new OpenAICompatibleEndpointModelProvider();
    const report = await provider.reloadSavedEndpoints([{
      endpoint: {
        ...endpointA,
        baseUrl: 'https://token-plan.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1',
      },
      discoveredModels: [discovered('qwen3.8-max-preview')],
    }]);

    expect(report.models[0]).toMatchObject({
      maxContextTokens: 1_000_000,
      maxInputTokens: null,
      maxOutputTokens: null,
      resolvedModelMetadata: {
        maxContextTokens: {
          value: 1_000_000,
          source: { kind: 'endpoint_profile' },
        },
      },
    });
  });

  it('preserves last-known-good models for a failed discovery while keeping healthy results', async () => {
    const previousModel = new OpenAICompatibleEndpointModel({
      endpoint: endpointA,
      discoveredModel: discovered('model-stale'),
      resolvedModelMetadata: unknownResolvedMetadata,
    });
    const provider = new OpenAICompatibleEndpointModelProvider();

    const report = await provider.reloadSavedEndpoints([
      { endpoint: endpointA, errorMessage: 'Gateway A is offline' },
      { endpoint: endpointB, discoveredModels: [discovered('model-fresh')] },
    ], new Map([[endpointA.id, [previousModel]]]));

    expect(report.statuses).toEqual([
      {
        endpointId: 'endpoint-a',
        status: 'STALE_ERROR',
        message: 'Gateway A is offline',
        modelCount: 1,
        preservedPreviousModels: true,
      },
      {
        endpointId: 'endpoint-b',
        status: 'READY',
        message: null,
        modelCount: 1,
        preservedPreviousModels: false,
      },
    ]);
    expect(report.models.map((model) => model.modelIdentifier)).toEqual([
      'openai-compatible:endpoint-a:model-stale',
      'openai-compatible:endpoint-b:model-fresh',
    ]);
  });

  it('marks a provider ERROR when discovery fails without prior models', async () => {
    const provider = new OpenAICompatibleEndpointModelProvider();
    const report = await provider.reloadSavedEndpoints([{
      endpoint: endpointA,
      errorMessage: 'Unauthorized',
    }]);

    expect(report.models).toEqual([]);
    expect(report.statuses).toEqual([{
      endpointId: 'endpoint-a',
      status: 'ERROR',
      message: 'Unauthorized',
      modelCount: 0,
      preservedPreviousModels: false,
    }]);
  });
});

describe('LLMFactory custom provider sync', () => {
  beforeEach(() => LLMFactory.resetForTests());

  it('registers discovered models and instantiates with separately supplied authentication', async () => {
    const report = await LLMFactory.syncOpenAICompatibleEndpointModels([{
      endpoint: endpointA,
      discoveredModels: [discovered('model-a')],
    }]);
    expect(report.statuses[0]).toMatchObject({ endpointId: endpointA.id, status: 'READY' });

    const models = await LLMFactory.listModelsByProvider(LLMProvider.OPENAI_COMPATIBLE);
    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({
      provider_id: endpointA.id,
      provider_name: endpointA.name,
      provider_type: 'OPENAI_COMPATIBLE',
    });

    const llm = await LLMFactory.createLLM('openai-compatible:endpoint-a:model-a', {
      authentication: {
        kind: 'apiKey',
        apiKey: SecretValue.fromString('synthetic-endpoint-key'),
      },
    });
    expect(llm).toBeInstanceOf(OpenAICompatibleEndpointLLM);
    expect((llm as any).model.endpointBaseUrl).toBe(endpointA.baseUrl);
  });
});
