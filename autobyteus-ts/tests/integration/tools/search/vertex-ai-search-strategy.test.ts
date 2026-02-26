import { describe, it, expect } from 'vitest';
import { VertexAISearchStrategy } from '../../../../src/tools/search/vertex-ai-search-strategy.js';

const apiKey = process.env.VERTEX_AI_SEARCH_API_KEY;
const servingConfig = process.env.VERTEX_AI_SEARCH_SERVING_CONFIG;
const runIntegration = apiKey && servingConfig ? describe : describe.skip;

runIntegration('VertexAISearchStrategy (integration)', () => {
  it('performs a live search against Vertex AI Search', async () => {
    const strategy = new VertexAISearchStrategy();
    const output = await strategy.search('OpenAI', 3);

    expect(typeof output).toBe('string');
    expect(output.length).toBeGreaterThan(0);
    expect(
      output.startsWith('Search Results:') ||
      output === 'No relevant information found for the query via Vertex AI Search.'
    ).toBe(true);
  }, 30000);
});
