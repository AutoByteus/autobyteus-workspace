import { afterEach, describe, expect, it } from 'vitest';
import { DeepSeekLLM } from '../../../src/llm/api/deepseek-llm.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { MissingApiKeyError } from '../../../src/secrets/provider-api-key-error.js';
import {
  resolveProviderApiKeyResolver,
  setDefaultProviderApiKeyResolver,
} from '../../../src/secrets/provider-api-key-resolver.js';
import { providerApiKeyResolver } from '../provider-api-key-resolver-test-helpers.js';

const reveal = async (promise: Promise<{ revealToTrustedConsumer(): string }>) =>
  (await promise).revealToTrustedConsumer();

describe('process default provider API key resolver', () => {
  afterEach(() => setDefaultProviderApiKeyResolver(null));

  it('uses the explicit resolver when one is given, even with a default installed', async () => {
    setDefaultProviderApiKeyResolver(providerApiKeyResolver('synthetic-default'));
    const resolver = resolveProviderApiKeyResolver(providerApiKeyResolver('synthetic-explicit'));
    await expect(reveal(resolver.resolve('DEEPSEEK'))).resolves.toBe('synthetic-explicit');
  });

  it('falls back to the installed default at the moment a key is needed', async () => {
    const resolver = resolveProviderApiKeyResolver();
    setDefaultProviderApiKeyResolver(providerApiKeyResolver('synthetic-default'));
    await expect(reveal(resolver.resolve('DEEPSEEK'))).resolves.toBe('synthetic-default');
  });

  it('fails with MissingApiKeyError for the provider when no resolver exists', async () => {
    const resolver = resolveProviderApiKeyResolver();
    await expect(resolver.resolve('DEEPSEEK')).rejects.toBeInstanceOf(MissingApiKeyError);
    await expect(resolver.resolve('DEEPSEEK')).rejects.toMatchObject({ providerId: 'DEEPSEEK' });
  });

  it('lets a client built without a resolver use the default (no extra key code)', async () => {
    setDefaultProviderApiKeyResolver(providerApiKeyResolver('synthetic-default'));
    const llm = new DeepSeekLLM(new LLMModel({
      name: 'deepseek-v4-flash',
      value: 'deepseek-v4-flash',
      canonicalName: 'deepseek-v4-flash',
      provider: LLMProvider.DEEPSEEK,
    }), new LLMConfig());
    try {
      const client = await (llm as unknown as { getClient(): Promise<{ apiKey: string }> }).getClient();
      expect(client.apiKey).toBe('synthetic-default');
    } finally {
      await llm.cleanup();
    }
  });
});
