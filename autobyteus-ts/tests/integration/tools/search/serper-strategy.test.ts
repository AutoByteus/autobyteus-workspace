import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { SerperSearchStrategy } from '../../../../src/tools/search/serper-strategy.js';

const originalEnv = { ...process.env };

describe('SerperSearchStrategy (integration)', () => {
  beforeEach(() => {
    process.env.SERPER_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('sends API key header and query payload', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      status: 200,
      data: { organic: [] }
    } as any);

    const strategy = new SerperSearchStrategy();
    await strategy.search('hello', 2);

    expect(postSpy).toHaveBeenCalled();
    const [url, payload, config] = postSpy.mock.calls[0] ?? [];
    expect(url).toBe(SerperSearchStrategy.API_URL);
    expect(payload).toEqual({ q: 'hello', num: 2 });
    expect(config).toBeDefined();
    expect((config as any).headers?.['X-API-KEY']).toBe('test-key');
  });
});
