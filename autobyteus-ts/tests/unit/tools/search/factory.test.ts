import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SearchClientFactory } from '../../../../src/tools/search/factory.js';
import { SerperSearchStrategy } from '../../../../src/tools/search/serper-strategy.js';
import { SerpApiSearchStrategy } from '../../../../src/tools/search/serpapi-strategy.js';
import { VertexAISearchStrategy } from '../../../../src/tools/search/vertex-ai-search-strategy.js';
import { SearchProvider } from '../../../../src/tools/search/providers.js';
import { SecretValue } from '../../../../src/secrets/secret-value.js';

const resetFactory = () => {
  (SearchClientFactory as any).instance = undefined;
};

const syntheticApiKey = () => SecretValue.fromString('synthetic-test-key');

describe('SearchClientFactory', () => {
  beforeEach(() => {
    resetFactory();
  });

  afterEach(() => {
    resetFactory();
  });

  it('creates Serper strategy from an explicit resolved credential', () => {
    const factory = new SearchClientFactory();
    const client = factory.createSearchClient({
      provider: SearchProvider.SERPER,
      apiKey: syntheticApiKey(),
    });

    expect((client as any).strategy).toBeInstanceOf(SerperSearchStrategy);
  });

  it('creates SerpApi strategy from an explicit resolved credential', () => {
    const factory = new SearchClientFactory();
    const client = factory.createSearchClient({
      provider: SearchProvider.SERPAPI,
      apiKey: syntheticApiKey(),
    });

    expect((client as any).strategy).toBeInstanceOf(SerpApiSearchStrategy);
  });

  it('creates Vertex AI Search strategy from explicit credential and serving config', () => {
    const factory = new SearchClientFactory();
    const client = factory.createSearchClient({
      provider: SearchProvider.VERTEX_AI_SEARCH,
      apiKey: syntheticApiKey(),
      servingConfig:
        'projects/p/locations/global/collections/default_collection/engines/e/servingConfigs/default_search',
    });

    expect((client as any).strategy).toBeInstanceOf(VertexAISearchStrategy);
  });

  it('returns a new client instance for each explicit resolution', () => {
    const factory = new SearchClientFactory();
    const first = factory.createSearchClient({
      provider: SearchProvider.SERPER,
      apiKey: syntheticApiKey(),
    });
    const second = factory.createSearchClient({
      provider: SearchProvider.SERPER,
      apiKey: syntheticApiKey(),
    });

    expect(first).not.toBe(second);
  });
});
