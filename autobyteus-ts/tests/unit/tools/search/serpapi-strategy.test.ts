import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { SerpApiSearchStrategy } from '../../../../src/tools/search/serpapi-strategy.js';

const originalEnv = { ...process.env };

describe('SerpApiSearchStrategy', () => {
  beforeEach(() => {
    process.env.SERPAPI_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('formats organic results', () => {
    const strategy = new SerpApiSearchStrategy();
    const output = (strategy as any).formatResults({
      organic_results: [
        { title: 'Result 1', link: 'http://example.com', snippet: 'Snippet 1' }
      ]
    });

    expect(output).toContain('Search Results:');
    expect(output).toContain('1. Result 1');
  });

  it('returns fallback when no organic results', () => {
    const strategy = new SerpApiSearchStrategy();
    const output = (strategy as any).formatResults({});
    expect(output).toBe('No relevant information found for the query via SerpApi.');
  });

  it('returns formatted results on success', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { organic_results: [{ title: 'Title', link: 'Link', snippet: 'Snippet' }] }
    } as any);

    const strategy = new SerpApiSearchStrategy();
    await expect(strategy.search('query', 3)).resolves.toContain('Search Results:');
  });

  it('throws a descriptive error for non-200 responses', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 500,
      data: { error: 'server error' }
    } as any);

    const strategy = new SerpApiSearchStrategy();
    await expect(strategy.search('query', 3)).rejects.toThrow(
      'SerpApi API request failed with status 500:'
    );
  });
});
