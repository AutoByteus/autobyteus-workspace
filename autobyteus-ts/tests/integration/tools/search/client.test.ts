import { describe, it, expect } from 'vitest';
import { SearchClient } from '../../../../src/tools/search/client.js';
import { SearchStrategy } from '../../../../src/tools/search/base-strategy.js';

class TrackingStrategy extends SearchStrategy {
  public lastQuery: string | null = null;
  public lastNumResults: number | null = null;

  async search(query: string, numResults: number): Promise<string> {
    this.lastQuery = query;
    this.lastNumResults = numResults;
    return 'ok';
  }

  protected formatResults(_data: Record<string, any>): string {
    return '';
  }
}

describe('SearchClient (integration)', () => {
  it('passes arguments through to the strategy', async () => {
    const strategy = new TrackingStrategy();
    const client = new SearchClient(strategy);

    const result = await client.search('hello', 5);

    expect(result).toBe('ok');
    expect(strategy.lastQuery).toBe('hello');
    expect(strategy.lastNumResults).toBe(5);
  });
});
