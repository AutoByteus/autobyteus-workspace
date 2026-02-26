import { describe, it, expect } from 'vitest';
import { SearchClient } from '../../../../src/tools/search/client.js';
import { SearchStrategy } from '../../../../src/tools/search/base-strategy.js';

class DummyStrategy extends SearchStrategy {
  async search(query: string, numResults: number): Promise<string> {
    return `${query}:${numResults}`;
  }

  protected formatResults(_data: Record<string, any>): string {
    return '';
  }
}

describe('SearchClient', () => {
  it('throws when initialized without a strategy', () => {
    expect(() => new SearchClient(undefined as unknown as SearchStrategy)).toThrow(
      'SearchClient must be initialized with a valid SearchStrategy.'
    );
  });

  it('delegates search to the strategy', async () => {
    const client = new SearchClient(new DummyStrategy());
    await expect(client.search('query', 2)).resolves.toBe('query:2');
  });
});
