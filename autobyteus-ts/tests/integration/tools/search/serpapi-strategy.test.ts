import { describe, it, expect, afterEach, vi } from 'vitest';
import axios from 'axios';
import { SerpApiSearchStrategy } from '../../../../src/tools/search/serpapi-strategy.js';

describe('SerpApiSearchStrategy (integration)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('passes explicitly provisioned authentication and query params to SerpApi', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { organic_results: [] },
    } as any);

    const strategy = new SerpApiSearchStrategy('synthetic-test-key');
    await strategy.search('hello', 4);

    expect(getSpy).toHaveBeenCalled();
    const [url, config] = getSpy.mock.calls[0] ?? [];
    expect(url).toBe(SerpApiSearchStrategy.API_URL);
    expect(config).toBeDefined();
    expect((config as any).params).toEqual({
      api_key: 'synthetic-test-key',
      engine: 'google',
      q: 'hello',
      num: 4,
    });
  });
});
