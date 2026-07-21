import { describe, expect, it } from 'vitest';
import { SecretCatalog } from '../../../src/secret-management/catalog/secret-catalog.js';

describe('SecretCatalog AutoByteus gateway bindings', () => {
  const catalog = new SecretCatalog();

  it.each([
    { kind: 'modelDiscovery', modelKind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
    { kind: 'modelDiscovery', modelKind: 'audio', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
    { kind: 'modelDiscovery', modelKind: 'image', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
    { kind: 'llm', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
    { kind: 'media', mediaKind: 'audio', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
    { kind: 'media', mediaKind: 'image', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey' },
  ] as const)('binds $kind/$providerId to the one gateway definition', (consumer) => {
    expect(catalog.resolve(consumer)).toBe('provider.autobyteus.api-key');
  });

  it('rejects unsupported AutoByteus video construction', () => {
    expect(() => catalog.resolve({
      kind: 'media', mediaKind: 'video', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey',
    })).toThrow('SECRET_CONSUMER_NOT_AUTHORIZED');
  });

  it('rejects discovery identities outside the exact supported model-kind set', () => {
    expect(() => catalog.resolve({
      kind: 'modelDiscovery', modelKind: 'video', providerId: 'AUTOBYTEUS', credentialSlot: 'apiKey',
    } as never)).toThrow('SECRET_CONSUMER_NOT_AUTHORIZED');
  });
});
