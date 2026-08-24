import { beforeEach, describe, expect, it } from 'vitest';
import { OpenAICompatibleEndpointModelProvider } from '../../../src/llm/openai-compatible-endpoint-provider.js';
import { OpenAICompatibleEndpointModel } from '../../../src/llm/openai-compatible-endpoint-model.js';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { OpenAICompatibleEndpointLLM } from '../../../src/llm/api/openai-compatible-endpoint-llm.js';
import { SecretValue } from '../../../src/secrets/secret-value.js';
import {
  resolveCompactionTokenBudget,
  resolveLlmRequestCapacity,
} from '../../../src/agent/token-budget.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';

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

  it('constructs custom models with exact current built-in metadata independent of endpoint URL', async () => {
    const provider = new OpenAICompatibleEndpointModelProvider();
    const report = await provider.reloadSavedEndpoints([{
      endpoint: endpointA,
      discoveredModels: [discovered('glm-5.2')],
    }]);

    expect(report.models[0]).toMatchObject({
      maxContextTokens: 198_000,
      maxInputTokens: null,
      maxOutputTokens: null,
      resolvedModelMetadata: {
        maxContextTokens: {
          value: 198_000,
          source: {
            kind: 'inferred_builtin', provider: LLMProvider.QWEN, value: 'glm-5.2',
          },
        },
        maxInputTokens: { value: null, source: { kind: 'unknown' } },
        maxOutputTokens: { value: null, source: { kind: 'unknown' } },
      },
    });

    const info = report.models[0]?.toModelInfo();
    expect(info).toMatchObject({
      max_context_tokens: 198_000,
      resolved_model_metadata: {
        maxContextTokens: {
          value: 198_000,
          source: { kind: 'inferred_builtin' },
        },
      },
    });

    const config = new LLMConfig({ maxTokens: 4096 });
    const policy = new CompactionPolicy();
    const capacity = resolveLlmRequestCapacity(report.models[0]!, config);
    const budget = resolveCompactionTokenBudget(
      capacity!, report.models[0]!, config, policy,
    );
    expect(budget).toMatchObject({
      effectiveContextCapacity: 198_000,
      inputBudget: expect.any(Number),
      triggerThresholdTokens: expect.any(Number),
      overrideActive: false,
    });
  });

  it('keeps unknown custom models without a fabricated budget while preserving the explicit override', async () => {
    const provider = new OpenAICompatibleEndpointModelProvider();
    const report = await provider.reloadSavedEndpoints([{
      endpoint: endpointA,
      discoveredModels: [discovered('unmatched-custom-wire-model')],
    }]);
    const model = report.models[0]!;

    expect(model.maxContextTokens).toBeNull();
    expect(resolveLlmRequestCapacity(model, new LLMConfig({ maxTokens: 4096 }))).toBeNull();

    expect(resolveLlmRequestCapacity(
      model,
      new LLMConfig({ maxTokens: 4096 }),
      { activeContextTokensOverride: 12000 },
    )).toMatchObject({
      effectiveContextCapacity: 12000,
      overrideActive: true,
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

describe('LLMFactory custom source registration', () => {
  beforeEach(() => LLMFactory.resetForTests());

  it('registers discovered models and instantiates with separately supplied authentication', async () => {
    const report = await new OpenAICompatibleEndpointModelProvider().reloadSavedEndpoints([{
      endpoint: endpointA,
      discoveredModels: [discovered('model-a')],
    }]);
    expect(report.statuses[0]).toMatchObject({ endpointId: endpointA.id, status: 'READY' });
    await LLMFactory.ensureInitialized();
    LLMFactory.replaceSourceModels(`${endpointA.id}:LLM`, report.models);

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
