import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { VertexAISearchStrategy } from '../../../../src/tools/search/vertex-ai-search-strategy.js';

const servingConfig =
  'projects/p/locations/global/collections/default_collection/engines/e/servingConfigs/default_search';

describe('VertexAISearchStrategy (integration)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('sends explicitly provisioned authentication to the configured serving path', async () => {
    const postSpy = vi.spyOn(axios, 'post').mockResolvedValue({ status: 200, data: { results: [] } } as any);
    const strategy = new VertexAISearchStrategy('synthetic-test-key', servingConfig);

    await expect(strategy.search('OpenAI', 3)).resolves.toBe(
      'No relevant information found for the query via Vertex AI Search.',
    );
    expect(postSpy).toHaveBeenCalledWith(
      `https://discoveryengine.googleapis.com/v1alpha/${servingConfig}:searchLite`,
      { query: 'OpenAI', pageSize: 3 },
      expect.objectContaining({ params: { key: 'synthetic-test-key' } }),
    );
  });
});
