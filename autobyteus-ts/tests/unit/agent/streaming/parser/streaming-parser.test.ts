import { describe, it, expect } from 'vitest';
import { StreamingParser, parseCompleteResponse, extractSegments } from '../../../../../src/agent/streaming/parser/streaming-parser.js';
import { ParserConfig } from '../../../../../src/agent/streaming/parser/parser-context.js';
import { SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/parser/events.js';

describe('StreamingParser basics', () => {
  it('parses simple text response', () => {
    const parser = new StreamingParser();
    const events = parser.feed('Hello, I can help you with that!');
    events.push(...parser.finalize());

    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents.length).toBeGreaterThanOrEqual(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.TEXT);
  });

  it('empty input produces no events', () => {
    const parser = new StreamingParser();
    const events = parser.feed('');
    events.push(...parser.finalize());
    expect(events).toHaveLength(0);
  });

  it('handles multiple chunks', () => {
    const parser = new StreamingParser();
    const events1 = parser.feed('Hello, ');
    const events2 = parser.feed('World!');
    const events3 = parser.finalize();

    const allEvents = [...events1, ...events2, ...events3];
    expect(allEvents.length).toBeGreaterThan(0);
  });
});

describe('StreamingParser file parsing', () => {
  it('parses complete write_file tag', () => {
    const parser = new StreamingParser();
    const events = parser.feedAndFinalize(
      "Here is the code:<write_file path='/test.py'>print('hello')</write_file>Done!"
    );

    const segments = extractSegments(events);
    const writeFileSegments = segments.filter((s) => s.type === 'write_file');
    expect(writeFileSegments.length).toBeGreaterThanOrEqual(1);
    expect(writeFileSegments[0].metadata.path).toBe('/test.py');
  });
});

describe('StreamingParser tool parsing', () => {
  it('parses tool call when enabled', () => {
    const config = new ParserConfig({ parseToolCalls: true, strategyOrder: ['xml_tag'] });
    const parser = new StreamingParser(config);

    const events = parser.feedAndFinalize(
      "Let me check:<tool name='weather'><arguments><city>NYC</city></arguments></tool>"
    );

    const segments = extractSegments(events);
    const toolSegments = segments.filter((s) => s.type === 'tool_call');
    expect(toolSegments.length).toBeGreaterThanOrEqual(1);
  });

  it('run_bash followed by tool in same chunk', () => {
    const config = new ParserConfig({ parseToolCalls: true, strategyOrder: ['xml_tag'] });
    const parser = new StreamingParser(config);

    const text =
      "<tool name='run_bash'>" +
      "<arguments><arg name='command'>ls -la</arg></arguments>" +
      '</tool>' +
      "<tool name='generate_image'>" +
      "<arguments><arg name='prompt'>A cat</arg></arguments>" +
      '</tool>';

    const events = parser.feedAndFinalize(text);
    const segments = extractSegments(events);

    const segmentTypes = segments.map((s) => s.type);
    expect(segmentTypes.filter((t) => t === 'run_bash')).toHaveLength(1);
    expect(segmentTypes.filter((t) => t === 'tool_call')).toHaveLength(1);
  });

  it('treats tool tags as text when parsing disabled', () => {
    const config = new ParserConfig({ parseToolCalls: false });
    const parser = new StreamingParser(config);

    const events = parser.feedAndFinalize("<tool name='test'>args</tool>");
    const segments = extractSegments(events);
    const toolSegments = segments.filter((s) => s.type === 'tool_call');
    expect(toolSegments).toHaveLength(0);
  });

  it('parses JSON tool call split across chunks', () => {
    const config = new ParserConfig({ parseToolCalls: true, strategyOrder: ['json_tool'] });
    const parser = new StreamingParser(config);

    const chunks = ['{"name": "do_something", "arguments": {"x": ', '1, "y": "ok"}} trailing'];

    const events: any[] = [];
    for (const chunk of chunks) {
      events.push(...parser.feed(chunk));
    }
    events.push(...parser.finalize());

    const toolStart = events.find(
      (e) => e.event_type === SegmentEventType.START && e.segment_type === SegmentType.TOOL_CALL
    );
    expect(toolStart).toBeDefined();

    const toolEnd = events.find(
      (e) => e.event_type === SegmentEventType.END && e.segment_id === toolStart.segment_id
    );
    expect(toolEnd).toBeDefined();
    expect(toolEnd.payload?.metadata?.arguments).toBeUndefined();
  });
});

