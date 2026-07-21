import { afterEach, describe, expect, it } from 'vitest';
import { SearchClientFactory } from '../../../../src/tools/search/factory.js';
import { SearchProvider } from '../../../../src/tools/search/providers.js';
import { SecretValue } from '../../../../src/secrets/secret-value.js';

const resetFactory = () => {
  (SearchClientFactory as any).instance = undefined;
};

describe('SearchClientFactory (integration)', () => {
  afterEach(resetFactory);

  it('returns a singleton factory instance', () => {
    expect(new SearchClientFactory()).toBe(new SearchClientFactory());
  });

  it('creates isolated clients from each explicit provisioning input', () => {
    const firstFactory = new SearchClientFactory();
    const secondFactory = new SearchClientFactory();
    const clientA = firstFactory.createSearchClient({
      provider: SearchProvider.SERPER,
      apiKey: SecretValue.fromString('synthetic-first-key'),
    });
    const clientB = secondFactory.createSearchClient({
      provider: SearchProvider.SERPER,
      apiKey: SecretValue.fromString('synthetic-second-key'),
    });

    expect(clientA).not.toBe(clientB);
    expect((clientA as any).strategy.apiKey).toBe('synthetic-first-key');
    expect((clientB as any).strategy.apiKey).toBe('synthetic-second-key');
  });
});
