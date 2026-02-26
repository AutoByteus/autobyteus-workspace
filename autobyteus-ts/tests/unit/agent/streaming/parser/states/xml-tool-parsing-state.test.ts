import { describe, it, expect } from 'vitest';
import { ParserContext } from '../../../../../../src/agent/streaming/parser/parser-context.js';
import { XmlToolParsingState } from '../../../../../../src/agent/streaming/parser/states/xml-tool-parsing-state.js';
import { TextState } from '../../../../../../src/agent/streaming/parser/states/text-state.js';
import { SegmentEventType, SegmentType } from '../../../../../../src/agent/streaming/parser/events.js';

describe('XmlToolParsingState basics', () => {
  it('parses a simple tool call', () => {
    const ctx = new ParserContext();
    const signature = "<tool name='weather'>";
    ctx.append(signature + '<arguments><city>NYC</city></arguments></tool>after');

    const state = new XmlToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.TOOL_CALL);
    expect(startEvents[0].payload.metadata?.tool_name).toBe('weather');

    expect(ctx.currentState).toBeInstanceOf(TextState);
  });

  it('extracts tool name with double quotes', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="get_weather">';
    ctx.append(signature + '<arguments><location>Paris</location></arguments></tool>');

    const state = new XmlToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents[0].payload.metadata?.tool_name).toBe('get_weather');
  });

  it('treats tool without name as text', () => {
    const ctx = new ParserContext();
    const signature = '<tool>';
    ctx.append(signature + 'content</tool>');

    const state = new XmlToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const toolStarts = events.filter((e) => e.event_type === SegmentEventType.START && e.segment_type === SegmentType.TOOL_CALL);
    expect(toolStarts).toHaveLength(0);
  });
});

describe('XmlToolParsingState streaming', () => {
  it('completes tool content in one pass', () => {
    const ctx = new ParserContext();
    const signature = "<tool name='slow_api'>";
    ctx.append(signature + '<arguments><query>testing</query></arguments></tool>done');

    const state = new XmlToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents.length).toBeGreaterThanOrEqual(1);
    expect(ctx.currentState).toBeInstanceOf(TextState);
  });

  it('streams raw XML content', () => {
    const ctx = new ParserContext();
    const signature = "<tool name='create_tasks'>";
    const content =
      '<arguments>' +
      "<arg name='tasks'>" +
      '<item>' +
      "<arg name='description'>Handle n <= 0 case</arg>" +
      '</item>' +
      '</arg>' +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');
    expect(fullContent).toContain('<arguments>');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0].payload.metadata?.arguments).toBeUndefined();
  });
});

describe('XmlToolParsingState finalize', () => {
  it('finalize closes incomplete tool', () => {
    const ctx = new ParserContext();
    const signature = "<tool name='test'>";
    ctx.append(signature + '<arguments><arg>val');

    const state = new XmlToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();
    state.finalize();

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents.length).toBeGreaterThanOrEqual(1);
  });
});
