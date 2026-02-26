import { Singleton } from '../../utils/singleton.js';
import { SearchProvider } from './providers.js';
import { SearchClient } from './client.js';
import { SerperSearchStrategy } from './serper-strategy.js';
import { SerpApiSearchStrategy } from './serpapi-strategy.js';
import { VertexAISearchStrategy } from './vertex-ai-search-strategy.js';

export class SearchClientFactory extends Singleton {
  protected static instance?: SearchClientFactory;

  private client: SearchClient | null = null;

  constructor() {
    super();
    if (SearchClientFactory.instance) {
      return SearchClientFactory.instance;
    }
    SearchClientFactory.instance = this;
  }

  createSearchClient(): SearchClient {
    if (this.client) {
      return this.client;
    }

    const providerName = (process.env.DEFAULT_SEARCH_PROVIDER || '').toLowerCase();
    const serperKey = process.env.SERPER_API_KEY;
    const serpapiKey = process.env.SERPAPI_API_KEY;
    const vertexApiKey = process.env.VERTEX_AI_SEARCH_API_KEY;
    const vertexServingConfig = process.env.VERTEX_AI_SEARCH_SERVING_CONFIG;

    const isSerperConfigured = Boolean(serperKey);
    const isSerpapiConfigured = Boolean(serpapiKey);
    const isVertexAiSearchConfigured = Boolean(vertexApiKey && vertexServingConfig);

    let strategy:
      | SerperSearchStrategy
      | SerpApiSearchStrategy
      | VertexAISearchStrategy
      | null = null;

    if (providerName === 'google_cse') {
      throw new Error(
        "DEFAULT_SEARCH_PROVIDER 'google_cse' is no longer supported. " +
        "Use 'serper', 'serpapi', or 'vertex_ai_search'."
      );
    } else if (providerName === SearchProvider.VERTEX_AI_SEARCH) {
      if (isVertexAiSearchConfigured) {
        strategy = new VertexAISearchStrategy();
      } else {
        throw new Error(
          "DEFAULT_SEARCH_PROVIDER is 'vertex_ai_search', but Vertex AI Search is not configured. " +
          'Set VERTEX_AI_SEARCH_API_KEY and VERTEX_AI_SEARCH_SERVING_CONFIG.'
        );
      }
    } else if (providerName === SearchProvider.SERPAPI) {
      if (isSerpapiConfigured) {
        strategy = new SerpApiSearchStrategy();
      } else {
        throw new Error(
          "DEFAULT_SEARCH_PROVIDER is 'serpapi', but SerpApi is not configured. " +
          'Set SERPAPI_API_KEY.'
        );
      }
    } else if (providerName === SearchProvider.SERPER || isSerperConfigured) {
      if (isSerperConfigured) {
        strategy = new SerperSearchStrategy();
      } else {
        throw new Error(
          "DEFAULT_SEARCH_PROVIDER is 'serper', but Serper is not configured. Set SERPER_API_KEY."
        );
      }
    } else if (isSerpapiConfigured) {
      strategy = new SerpApiSearchStrategy();
    } else if (isVertexAiSearchConfigured) {
      strategy = new VertexAISearchStrategy();
    } else {
      throw new Error(
        'No search provider is configured. Please set either SERPER_API_KEY, SERPAPI_API_KEY, ' +
        'or both VERTEX_AI_SEARCH_API_KEY and VERTEX_AI_SEARCH_SERVING_CONFIG environment variables.'
      );
    }

    this.client = new SearchClient(strategy);
    return this.client;
  }
}
