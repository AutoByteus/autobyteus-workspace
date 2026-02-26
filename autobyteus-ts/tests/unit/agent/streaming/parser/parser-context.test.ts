import { describe, it, expect } from 'vitest';
import { ParserContext, ParserConfig } from '../../../../../src/agent/streaming/parser/parser-context.js';
import { SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/parser/events.js';

describe('ParserConfig', () => {
  it('uses default values', () => {
    const config = new ParserConfig();
    expect(config.parseToolCalls).toBe(true);
    expect(config.strategyOrder).toEqual(['xml_tag']);
  });

  it('respects custom values', () => {
    const config = new ParserConfig({ parseToolCalls: false, strategyOrder: ['json_tool'] });
    expect(config.parseToolCalls).toBe(false);
    expect(config.strategyOrder).toEqual(['json_tool']);
  });
});

describe('ParserContext initialization', () => {
  it('defaults to built-in config', () => {
    const ctx = new ParserContext();
    expect(ctx.parseToolCalls).toBe(true);
    expect(ctx.config.strategyOrder).toEqual(['xml_tag']);
    expect(ctx.hasMoreChars()).toBe(false);
    expect(ctx.getCurrentSegmentId()).toBeUndefined();
  });

  it('accepts custom config', () => {
    const config = new ParserConfig({ parseToolCalls: false });
    const ctx = new ParserContext(config);
    expect(ctx.parseToolCalls).toBe(false);
  });
});

describe('ParserContext scanner delegation', () => {
  it('appends and peeks', () => {
    const ctx = new ParserContext();
    ctx.append('hello');
    expect(ctx.peekChar()).toBe('h');
  });

  it('advances cursor', () => {
    const ctx = new ParserContext();
    ctx.append('abc');
    ctx.advance();
    expect(ctx.peekChar()).toBe('b');
  });

  it('advanceBy moves cursor', () => {
    const ctx = new ParserContext();
    ctx.append('hello world');
    ctx.advanceBy(6);
    expect(ctx.peekChar()).toBe('w');
  });

  it('tracks remaining chars', () => {
    const ctx = new ParserContext();
    expect(ctx.hasMoreChars()).toBe(false);
    ctx.append('a');
    expect(ctx.hasMoreChars()).toBe(true);
    ctx.advance();
    expect(ctx.hasMoreChars()).toBe(false);
  });

  it('gets and sets position', () => {
    const ctx = new ParserContext();
    ctx.append('hello');
    ctx.advanceBy(3);
    expect(ctx.getPosition()).toBe(3);
    ctx.setPosition(1);
    expect(ctx.getPosition()).toBe(1);
    expect(ctx.peekChar()).toBe('e');
  });

  it('extracts substrings', () => {
    const ctx = new ParserContext();
    ctx.append('hello world');
    expect(ctx.substring(0, 5)).toBe('hello');
    expect(ctx.substring(6)).toBe('world');
  });
});

describe('ParserContext segment emission', () => {
  it('emits segment lifecycle events', () => {
    const ctx = new ParserContext();
    const segId = ctx.emitSegmentStart(SegmentType.TEXT);
    expect(segId).toBe('seg_1');
    expect(ctx.getCurrentSegmentId()).toBe('seg_1');
    expect(ctx.getCurrentSegmentType()).toBe(SegmentType.TEXT);

    ctx.emitSegmentContent('Hello ');
    ctx.emitSegmentContent('World');
    expect(ctx.getCurrentSegmentContent()).toBe('Hello World');

    const endedId = ctx.emitSegmentEnd();
    expect(endedId).toBe('seg_1');
    expect(ctx.getCurrentSegmentId()).toBeUndefined();

    const events = ctx.getAndClearEvents();
    expect(events).toHaveLength(4);
    expect(events[0].event_type).toBe(SegmentEventType.START);
    expect(events[0].segment_id).toBe('seg_1');
    expect(events[0].segment_type).toBe(SegmentType.TEXT);
    expect(events[1].event_type).toBe(SegmentEventType.CONTENT);
    expect(events[1].payload.delta).toBe('Hello ');
    expect(events[2].event_type).toBe(SegmentEventType.CONTENT);
    expect(events[2].payload.delta).toBe('World');
    expect(events[3].event_type).toBe(SegmentEventType.END);
    expect(events[3].segment_id).toBe('seg_1');
  });

  it('emits segment metadata', () => {
    const ctx = new ParserContext();
    ctx.emitSegmentStart(SegmentType.TOOL_CALL, { tool_name: 'weather_api' });
    const events = ctx.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].payload).toEqual({ metadata: { tool_name: 'weather_api' } });
  });

  it('generates unique segment ids', () => {
    const ctx = new ParserContext();
    const id1 = ctx.emitSegmentStart(SegmentType.TEXT);
    ctx.emitSegmentEnd();
    const id2 = ctx.emitSegmentStart(SegmentType.WRITE_FILE);
    ctx.emitSegmentEnd();
    const id3 = ctx.emitSegmentStart(SegmentType.TOOL_CALL);
    ctx.emitSegmentEnd();
    expect(id1).toBe('seg_1');
    expect(id2).toBe('seg_2');
    expect(id3).toBe('seg_3');
  });

  it('throws when emitting content without active segment', () => {
    const ctx = new ParserContext();
    expect(() => ctx.emitSegmentContent('test')).toThrow(/Cannot emit content/);
  });

  it('returns undefined when ending without segment', () => {
    const ctx = new ParserContext();
    const result = ctx.emitSegmentEnd();
    expect(result).toBeUndefined();
  });

  it('getAndClearEvents clears queue', () => {
    const ctx = new ParserContext();
    ctx.emitSegmentStart(SegmentType.TEXT);
    ctx.emitSegmentContent('test');
    ctx.emitSegmentEnd();
    const events1 = ctx.getAndClearEvents();
    expect(events1).toHaveLength(3);
    const events2 = ctx.getAndClearEvents();
    expect(events2).toHaveLength(0);
  });
});

