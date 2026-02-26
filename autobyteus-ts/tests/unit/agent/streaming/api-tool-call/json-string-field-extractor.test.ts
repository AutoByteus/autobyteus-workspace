import { describe, it, expect } from 'vitest';
import { JsonStringFieldExtractor } from '../../../../../src/agent/streaming/api-tool-call/json-string-field-extractor.js';

describe('JsonStringFieldExtractor', () => {
  it('extracts path and content across chunks', () => {
    const extractor = new JsonStringFieldExtractor(new Set(['content']), new Set(['path', 'content']));

    const res1 = extractor.feed('{"path":"a.txt","content":"hel');
    expect(res1.completed).toEqual({ path: 'a.txt' });
    expect(res1.deltas).toEqual({ content: 'hel' });

    const res2 = extractor.feed('lo\\');
    expect(res2.deltas).toEqual({ content: 'lo' });
    expect(res2.completed).toEqual({});

    const res3 = extractor.feed('nwo');
    expect(res3.deltas).toEqual({ content: '\nwo' });
    expect(res3.completed).toEqual({});

    const res4 = extractor.feed('rld"}');
    expect(res4.deltas).toEqual({ content: 'rld' });
    expect(res4.completed).toEqual({ content: 'hello\nworld' });
  });

  it('handles escaped quotes and backslashes', () => {
    const extractor = new JsonStringFieldExtractor(new Set(['content']));

    const res1 = extractor.feed('{"content":"He said: \\');
    expect(res1.deltas).toEqual({ content: 'He said: ' });

    const res2 = extractor.feed('"hi\\');
    expect(res2.deltas).toEqual({ content: '"hi' });

    const res3 = extractor.feed('" and \\\\\\\\ ok"}');
    expect(res3.deltas).toEqual({ content: '" and \\\\ ok' });
    expect(res3.completed).toEqual({ content: 'He said: "hi" and \\\\ ok' });
  });
});
