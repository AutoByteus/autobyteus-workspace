import { describe, it, expect } from 'vitest';
import { ParserConfig } from '../../../../../src/agent/streaming/parser/parser-context.js';
import { StreamingParser, extractSegments } from '../../../../../src/agent/streaming/parser/streaming-parser.js';
import { SegmentType } from '../../../../../src/agent/streaming/segments/segment-events.js';
import { SegmentEventType } from '../../../../../src/agent/streaming/parser/events.js';

const collectEvents = (chunks: string[], config?: ParserConfig) => {
  const parser = new StreamingParser(config);
  const events = [] as ReturnType<typeof parser.feed>;
  for (const chunk of chunks) {
    events.push(...parser.feed(chunk));
  }
  events.push(...parser.finalize());
  return events;
};

const collectSegments = (chunks: string[], config?: ParserConfig) => {
  return extractSegments(collectEvents(chunks, config));
};

describe('StreamingParser (integration)', () => {
  it('parses a single chunk of text', () => {
    const segments = collectSegments(['Hello, I can help you with that!']);
    expect(segments).toHaveLength(1);
    expect(segments[0].type).toBe(SegmentType.TEXT);
    expect(segments[0].content).toBe('Hello, I can help you with that!');
  });

  it('parses text arriving in multiple chunks', () => {
    const segments = collectSegments(['Hello, ', 'I can ', 'help you!']);
    const combined = segments
      .filter((segment) => segment.type === SegmentType.TEXT)
      .map((segment) => segment.content)
      .join('');
    expect(combined).toBe('Hello, I can help you!');
  });

  it('parses a write_file tag in one chunk', () => {
    const segments = collectSegments([
      "Here is the file:<write_file path='/test.py'>print('hello')</write_file>Done!"
    ]);
    const types = segments.map((segment) => segment.type);
    expect(types).toContain(SegmentType.WRITE_FILE);
  });

  it('parses a write_file tag split across chunks', () => {
    const segments = collectSegments([
      'Code:<wri',
      "te_file path='/test.py'>def ",
      'hello():\n    pass</write_file>'
    ]);
    const writeFileSegments = segments.filter((segment) => segment.type === SegmentType.WRITE_FILE);
    expect(writeFileSegments.length).toBeGreaterThanOrEqual(1);
  });

  it('parses a run_bash tag', () => {
    const segments = collectSegments(['Run this:<run_bash>ls -la</run_bash>']);
    const runBashSegments = segments.filter((segment) => segment.type === SegmentType.RUN_BASH);
    expect(runBashSegments.length).toBeGreaterThanOrEqual(1);
  });

  it('parses run_bash metadata from custom XML tag attributes', () => {
    const segments = collectSegments([
      "Run this:<run_bash background='true' timeout_seconds='7'>ls -la</run_bash>"
    ]);
    const runBashSegment = segments.find((segment) => segment.type === SegmentType.RUN_BASH);
    expect(runBashSegment).toBeDefined();
    expect(runBashSegment?.metadata).toMatchObject({
      background: true,
      timeout_seconds: 7
    });
  });

  it('parses run_bash metadata from tool arguments', () => {
    const config = new ParserConfig({ parseToolCalls: true, strategyOrder: ['xml_tag'] });
    const events = collectEvents([
      "<tool name='run_bash'><arguments><arg name='background'>true</arg><arg name='timeoutSeconds'>11</arg><arg name='command'>echo hi</arg></arguments></tool>"
    ], config);
    const startEvent = events.find(
      (event) => event.event_type === SegmentEventType.START && event.segment_type === SegmentType.RUN_BASH
    );
    expect(startEvent).toBeDefined();
    const endEvent = events.find(
      (event) => event.event_type === SegmentEventType.END && event.segment_id === startEvent?.segment_id
    );
    expect(endEvent).toBeDefined();
    expect(endEvent?.payload.metadata).toMatchObject({
      tool_name: 'run_bash',
      background: true,
      timeout_seconds: 11
    });
  });

  it('parses a tool tag when tool parsing is enabled', () => {
    const config = new ParserConfig({ parseToolCalls: true, strategyOrder: ['xml_tag'] });
    const segments = collectSegments(["Let me check:<tool name='weather'>city=NYC</tool>"] , config);
    const toolSegments = segments.filter((segment) => segment.type === SegmentType.TOOL_CALL);
    expect(toolSegments.length).toBeGreaterThanOrEqual(1);
  });

  it('treats tool tags as text when parsing is disabled', () => {
    const config = new ParserConfig({ parseToolCalls: false });
    const segments = collectSegments(["Here:<tool name='test'>args</tool>Done"], config);
    const toolSegments = segments.filter((segment) => segment.type === SegmentType.TOOL_CALL);
    expect(toolSegments.length).toBe(0);
  });

  it('parses mixed content with text and write_file blocks', () => {
    const segments = collectSegments([
      'Here is the solution:\n',
      "<write_file path='/main.py'>print('done')</write_file>\n",
      'Let me know if you need more help!'
    ]);
    const types = new Set(segments.map((segment) => segment.type));
    expect(types.has(SegmentType.TEXT)).toBe(true);
    expect(types.has(SegmentType.WRITE_FILE)).toBe(true);
  });

  it('parses multiple write_file blocks', () => {
    const segments = collectSegments([
      "<write_file path='/a.py'>a</write_file>",
      "<write_file path='/b.py'>b</write_file>"
    ]);
    const writeFileSegments = segments.filter((segment) => segment.type === SegmentType.WRITE_FILE);
    expect(writeFileSegments.length).toBeGreaterThanOrEqual(2);
  });

  it('emits incomplete tags as text at stream end', () => {
    const segments = collectSegments(['Some text <wri']);
    const combined = segments
      .filter((segment) => segment.type === SegmentType.TEXT)
      .map((segment) => segment.content)
      .join('');
    expect(combined).toContain('<wri');
  });

  it('treats unknown XML tags as text', () => {
    const segments = collectSegments(['Hello <span>world</span>!']);
    const nonTextSegments = segments.filter((segment) => segment.type !== SegmentType.TEXT);
    expect(nonTextSegments.length).toBe(0);
  });

  it('handles empty streams with no events', () => {
    const events = collectEvents([]);
    expect(events).toHaveLength(0);
  });
});
