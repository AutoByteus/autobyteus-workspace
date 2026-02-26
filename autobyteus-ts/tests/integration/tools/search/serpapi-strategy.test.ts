import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { SerpApiSearchStrategy } from '../../../../src/tools/search/serpapi-strategy.js';

const originalEnv = { ...process.env };

describe('SerpApiSearchStrategy (integration)', () => {
  beforeEach(() => {
    process.env.SERPAPI_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('passes query params to SerpApi', async () => {
    const getSpy = vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: { organic_results: [] }
    } as any);

    const strategy = new SerpApiSearchStrategy();
    await strategy.search('hello', 4);

    expect(getSpy).toHaveBeenCalled();
    const [url, config] = getSpy.mock.calls[0] ?? [];
    expect(url).toBe(SerpApiSearchStrategy.API_URL);
    expect(config).toBeDefined();
    expect((config as any).params).toEqual({
      api_key: 'test-key',
      engine: 'google',
      q: 'hello',
      num: 4
    });
  });
});