describe('StreamingParser mixed content', () => {
  it('parses text and write_file', () => {
    const parser = new StreamingParser();
    const events = parser.feedAndFinalize(
      "Here is the solution:\n<write_file path='/main.py'>print('done')</write_file>\nLet me know!"
    );

    const segments = extractSegments(events);
    const types = new Set(segments.map((s) => s.type));
    expect(types.has('text')).toBe(true);
    expect(types.has('write_file')).toBe(true);
  });

  it('parses multiple write_file blocks', () => {
    const parser = new StreamingParser();
    const events = parser.feedAndFinalize(
      "<write_file path='/a.py'>a</write_file><write_file path='/b.py'>b</write_file>"
    );

    const segments = extractSegments(events);
    const writeFileSegments = segments.filter((s) => s.type === 'write_file');
    expect(writeFileSegments.length).toBeGreaterThanOrEqual(2);
  });
});

describe('StreamingParser state management', () => {
  it('cannot feed after finalize', () => {
    const parser = new StreamingParser();
    parser.feed('test');
    parser.finalize();

    expect(() => parser.feed('more')).toThrow(/Cannot feed/);
  });

  it('cannot finalize twice', () => {
    const parser = new StreamingParser();
    parser.finalize();

    expect(() => parser.finalize()).toThrow(/already been called/);
  });

  it('isFinalized property works', () => {
    const parser = new StreamingParser();
    expect(parser.isFinalized).toBe(false);

    parser.finalize();
    expect(parser.isFinalized).toBe(true);
  });
});

describe('StreamingParser convenience functions', () => {
  it('parseCompleteResponse works', () => {
    const events = parseCompleteResponse('Hello World!');
    expect(events.length).toBeGreaterThan(0);
    const segments = extractSegments(events);
    expect(segments.length).toBeGreaterThanOrEqual(1);
  });

  it('extractSegments builds segment list', () => {
    const parser = new StreamingParser();
    const events = parser.feedAndFinalize('Plain text here');

    const segments = extractSegments(events);
    expect(segments.length).toBeGreaterThanOrEqual(1);
    expect(segments[0].type).toBe('text');
    expect(segments[0].content).toContain('Plain text here');
  });
});

describe('StreamingParser streaming scenarios', () => {
  it('handles chunk-by-chunk streaming', () => {
    const parser = new StreamingParser();
    const allEvents: any[] = [];

    const chunks = ['He', 'llo, ', 'I can ', 'help you!'];
    for (const chunk of chunks) {
      allEvents.push(...parser.feed(chunk));
    }
    allEvents.push(...parser.finalize());

    const segments = extractSegments(allEvents);
    const combinedText = segments.filter((s) => s.type === 'text').map((s) => s.content).join('');
    expect(combinedText).toContain('Hello, I can help you!');
  });

  it('handles write_file split across chunks', () => {
    const parser = new StreamingParser();
    const allEvents: any[] = [];

    const chunks = ["<wri", "te_file path='/test.py'>print", "('hello')</write_file>"];
    for (const chunk of chunks) {
      allEvents.push(...parser.feed(chunk));
    }
    allEvents.push(...parser.finalize());

    const segments = extractSegments(allEvents);
    const writeFileSegments = segments.filter((s) => s.type === 'write_file');
    expect(writeFileSegments.length).toBeGreaterThanOrEqual(1);
  });
});
