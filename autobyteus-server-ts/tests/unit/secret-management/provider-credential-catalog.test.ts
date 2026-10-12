import { describe, expect, it } from 'vitest';
import { ProviderCredentialCatalog } from '../../../src/secret-management/catalog/provider-credential-catalog.js';

describe('ProviderCredentialCatalog', () => {
  const catalog = new ProviderCredentialCatalog();

  it.each([
    [{ kind: 'llm', providerId: 'OPENAI', credentialSlot: 'apiKey' }, 'provider.openai.api-key'],
    [{ kind: 'media', mediaKind: 'image', providerId: 'OPENAI', credentialSlot: 'apiKey' }, 'provider.openai.api-key'],
    [{ kind: 'llm', providerId: 'GEMINI', credentialSlot: 'geminiAiStudioApiKey' }, 'provider.google.ai-studio.api-key'],
    [{ kind: 'media', mediaKind: 'audio', providerId: 'GEMINI', credentialSlot: 'geminiVertexExpressApiKey' }, 'provider.google.vertex-express.api-key'],
    [{ kind: 'agentRuntime', runtimeKind: 'claude_agent_sdk', credentialSlot: 'apiKey' }, 'provider.anthropic.api-key'],
    [{ kind: 'search', providerId: 'serper', credentialSlot: 'apiKey' }, 'search.serper.api-key'],
    [{ kind: 'llm', providerId: 'provider_SYNTHETIC', credentialSlot: 'apiKey' }, 'provider.openai-compatible.provider_synthetic.api-key'],
  ] as const)('maps an authorized consumer to its provider-owned SecretId', (consumer, expected) => {
    expect(catalog.resolve(consumer)).toBe(expected);
  });

  it.each([
    { kind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
    { kind: 'media', mediaKind: 'image', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
    { kind: 'modelDiscovery', modelKind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
    { kind: 'llm', providerId: 'GEMINI', credentialSlot: 'apiKey' },
    { kind: 'media', mediaKind: 'image', providerId: 'ANTHROPIC', credentialSlot: 'apiKey' },
    { kind: 'search', providerId: 'unknown', credentialSlot: 'apiKey' },
  ] as const)('rejects unauthorized provider/subject/slot combinations', (consumer) => {
    expect(() => catalog.resolve(consumer as never)).toThrow('SECRET_CONSUMER_NOT_AUTHORIZED');
  });

  it('no longer recognizes the removed remote AutoByteus provider secret', () => {
    expect(catalog.isKnownSecretId('provider.autobyteus.api-key' as never)).toBe(false);
    expect(catalog.isKnownSecretId('provider.openai.api-key' as never)).toBe(true);
  });
});
