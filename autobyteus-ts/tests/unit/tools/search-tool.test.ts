import { describe, it, expect, vi } from 'vitest';
import { Search } from '../../../src/tools/search-tool.js';
import { ParameterType } from '../../../src/utils/parameter-schema.js';

describe('Search tool', () => {
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

  it('requires an injected server-owned executor', () => {
    expect(() => new Search()).toThrow('Search requires an injected server-owned SearchExecutor.');
  });

  it('delegates execution to the injected executor', async () => {
    const fakeExecutor = {
      search: vi.fn().mockResolvedValue('result')
    };

    const tool = new Search(undefined, fakeExecutor);
    const result = await (tool as any)._execute({ agentId: 'a1' }, { query: 'query', num_results: 2 });

    expect(fakeExecutor.search).toHaveBeenCalledWith('query', 2);
    expect(result).toBe('result');
  });
});
