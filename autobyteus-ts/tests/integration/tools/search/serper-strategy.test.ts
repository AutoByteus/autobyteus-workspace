import { describe, it, expect, afterEach, vi } from 'vitest';
import axios from 'axios';
import { SerperSearchStrategy } from '../../../../src/tools/search/serper-strategy.js';

describe('SerperSearchStrategy (integration)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends explicitly provisioned authentication and the query payload', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({
      status: 200,
      data: { organic: [] },
    } as any);

    const strategy = new SerperSearchStrategy('synthetic-test-key');
    await strategy.search('hello', 2);

    expect(postSpy).toHaveBeenCalled();
    const [url, payload, config] = postSpy.mock.calls[0] ?? [];
    expect(url).toBe(SerperSearchStrategy.API_URL);
    expect(payload).toEqual({ q: 'hello', num: 2 });
    expect((config as any).headers?.['X-API-KEY']).toBe('synthetic-test-key');
  });
});
