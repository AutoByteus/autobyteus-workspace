import axios, { AxiosError } from 'axios';
import { SearchStrategy } from './base-strategy.js';

export class SerpApiSearchStrategy extends SearchStrategy {
  static API_URL = 'https://serpapi.com/search.json';
  private apiKey: string;

  constructor() {
    super();
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      throw new Error("SerpApiSearchStrategy requires the 'SERPAPI_API_KEY' environment variable to be set.");
    }
    this.apiKey = apiKey;
  }

  protected formatResults(data: Record<string, unknown>): string {
    const organicResults = data['organic_results'];
    if (!Array.isArray(organicResults) || organicResults.length === 0) {
      return 'No relevant information found for the query via SerpApi.';
    }

    const resultsStr = organicResults
      .map((result: unknown, index: number) => {
        const record = result as Record<string, unknown>;
        return (
          `${index + 1}. ${String(record['title'] ?? 'No Title')}\n` +
          `   Link: ${String(record['link'] ?? 'No Link')}\n` +
          `   Snippet: ${String(record['snippet'] ?? 'No Snippet')}`
        );
      })
      .join('\n');

    return `Search Results:\n${resultsStr}`;
  }

  async search(query: string, numResults: number): Promise<string> {
    const params = {
      api_key: this.apiKey,
      engine: 'google',
      q: query,
      num: numResults
    };

    try {
      const response = await axios.get(SerpApiSearchStrategy.API_URL, {
        params,
        validateStatus: () => true
      });

      if (response.status === 200) {
        return this.formatResults(response.data ?? {});
      }

      const errorText = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);
      throw new Error(`SerpApi API request failed with status ${response.status}: ${errorText}`);
    } catch (error) {
      if (error instanceof Error && (error as AxiosError).isAxiosError) {
        const axiosError = error as AxiosError;
        if (axiosError.response) {
          const status = axiosError.response.status;
          const data = axiosError.response.data;
          const errorText = typeof data === 'string' ? data : JSON.stringify(data);
          throw new Error(`SerpApi API request failed with status ${status}: ${errorText}`);
        }
        throw new Error(`A network error occurred during SerpApi search: ${axiosError.message}`);
      }
      throw error;
    }
  }
}
