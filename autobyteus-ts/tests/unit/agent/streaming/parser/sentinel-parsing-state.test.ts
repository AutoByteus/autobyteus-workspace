import { describe, it, expect } from 'vitest';
import { ParserConfig } from '../../../../../src/agent/streaming/parser/parser-context.js';
import { StreamingParser, extractSegments } from '../../../../../src/agent/streaming/parser/streaming-parser.js';

describe('Sentinel parsing', () => {
  it('parses sentinel write_file segment', () => {
    const config = new ParserConfig({ strategyOrder: ['sentinel'] });
    const parser = new StreamingParser(config);

    const text =
      '[[SEG_START {"type":"write_file","path":"/a.py"}]]' +
      'print("hi")' +
      '[[SEG_END]]';

    const events = parser.feedAndFinalize(text);
    const segments = extractSegments(events);

    const writeFileSegments = segments.filter((s) => s.type === 'write_file');
    expect(writeFileSegments).toHaveLength(1);
    expect(writeFileSegments[0].metadata.path).toBe('/a.py');
    expect(writeFileSegments[0].content).toBe('print("hi")');
  });

  it('handles header split across chunks', () => {
    const config = new ParserConfig({ strategyOrder: ['sentinel'] });
    const parser = new StreamingParser(config);

    const chunks = ['[[SEG_START {"type":"run_terminal_cmd","path":"/x"', '}]]echo hi[[SEG_END]]'];
    const events: any[] = [];
    for (const chunk of chunks) {
      events.push(...parser.feed(chunk));
    }
    events.push(...parser.finalize());

    const segments = extractSegments(events);
    const cmdSegments = segments.filter((s) => s.type === 'run_bash');
    expect(cmdSegments).toHaveLength(1);
    expect(cmdSegments[0].content).toBe('echo hi');
  });

  it('falls back to text on invalid header', () => {
    const config = new ParserConfig({ strategyOrder: ['sentinel'] });
    const parser = new StreamingParser(config);

    const text = '[[SEG_START not-json]]oops[[SEG_END]]';
    const events = parser.feedAndFinalize(text);
    const segments = extractSegments(events);

    const textSegments = segments.filter((s) => s.type === 'text');
    expect(textSegments.length).toBeGreaterThanOrEqual(1);
    expect(textSegments[0].content).toContain('SEG_START');
  });
});
