import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Search } from '../../../src/tools/search-tool.js';
import { SearchClientFactory } from '../../../src/tools/search/factory.js';
import { SearchClient } from '../../../src/tools/search/client.js';
import { ParameterType } from '../../../src/utils/parameter-schema.js';

const originalEnv = { ...process.env };

const resetFactory = () => {
  (SearchClientFactory as any).instance = undefined;
};

describe('Search tool', () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    resetFactory();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetFactory();
    vi.restoreAllMocks();
  });

  it('exposes expected argument schema', () => {
    const schema = Search.getArgumentSchema();
    expect(schema).toBeTruthy();
    const query = schema?.getParameter('query');
    const numResults = schema?.getParameter('num_results');

    expect(query?.type).toBe(ParameterType.STRING);
    expect(query?.required).toBe(true);
    expect(numResults?.type).toBe(ParameterType.INTEGER);
    expect(numResults?.defaultValue).toBe(5);
  });

  it('throws a friendly error when search client creation fails', () => {
    const factorySpy = vi.spyOn(SearchClientFactory.prototype, 'createSearchClient')
      .mockImplementation(() => {
        throw new Error('No search provider is configured');
      });

    expect(() => new Search()).toThrow('Could not initialize Search tool');
    factorySpy.mockRestore();
  });

  it('delegates execution to the search client', async () => {
    const fakeClient: SearchClient = {
      search: vi.fn().mockResolvedValue('result')
    } as unknown as SearchClient;

    vi.spyOn(SearchClientFactory.prototype, 'createSearchClient').mockReturnValue(fakeClient);

    const tool = new Search();
    const result = await (tool as any)._execute({ agentId: 'a1' }, { query: 'query', num_results: 2 });

    expect(fakeClient.search).toHaveBeenCalledWith('query', 2);
    expect(result).toBe('result');
  });
});
