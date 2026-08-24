import { afterEach, describe, expect, it } from 'vitest';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import {
  buildHostScopedLlmModelIdentifier,
  LLMModel,
  parseHostScopedLlmModelIdentifier,
} from '../../../src/llm/models.js';
import {
  buildOpenAICompatibleEndpointModelIdentifier,
  parseOpenAICompatibleEndpointModelIdentifier,
} from '../../../src/llm/openai-compatible-endpoint-model.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import {
  buildHostScopedMultimediaModelIdentifier,
  parseHostScopedMultimediaModelIdentifier,
} from '../../../src/multimedia/model-identifier.js';

afterEach(() => LLMFactory.resetForTests());

describe('canonical producer-owned dynamic model identifiers', () => {
  it('round-trips delimiter-bearing custom identifiers by splitting the first provider separator', () => {
    const identifier = buildOpenAICompatibleEndpointModelIdentifier(
      'provider_gateway',
      'vendor:family:model@revision',
    );
    expect(identifier).toBe('openai-compatible:provider_gateway:vendor:family:model@revision');
    expect(parseOpenAICompatibleEndpointModelIdentifier(identifier)).toEqual({
      providerId: 'provider_gateway',
      modelName: 'vendor:family:model@revision',
    });
  });

  it('round-trips host-scoped LLM identifiers while preserving model and host colons', () => {
    const identifier = buildHostScopedLlmModelIdentifier(
      'vendor:family:model',
      LLMRuntime.OLLAMA,
      'http://localhost:11434',
    );
    expect(identifier).toBe('vendor:family:model:ollama@localhost:11434');
    expect(parseHostScopedLlmModelIdentifier(identifier)).toEqual({
      modelName: 'vendor:family:model', runtime: LLMRuntime.OLLAMA, host: 'localhost:11434',
    });
    expect(parseHostScopedLlmModelIdentifier('model:openai_compatible@provider_gateway')).toBeNull();
  });

  it('round-trips multimedia identifiers by splitting the last at-sign', () => {
    const identifier = buildHostScopedMultimediaModelIdentifier(
      'vendor@family@model',
      'https://gateway.example.invalid:8443',
    );
    expect(identifier).toBe('vendor@family@model@gateway.example.invalid:8443');
    expect(parseHostScopedMultimediaModelIdentifier(identifier)).toEqual({
      modelName: 'vendor@family@model', host: 'gateway.example.invalid:8443',
    });
  });
});

describe('LLMFactory source-owned registry replacement', () => {
  const model = (identifier: string) => new LLMModel({
    name: identifier,
    value: identifier,
    canonicalName: identifier,
    provider: LLMProvider.OPENAI_COMPATIBLE,
    providerId: 'provider_gateway',
    modelIdentifierOverride: identifier,
  });

  it('replaces one exact source without changing unrelated dynamic sources', async () => {
    await LLMFactory.ensureInitialized();
    const sourceA = model('openai-compatible:provider_a:model-a');
    const sourceB = model('openai-compatible:provider_b:model-b');
    LLMFactory.replaceSourceModels('provider_a:LLM', [sourceA]);
    LLMFactory.replaceSourceModels('provider_b:LLM', [sourceB]);

    LLMFactory.replaceSourceModels('provider_a:LLM', [model('openai-compatible:provider_a:model-c')]);

    await expect(LLMFactory.listSourceModels('provider_a:LLM'))
      .resolves.toEqual([expect.objectContaining({ model_identifier: 'openai-compatible:provider_a:model-c' })]);
    await expect(LLMFactory.listSourceModels('provider_b:LLM'))
      .resolves.toEqual([expect.objectContaining({ model_identifier: sourceB.modelIdentifier })]);
  });

  it('rejects an identifier collision owned by another source', async () => {
    await LLMFactory.ensureInitialized();
    const shared = model('openai-compatible:provider_a:shared');
    LLMFactory.replaceSourceModels('provider_a:LLM', [shared]);
    expect(() => LLMFactory.replaceSourceModels('provider_b:LLM', [shared]))
      .toThrow('LLM_MODEL_SOURCE_COLLISION');
  });
});