describe('ParserContext text helper', () => {
  it('appendTextSegment emits start + content', () => {
    const ctx = new ParserContext();
    ctx.appendTextSegment('Hello World');
    const events = ctx.getAndClearEvents();
    expect(events).toHaveLength(2);
    expect(events[0].event_type).toBe(SegmentEventType.START);
    expect(events[0].segment_type).toBe(SegmentType.TEXT);
    expect(events[1].event_type).toBe(SegmentEventType.CONTENT);
    expect(events[1].payload.delta).toBe('Hello World');
    expect(ctx.getCurrentSegmentType()).toBe(SegmentType.TEXT);
  });

  it('reuses open text segment', () => {
    const ctx = new ParserContext();
    ctx.appendTextSegment('Hello ');
    ctx.getAndClearEvents();
    ctx.appendTextSegment('World');
    const events = ctx.getAndClearEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event_type).toBe(SegmentEventType.CONTENT);
    expect(events[0].payload.delta).toBe('World');
  });

  it('ignores empty text', () => {
    const ctx = new ParserContext();
    ctx.appendTextSegment('');
    const events = ctx.getAndClearEvents();
    expect(events).toHaveLength(0);
  });
});

describe('ParserContext metadata updates', () => {
  it('updates current segment metadata', () => {
    const ctx = new ParserContext();
    ctx.emitSegmentStart(SegmentType.TOOL_CALL, { tool_name: 'test' });
    expect(ctx.getCurrentSegmentMetadata()).toEqual({ tool_name: 'test' });
    ctx.updateCurrentSegmentMetadata({ arg1: 'value1' });
    expect(ctx.getCurrentSegmentMetadata()).toEqual({ tool_name: 'test', arg1: 'value1' });
  });
});
