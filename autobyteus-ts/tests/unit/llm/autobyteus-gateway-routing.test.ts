import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMFactory } from '../../../src/llm/llm-factory.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMRuntime } from '../../../src/llm/runtimes.js';
import type { ProviderApiKeyResolver } from '../../../src/secrets/provider-api-key-resolver.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { providerApiKeyResolver } from '../provider-api-key-resolver-test-helpers.js';

class StubLLM extends BaseLLM {
  readonly resolver: ProviderApiKeyResolver;
  constructor(model: LLMModel, config: LLMConfig, resolver: ProviderApiKeyResolver) {
    super(model, config);
    this.resolver = resolver;
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

  const model = (name: string, runtime: LLMRuntime) => new LLMModel({
    name,
    value: name,
    canonicalName: name,
    provider: LLMProvider.OPENAI,
    llmClass: StubLLM,
    runtime,
    ...(runtime === LLMRuntime.AUTOBYTEUS ? { hostUrl: 'https://gateway.example.invalid' } : {}),
  });

  it('passes only the injected resolver while keeping the model credential-independent', async () => {
    const remote = model('remote-openai', LLMRuntime.AUTOBYTEUS);
    LLMFactory.registerModel(remote);
    const resolver = providerApiKeyResolver();
    const llm = await LLMFactory.createLLM(remote.modelIdentifier, undefined, resolver);
    expect((llm as StubLLM).resolver).toBe(resolver);
    expect(remote).not.toHaveProperty('credentialProviderId');
    expect(remote).not.toHaveProperty('authenticationRequirement');
  });

  it('replaces only AutoByteus-runtime models and preserves native same-provider models', async () => {
    const native = model('native-openai', LLMRuntime.API);
    const oldRemote = model('old-remote', LLMRuntime.AUTOBYTEUS);
    const newRemote = model('new-remote', LLMRuntime.AUTOBYTEUS);
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
