import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { VertexAISearchStrategy } from '../../../../src/tools/search/vertex-ai-search-strategy.js';

const originalEnv = { ...process.env };

describe('VertexAISearchStrategy', () => {
  beforeEach(() => {
    process.env.VERTEX_AI_SEARCH_API_KEY = 'test-key';
    process.env.VERTEX_AI_SEARCH_SERVING_CONFIG =
      'projects/p/locations/global/collections/default_collection/engines/e/servingConfigs/default_search';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('formats results from derivedStructData', () => {
    const strategy = new VertexAISearchStrategy();
    const output = (strategy as any).formatResults({
      results: [
        {
          document: {
            derivedStructData: {
              title: 'Result 1',
              url: 'https://example.com',
              snippet: 'Snippet 1'
            }
          }
        }
      ]
    });

    expect(output).toContain('Search Results:');
    expect(output).toContain('1. Result 1');
    expect(output).toContain('Link: https://example.com');
    expect(output).toContain('Snippet: Snippet 1');
  });

  it('returns fallback when no results', () => {
    const strategy = new VertexAISearchStrategy();
    const output = (strategy as any).formatResults({});
    expect(output).toBe('No relevant information found for the query via Vertex AI Search.');
  });

  it('calls searchLite with API key and pageSize', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      status: 200,
      data: { results: [] }
    } as any);

    const strategy = new VertexAISearchStrategy();
    await strategy.search('hello', 4);

    expect(postSpy).toHaveBeenCalledTimes(1);
    const [url, payload, config] = postSpy.mock.calls[0] ?? [];

    expect(url).toBe(
      'https://discoveryengine.googleapis.com/v1alpha/projects/p/locations/global/collections/default_collection/engines/e/servingConfigs/default_search:searchLite'
    );
    expect(payload).toEqual({ query: 'hello', pageSize: 4 });
    expect((config as any).params).toEqual({ key: 'test-key' });
  });

  it('throws for non-200 responses', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      status: 403,
      data: { error: 'forbidden' }
    } as any);

    const strategy = new VertexAISearchStrategy();
    await expect(strategy.search('query', 2)).rejects.toThrow(
      'Vertex AI Search API request failed with status 403:'
    );
  });

  it('rejects when required environment variables are missing', () => {
    delete process.env.VERTEX_AI_SEARCH_API_KEY;
    expect(() => new VertexAISearchStrategy()).toThrow(
      "VertexAISearchStrategy requires both 'VERTEX_AI_SEARCH_API_KEY' and 'VERTEX_AI_SEARCH_SERVING_CONFIG'"
    );
  });

  it('rejects an invalid serving config path', () => {
    process.env.VERTEX_AI_SEARCH_SERVING_CONFIG = 'projects/p/locations/global/engines/e';
    expect(() => new VertexAISearchStrategy()).toThrow(
      'VERTEX_AI_SEARCH_SERVING_CONFIG must include a full serving config path'
    );
  });
});
