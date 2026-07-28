import { Singleton } from '../../utils/singleton.js';
import { SearchProvider } from './providers.js';
import { SearchClient } from './client.js';
import { SerperSearchStrategy } from './serper-strategy.js';
import { SerpApiSearchStrategy } from './serpapi-strategy.js';
import { VertexAISearchStrategy } from './vertex-ai-search-strategy.js';
import type { SecretValue } from '../../secrets/secret-value.js';

export type SearchClientCreationInput =
  | { provider: SearchProvider.SERPER; apiKey: SecretValue }
  | { provider: SearchProvider.SERPAPI; apiKey: SecretValue }
  | { provider: SearchProvider.VERTEX_AI_SEARCH; apiKey: SecretValue; servingConfig: string };

export class SearchClientFactory extends Singleton {
  protected static instance?: SearchClientFactory;

  constructor() {
    super();
    if (SearchClientFactory.instance) {
      return SearchClientFactory.instance;
    }
    SearchClientFactory.instance = this;
  }

  createSearchClient(input: SearchClientCreationInput): SearchClient {
    const apiKey = input.apiKey.revealToTrustedConsumer();
    const strategy = input.provider === SearchProvider.SERPER
      ? new SerperSearchStrategy(apiKey)
      : input.provider === SearchProvider.SERPAPI
        ? new SerpApiSearchStrategy(apiKey)
        : new VertexAISearchStrategy(apiKey, input.servingConfig);
    return new SearchClient(strategy);
  }
}
