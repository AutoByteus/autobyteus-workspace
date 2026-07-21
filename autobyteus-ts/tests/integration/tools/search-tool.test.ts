import { describe, expect, it, vi } from 'vitest';
import { Search } from '../../../src/tools/search-tool.js';

describe('Search tool (integration)', () => {
  it('uses the injected server-owned search executor', async () => {
    const search = vi.fn().mockResolvedValue('synthetic results');
    const tool = new Search(undefined, { search });

    await expect((tool as any)._execute({}, { query: 'hello', num_results: 2 })).resolves.toBe(
      'synthetic results',
    );
    expect(search).toHaveBeenCalledWith('hello', 2);
  });
});
