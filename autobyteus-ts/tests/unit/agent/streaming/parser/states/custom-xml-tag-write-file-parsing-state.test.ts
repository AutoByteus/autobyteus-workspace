import { describe, it, expect } from 'vitest';
import { ParserContext, ParserConfig } from '../../../../../../src/agent/streaming/parser/parser-context.js';
import { CustomXmlTagWriteFileParsingState } from '../../../../../../src/agent/streaming/parser/states/custom-xml-tag-write-file-parsing-state.js';
import { TextState } from '../../../../../../src/agent/streaming/parser/states/text-state.js';
import { SegmentEventType, SegmentType } from '../../../../../../src/agent/streaming/parser/events.js';

const TURN_ID = 'turn_test';
const createConfig = (options: Record<string, any> = {}) => new ParserConfig({ turnId: TURN_ID, ...options });
const createContext = () => new ParserContext(createConfig());

describe('CustomXmlTagWriteFileParsingState basics', () => {
  it('parses file content with path attribute', () => {
    const ctx = createContext();
    ctx.append("print('hello')</write_file>");

    const state = new CustomXmlTagWriteFileParsingState(ctx, "<write_file path='/test.py'>");
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.WRITE_FILE);
    expect(startEvents[0].payload.metadata?.path).toBe('/test.py');

    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const content = contentEvents.map((e) => e.payload.delta).join('');
    expect(content).toBe("print('hello')");

    expect(ctx.currentState).toBeInstanceOf(TextState);
  });

  it('treats missing path as text', () => {
    const ctx = createContext();
    ctx.append('content</write_file>');

    const state = new CustomXmlTagWriteFileParsingState(ctx, '<write_file>');
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.TEXT);
  });
});

describe('CustomXmlTagWriteFileParsingState streaming', () => {
  it('holds back partial closing tags', () => {
    const ctx = createContext();
    ctx.append('hello world content</wri');

    const state = new CustomXmlTagWriteFileParsingState(ctx, "<write_file path='/a.py'>");
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const content = contentEvents.map((e) => e.payload.delta).join('');
    expect(content).toContain('hello world');
    expect(content).not.toContain('</wri');
  });
});

describe('CustomXmlTagWriteFileParsingState finalize', () => {
  it('finalize emits remaining content', () => {
    const ctx = createContext();
    ctx.append('partial content');

    const state = new CustomXmlTagWriteFileParsingState(ctx, "<write_file path='/a.py'>");
    ctx.currentState = state;
    state.run();
    state.finalize();

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });
});
