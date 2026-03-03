import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchClientFactory } from '../../../../src/tools/search/factory.js';
import { SerperSearchStrategy } from '../../../../src/tools/search/serper-strategy.js';
import { SerpApiSearchStrategy } from '../../../../src/tools/search/serpapi-strategy.js';

const originalEnv = { ...process.env };

const resetFactory = () => {
  (SearchClientFactory as any).instance = undefined;
};

const clearSearchEnv = () => {
  process.env.DEFAULT_SEARCH_PROVIDER = '';
  process.env.SERPER_API_KEY = '';
  process.env.SERPAPI_API_KEY = '';
  process.env.VERTEX_AI_SEARCH_API_KEY = '';
  process.env.VERTEX_AI_SEARCH_SERVING_CONFIG = '';
};

describe('SearchClientFactory (Config Drift)', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    clearSearchEnv();
    resetFactory();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetFactory();
  });

  it('correctly picks up API key changes after fix', () => {
    process.env.DEFAULT_SEARCH_PROVIDER = 'serpapi';
    process.env.SERPAPI_API_KEY = 'old-key';

    const factory = new SearchClientFactory();
    const firstClient = factory.createSearchClient();
    expect((firstClient as any).strategy.apiKey).toBe('old-key');

    // Update API key in environment
    process.env.SERPAPI_API_KEY = 'new-key';

    const secondClient = factory.createSearchClient();

    // After fix, it should return a new client (or at least a client with the new key)
    // Actually, it returns a NEW client instance now.
    expect(secondClient).not.toBe(firstClient);
    expect((secondClient as any).strategy.apiKey).toBe('new-key');
  });

  it('correctly picks up provider changes after fix', () => {
    process.env.SERPER_API_KEY = 'serper-key';
    process.env.SERPAPI_API_KEY = 'serpapi-key';
    process.env.DEFAULT_SEARCH_PROVIDER = 'serper';

    const factory = new SearchClientFactory();
    const firstClient = factory.createSearchClient();
    expect((firstClient as any).strategy).toBeInstanceOf(SerperSearchStrategy);

    // Update provider in environment
    process.env.DEFAULT_SEARCH_PROVIDER = 'serpapi';

    const secondClient = factory.createSearchClient();

    // After fix, it should pick up the new provider
    expect((secondClient as any).strategy).toBeInstanceOf(SerpApiSearchStrategy);
  });
});
