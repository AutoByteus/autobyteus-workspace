import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchClientFactory } from '../../../../src/tools/search/factory.js';
import { SerperSearchStrategy } from '../../../../src/tools/search/serper-strategy.js';
import { SerpApiSearchStrategy } from '../../../../src/tools/search/serpapi-strategy.js';
import { SearchProvider } from '../../../../src/tools/search/providers.js';
import { SecretValue } from '../../../../src/secrets/secret-value.js';

const resetFactory = () => {
  (SearchClientFactory as any).instance = undefined;
};

describe('SearchClientFactory explicit provisioning', () => {
  beforeEach(resetFactory);
  afterEach(resetFactory);

  it('uses each explicitly supplied key without retaining the prior credential', () => {
    const factory = new SearchClientFactory();
    const firstClient = factory.createSearchClient({
      provider: SearchProvider.SERPAPI,
      apiKey: SecretValue.fromString('synthetic-old-key'),
    });
    const secondClient = factory.createSearchClient({
      provider: SearchProvider.SERPAPI,
      apiKey: SecretValue.fromString('synthetic-new-key'),
    });

    expect(secondClient).not.toBe(firstClient);
    expect((firstClient as any).strategy.apiKey).toBe('synthetic-old-key');
    expect((secondClient as any).strategy.apiKey).toBe('synthetic-new-key');
  });

  it('uses the explicitly selected provider rather than ambient configuration', () => {
    const factory = new SearchClientFactory();
    const firstClient = factory.createSearchClient({
      provider: SearchProvider.SERPER,
      apiKey: SecretValue.fromString('synthetic-serper-key'),
    });
    const secondClient = factory.createSearchClient({
      provider: SearchProvider.SERPAPI,
      apiKey: SecretValue.fromString('synthetic-serpapi-key'),
    });

    expect((firstClient as any).strategy).toBeInstanceOf(SerperSearchStrategy);
    expect((secondClient as any).strategy).toBeInstanceOf(SerpApiSearchStrategy);
  });
});
