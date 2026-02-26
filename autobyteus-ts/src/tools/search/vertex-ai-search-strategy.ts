import axios, { AxiosError } from 'axios';
import { SearchStrategy } from './base-strategy.js';

type JsonRecord = Record<string, unknown>;

export class VertexAISearchStrategy extends SearchStrategy {
  static API_BASE_URL = 'https://discoveryengine.googleapis.com/v1alpha';
  private apiKey: string;
  private servingConfigPath: string;

  constructor() {
    super();
    const apiKey = process.env.VERTEX_AI_SEARCH_API_KEY;
    const servingConfig = process.env.VERTEX_AI_SEARCH_SERVING_CONFIG;
    if (!apiKey || !servingConfig) {
      throw new Error(
        "VertexAISearchStrategy requires both 'VERTEX_AI_SEARCH_API_KEY' and 'VERTEX_AI_SEARCH_SERVING_CONFIG' environment variables to be set."
      );
    }

    const normalizedPath = VertexAISearchStrategy.normalizeServingConfigPath(servingConfig);
    if (!normalizedPath.includes('/servingConfigs/')) {
      throw new Error(
        "VERTEX_AI_SEARCH_SERVING_CONFIG must include a full serving config path like " +
        "'projects/{project}/locations/{location}/collections/{collection}/engines/{engine}/servingConfigs/{servingConfig}'."
      );
    }

    this.apiKey = apiKey;
    this.servingConfigPath = normalizedPath;
  }

  private static normalizeServingConfigPath(pathValue: string): string {
    return pathValue.trim().replace(/^\/+/, '');
  }

  private static readPath(source: unknown, path: Array<string | number>): unknown {
    let current: unknown = source;
    for (const segment of path) {
      if (Array.isArray(current)) {
        const index = typeof segment === 'number' ? segment : Number(segment);
        if (!Number.isInteger(index) || index < 0 || index >= current.length) {
          return undefined;
        }
        current = current[index];
        continue;
      }
      if (!current || typeof current !== 'object') {
        return undefined;
      }
      current = (current as JsonRecord)[String(segment)];
    }
    return current;
  }

  private static coerceText(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private static pickText(source: unknown, candidates: Array<Array<string | number>>): string | null {
    for (const path of candidates) {
      const value = VertexAISearchStrategy.coerceText(VertexAISearchStrategy.readPath(source, path));
      if (value) {
        return value;
      }
    }
    return null;
  }

  protected formatResults(data: Record<string, unknown>): string {
    const rawResults = data['results'];
    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      return 'No relevant information found for the query via Vertex AI Search.';
    }

    const lines = rawResults.map((result: unknown, index: number) => {
      const title = VertexAISearchStrategy.pickText(result, [
        ['document', 'derivedStructData', 'title'],
        ['document', 'structData', 'title'],
        ['chunk', 'derivedStructData', 'title'],
        ['chunk', 'structData', 'title'],
        ['document', 'id'],
        ['document', 'name']
      ]) ?? 'No Title';

      const link = VertexAISearchStrategy.pickText(result, [
        ['document', 'derivedStructData', 'link'],
        ['document', 'derivedStructData', 'url'],
        ['document', 'structData', 'link'],
        ['document', 'structData', 'url'],
        ['chunk', 'derivedStructData', 'link'],
        ['chunk', 'derivedStructData', 'url'],
        ['chunk', 'structData', 'link'],
        ['chunk', 'structData', 'url'],
        ['document', 'name']
      ]) ?? 'No Link';

      const snippet = VertexAISearchStrategy.pickText(result, [
        ['document', 'derivedStructData', 'snippet'],
        ['document', 'derivedStructData', 'description'],
        ['document', 'structData', 'snippet'],
        ['document', 'structData', 'description'],
        ['chunk', 'content'],
        ['snippetInfo', 'snippet'],
        ['summary']
      ]) ?? 'No Snippet';

      return `${index + 1}. ${title}\n   Link: ${link}\n   Snippet: ${snippet}`;
    });

    return `Search Results:\n${lines.join('\n')}`;
  }

  async search(query: string, numResults: number): Promise<string> {
    const url = `${VertexAISearchStrategy.API_BASE_URL}/${this.servingConfigPath}:searchLite`;
    const payload = {
      query,
      pageSize: numResults
    };

    try {
      const response = await axios.post(url, payload, {
        params: { key: this.apiKey },
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true
      });

      if (response.status === 200) {
        return this.formatResults((response.data ?? {}) as Record<string, unknown>);
      }

      const errorText = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
      throw new Error(`Vertex AI Search API request failed with status ${response.status}: ${errorText}`);
    } catch (error) {
      if (error instanceof Error && (error as AxiosError).isAxiosError) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          const status = axiosError.response.status;
          const data = axiosError.response.data;
          const errorText = typeof data === 'string' ? data : JSON.stringify(data);
          throw new Error(`Vertex AI Search API request failed with status ${status}: ${errorText}`);
        }
        throw new Error(`A network error occurred during Vertex AI Search: ${axiosError.message}`);
      }
      throw error;
    }
  }
}
