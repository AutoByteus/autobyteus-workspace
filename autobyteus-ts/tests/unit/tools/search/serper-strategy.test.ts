import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { SerperSearchStrategy } from '../../../../src/tools/search/serper-strategy.js';

const originalEnv = { ...process.env };

describe('SerperSearchStrategy', () => {
  beforeEach(() => {
    process.env.SERPER_API_KEY = 'test-key';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('formats results with answer box, knowledge graph, and organic results', () => {
    const strategy = new SerperSearchStrategy();
    const output = (strategy as any).formatResults({
      answerBox: { title: 'Question', snippet: 'Answer' },
      knowledgeGraph: { title: 'Entity', description: 'Entity description' },
      organic: [
        { title: 'Result 1', link: 'http://example.com', snippet: 'Snippet 1' }
      ]
    });

    expect(output).toContain("Direct Answer for 'Question':\nAnswer");
    expect(output).toContain("Summary for 'Entity':\nEntity description");
    expect(output).toContain('Search Results:');
    expect(output).toContain('1. Result 1');
  });

  it('returns fallback when no data is available', () => {
    const strategy = new SerperSearchStrategy();
    const output = (strategy as any).formatResults({});
    expect(output).toBe('No relevant information found for the query via Serper.');
  });

  it('returns formatted results on success', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      status: 200,
      data: { organic: [{ title: 'Title', link: 'Link', snippet: 'Snippet' }] }
    } as any);

    const strategy = new SerperSearchStrategy();
    await expect(strategy.search('query', 3)).resolves.toContain('Search Results:');
  });

  it('throws a descriptive error for non-200 responses', async () => {
    vi.spyOn(axios, 'post').mockResolvedValue({
      status: 400,
      data: { error: 'bad request' }
    } as any);

    const strategy = new SerperSearchStrategy();
    await expect(strategy.search('query', 3)).rejects.toThrow(
      'Serper API request failed with status 400:'
    );
  });
});
