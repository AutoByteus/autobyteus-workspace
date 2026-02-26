import { describe, it, expect } from 'vitest';
import { SearchProvider } from '../../../../src/tools/search/providers.js';

describe('SearchProvider', () => {
  it('exposes provider string values', () => {
    expect(SearchProvider.SERPER).toBe('serper');
    expect(SearchProvider.SERPAPI).toBe('serpapi');
    expect(SearchProvider.VERTEX_AI_SEARCH).toBe('vertex_ai_search');
  });
});
