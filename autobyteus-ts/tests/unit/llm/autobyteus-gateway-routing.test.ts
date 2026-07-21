import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import type { LLMConstructionContext } from '../../../src/llm/llm-construction-context.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';

class StubLLM extends BaseLLM {
  constructor(model: LLMModel, context: LLMConstructionContext) {
    super(model, context.config);
  }
  protected async _sendMessagesToLLM(): Promise<never> { throw new Error('not used'); }
  protected async *_streamMessagesToLLM(): AsyncGenerator<never> { return; }
}

const factoryState = LLMFactory as unknown as {
  initialized: boolean;
  modelsByIdentifier: Map<string, LLMModel>;
  modelsByProvider: Map<LLMProvider, LLMModel[]>;
};

describe('AutoByteus gateway construction routing', () => {
  let originalInitialized: boolean;
  let originalByIdentifier: Map<string, LLMModel>;
  let originalByProvider: Map<LLMProvider, LLMModel[]>;

  beforeEach(() => {
    originalInitialized = factoryState.initialized;
    originalByIdentifier = factoryState.modelsByIdentifier;
    originalByProvider = factoryState.modelsByProvider;
    factoryState.initialized = true;
    factoryState.modelsByIdentifier = new Map();
    factoryState.modelsByProvider = new Map();
  });

  afterEach(() => {
    factoryState.initialized = originalInitialized;
    factoryState.modelsByIdentifier = originalByIdentifier;
    factoryState.modelsByProvider = originalByProvider;
  });

  const model = (name: string, runtime: LLMRuntime, credentialProviderId: string) => new LLMModel({
    name,
    value: name,
    canonicalName: name,
    provider: LLMProvider.OPENAI,
    credentialProviderId,
    authenticationRequirement: { kind: 'apiKey', credentialSlot: 'apiKey', required: true },
    llmClass: StubLLM,
    runtime,
    ...(runtime === LLMRuntime.AUTOBYTEUS ? { hostUrl: 'https://gateway.example.invalid' } : {}),
  });

  it('returns exactly credential owner plus tagged authentication requirement', async () => {
    const remote = model('remote-openai', LLMRuntime.AUTOBYTEUS, LLMProvider.AUTOBYTEUS);
    LLMFactory.registerModel(remote);

    const target = await LLMFactory.describeConstructionTarget(remote.modelIdentifier);
    expect(target).toEqual({
      credentialProviderId: 'AUTOBYTEUS',
      authenticationRequirement: { kind: 'apiKey', credentialSlot: 'apiKey', required: true },
    });
    expect(target).not.toHaveProperty('providerId');
    expect(target).not.toHaveProperty('runtime');
    expect(target).not.toHaveProperty('credentialSlot');
  });

  it('replaces only AutoByteus-runtime models and preserves native same-provider models', async () => {
    const native = model('native-openai', LLMRuntime.API, LLMProvider.OPENAI);
    const oldRemote = model('old-remote', LLMRuntime.AUTOBYTEUS, LLMProvider.AUTOBYTEUS);
    const newRemote = model('new-remote', LLMRuntime.AUTOBYTEUS, LLMProvider.AUTOBYTEUS);
    LLMFactory.registerModel(native);
    LLMFactory.registerModel(oldRemote);

    await expect(LLMFactory.syncRuntimeModels(LLMRuntime.AUTOBYTEUS, [newRemote])).resolves.toBe(1);
    const identifiers = (await LLMFactory.listModelsByProvider(LLMProvider.OPENAI))
      .map((entry) => entry.model_identifier);
    expect(identifiers).toContain(native.modelIdentifier);
    expect(identifiers).toContain(newRemote.modelIdentifier);
    expect(identifiers).not.toContain(oldRemote.modelIdentifier);
  });
});
