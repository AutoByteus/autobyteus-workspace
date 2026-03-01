import { describe, it, expect, afterEach, vi } from 'vitest';
import axios from 'axios';
import { SerpApiSearchStrategy } from '../../../../src/tools/search/serpapi-strategy.js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') });

const originalEnv = { ...process.env };

describe('SerpApiSearchStrategy (integration)', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('passes query params to SerpApi', async () => {
    process.env.SERPAPI_API_KEY = 'test-key';
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

  it('performs a live search when a real SERPAPI_API_KEY is provided', async () => {
    const realKey = originalEnv.SERPAPI_API_KEY;
    if (!realKey || realKey === 'test-key') {
      console.log('Skipping live test because no real SERPAPI_API_KEY is set in environment.');
      return;
    }
    
    process.env.SERPAPI_API_KEY = realKey;
    const strategy = new SerpApiSearchStrategy();
    
    const results = await strategy.search('vitest framework', 2);
    
    expect(results).toBeDefined();
    expect(typeof results).toBe('string');
    expect(results).toContain('Search Results:');
    expect(results.length).toBeGreaterThan(20);
  });
});
