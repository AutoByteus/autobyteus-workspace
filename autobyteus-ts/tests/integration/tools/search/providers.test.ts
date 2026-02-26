import { describe, it, expect } from 'vitest';
import { SearchProvider } from '../../../../src/tools/search/providers.js';

describe('SearchProvider (integration)', () => {
  it('matches expected provider names', () => {
    const values = Object.values(SearchProvider);
    expect(values).toContain('serper');
    expect(values).toContain('serpapi');
    expect(values).toContain('vertex_ai_search');
  });
});
