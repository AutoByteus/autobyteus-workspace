import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchClientFactory } from '../../../../src/tools/search/factory.js';
import { SerperSearchStrategy } from '../../../../src/tools/search/serper-strategy.js';
import { SerpApiSearchStrategy } from '../../../../src/tools/search/serpapi-strategy.js';
import { VertexAISearchStrategy } from '../../../../src/tools/search/vertex-ai-search-strategy.js';

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

describe('SearchClientFactory', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    clearSearchEnv();
    resetFactory();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetFactory();
  });

  it('creates Serper strategy when configured explicitly', () => {
    process.env.DEFAULT_SEARCH_PROVIDER = 'serper';
    process.env.SERPER_API_KEY = 'serper-key';

    const factory = new SearchClientFactory();
    const client = factory.createSearchClient();

    expect((client as any).strategy).toBeInstanceOf(SerperSearchStrategy);
  });

  it('creates SerpApi strategy when configured explicitly', () => {
    process.env.DEFAULT_SEARCH_PROVIDER = 'serpapi';
    process.env.SERPAPI_API_KEY = 'serpapi-key';

    const factory = new SearchClientFactory();
    const client = factory.createSearchClient();

    expect((client as any).strategy).toBeInstanceOf(SerpApiSearchStrategy);
  });

  it('creates Vertex AI Search strategy when configured explicitly', () => {
    process.env.DEFAULT_SEARCH_PROVIDER = 'vertex_ai_search';
    process.env.VERTEX_AI_SEARCH_API_KEY = 'vertex-key';
    process.env.VERTEX_AI_SEARCH_SERVING_CONFIG =
      'projects/p/locations/global/collections/default_collection/engines/e/servingConfigs/default_search';

    const factory = new SearchClientFactory();
    const client = factory.createSearchClient();

    expect((client as any).strategy).toBeInstanceOf(VertexAISearchStrategy);
  });

  it('defaults to Serper when available and no provider specified', () => {
    process.env.SERPER_API_KEY = 'serper-key';

    const factory = new SearchClientFactory();
    const client = factory.createSearchClient();

    expect((client as any).strategy).toBeInstanceOf(SerperSearchStrategy);
  });

  it('falls back to SerpApi when Serper unavailable', () => {
    process.env.SERPAPI_API_KEY = 'serpapi-key';

    const factory = new SearchClientFactory();
    const client = factory.createSearchClient();

    expect((client as any).strategy).toBeInstanceOf(SerpApiSearchStrategy);
  });

  it('falls back to Vertex AI Search when Serper and SerpApi unavailable', () => {
    process.env.VERTEX_AI_SEARCH_API_KEY = 'vertex-key';
    process.env.VERTEX_AI_SEARCH_SERVING_CONFIG =
      'projects/p/locations/global/collections/default_collection/engines/e/servingConfigs/default_search';

    const factory = new SearchClientFactory();
    const client = factory.createSearchClient();

    expect((client as any).strategy).toBeInstanceOf(VertexAISearchStrategy);
  });

  it('throws when no provider is configured', () => {
    const factory = new SearchClientFactory();
    expect(() => factory.createSearchClient()).toThrow('No search provider is configured');
  });

  it('throws for removed google_cse provider', () => {
    process.env.DEFAULT_SEARCH_PROVIDER = 'google_cse';
    const factory = new SearchClientFactory();
    expect(() => factory.createSearchClient()).toThrow("DEFAULT_SEARCH_PROVIDER 'google_cse' is no longer supported");
  });

  it('returns the same client instance on subsequent calls', () => {
    process.env.SERPER_API_KEY = 'serper-key';

    const factory = new SearchClientFactory();
    const first = factory.createSearchClient();
    const second = factory.createSearchClient();

    expect(first).toBe(second);
  });
});
