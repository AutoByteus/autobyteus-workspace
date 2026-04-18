import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenAICompatibleEndpointModelProvider } from '../../../src/llm/openai-compatible-endpoint-provider.js';
import { OpenAICompatibleEndpointModel } from '../../../src/llm/openai-compatible-endpoint-model.js';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { OpenAICompatibleEndpointDiscovery } from '../../../src/llm/openai-compatible-endpoint-discovery.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { OpenAICompatibleEndpointLLM } from '../../../src/llm/api/openai-compatible-endpoint-llm.js';

const endpointA = {
  id: 'endpoint-a',
  name: 'Gateway A',
  providerType: LLMProvider.OPENAI_COMPATIBLE,
  baseUrl: 'https://gateway-a.example.com/v1',
  apiKey: 'key-a',
};

const endpointB = {
  id: 'endpoint-b',
  name: 'Gateway B',
  providerType: LLMProvider.OPENAI_COMPATIBLE,
  baseUrl: 'https://gateway-b.example.com/v1',
  apiKey: 'key-b',
};

describe('OpenAICompatibleEndpointModelProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    LLMFactory.resetForTests();
  });

  it('discovers provider-backed models and marks healthy providers READY', async () => {
    const provider = new OpenAICompatibleEndpointModelProvider({
      probeEndpoint: vi.fn().mockResolvedValue([
        { id: 'model-b', name: 'model-b', value: 'model-b', canonicalName: 'model-b' },
        { id: 'model-a', name: 'model-a', value: 'model-a', canonicalName: 'model-a' },
      ]),
    });

    const report = await provider.reloadSavedEndpoints([endpointA]);

    expect(report.statuses).toEqual([
      {
        endpointId: 'endpoint-a',
        status: 'READY',
        message: null,
        modelCount: 2,
        preservedPreviousModels: false,
      },
    ]);
    expect(report.models.map((model) => model.modelIdentifier)).toEqual([
      'openai-compatible:endpoint-a:model-a',
      'openai-compatible:endpoint-a:model-b',
    ]);
  });

  it('preserves last-known-good models for a failing provider while keeping healthy results', async () => {
    const previousModel = new OpenAICompatibleEndpointModel({
      endpoint: endpointA,
      discoveredModel: {
        id: 'model-stale',
        name: 'model-stale',
        value: 'model-stale',
        canonicalName: 'model-stale',
      },
    });

    const provider = new OpenAICompatibleEndpointModelProvider({
      probeEndpoint: vi.fn(async ({ baseUrl }) => {
        if (baseUrl.includes('gateway-a')) {
          throw new Error('Gateway A is offline');
        }
        return [
          { id: 'model-fresh', name: 'model-fresh', value: 'model-fresh', canonicalName: 'model-fresh' },
        ];
      }),
    });

    const report = await provider.reloadSavedEndpoints(
      [endpointA, endpointB],
      new Map([[endpointA.id, [previousModel]]]),
    );

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

  it('marks providers as ERROR when discovery fails without prior models', async () => {
    const provider = new OpenAICompatibleEndpointModelProvider({
      probeEndpoint: vi.fn().mockRejectedValue(new Error('Unauthorized')),
    });

    const report = await provider.reloadSavedEndpoints([endpointA]);

    expect(report.models).toEqual([]);
    expect(report.statuses).toEqual([
      {
        endpointId: 'endpoint-a',
        status: 'ERROR',
        message: 'Unauthorized',
        modelCount: 0,
        preservedPreviousModels: false,
      },
    ]);
  });
});

describe('LLMFactory custom provider sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    LLMFactory.resetForTests();
  });

  it('registers synced provider-backed models and can instantiate an endpoint-aware LLM', async () => {
    vi.spyOn(OpenAICompatibleEndpointDiscovery, 'probeEndpoint').mockResolvedValue([
      { id: 'model-a', name: 'model-a', value: 'model-a', canonicalName: 'model-a' },
    ]);

    const report = await LLMFactory.syncOpenAICompatibleEndpointModels([endpointA]);
    expect(report.statuses[0]).toMatchObject({
      endpointId: endpointA.id,
      status: 'READY',
    });

    const models = await LLMFactory.listModelsByProvider(LLMProvider.OPENAI_COMPATIBLE);
    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({
      provider_id: endpointA.id,
      provider_name: endpointA.name,
      provider_type: 'OPENAI_COMPATIBLE',
    });

    const llm = await LLMFactory.createLLM('openai-compatible:endpoint-a:model-a');
    expect(llm).toBeInstanceOf(OpenAICompatibleEndpointLLM);
    expect((llm as any).model.endpointBaseUrl).toBe(endpointA.baseUrl);
  });
});
