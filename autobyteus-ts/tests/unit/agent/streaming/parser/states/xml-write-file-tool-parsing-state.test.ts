import { describe, it, expect } from 'vitest';
import { ParserContext } from '../../../../../../src/agent/streaming/parser/parser-context.js';
import { XmlWriteFileToolParsingState } from '../../../../../../src/agent/streaming/parser/states/xml-write-file-tool-parsing-state.js';
import { SegmentEventType, SegmentType } from '../../../../../../src/agent/streaming/parser/events.js';

describe('XmlWriteFileToolParsingState', () => {
  it('parses write_file tool', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/test.py</arg>" +
      "<arg name='content'>print('hello')</arg>" +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.WRITE_FILE);
    expect(startEvents[0].payload.metadata?.path).toBe('/tmp/test.py');

    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');
    expect(fullContent).toContain("print('hello')");
    expect(fullContent).not.toContain('<arg');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('uses WRITE_FILE segment type', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const state = new XmlWriteFileToolParsingState(ctx, signature);
    expect((state.constructor as typeof XmlWriteFileToolParsingState).SEGMENT_TYPE).toBe(SegmentType.WRITE_FILE);
  });

  it('handles fragmented streaming', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';

    const chunks = [
      '<argu',
      'ments><arg name',
      "='path'>/tmp/frag.py</arg>",
      "<arg name='con",
      "tent'>",
      "print('frag",
      "mented')</arg",
      '></arguments></tool>'
    ];

    ctx.append(signature);
    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    for (const chunk of chunks) {
      ctx.append(chunk);
      state.run();
    }

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain("print('fragmented')");
    expect(fullContent).not.toContain('<arg');
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('defers start event until path is available', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    ctx.append('<tool name="write_file"><arguments>');
    state.run();

    expect(ctx.getEvents()).toHaveLength(0);

    ctx.append("<arg name='path'>/tmp/delayed.py</arg>");
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].payload.metadata?.path).toBe('/tmp/delayed.py');

    ctx.append("<arg name='content'>data</arg></arguments></tool>");
    state.run();

    const contentEvents = ctx.getAndClearEvents().filter((e) => e.event_type === SegmentEventType.CONTENT);
    expect(contentEvents.length).toBeGreaterThan(0);
    expect(contentEvents.map((e) => e.payload.delta).join('')).toContain('data');
  });

  it('swallows closing tags and preserves following text', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    let fullText =
      "<arguments>" +
      "<arg name='path'>/tmp/test.py</arg>" +
      "<arg name='content'>data</arg>" +
      '</arguments></tool>';
    fullText += 'Post tool text';

    ctx.append(fullText);
    state.run();

    while (ctx.hasMoreChars()) {
      ctx.currentState.run();
    }

    const events = ctx.getAndClearEvents();
    const fullDump = events.filter((e) => e.event_type === SegmentEventType.CONTENT).map((e) => e.payload.delta).join('');

    expect(fullDump).toContain('data');
    expect(fullDump).toContain('Post tool text');
    expect(fullDump).not.toContain('</arguments>');
    expect(fullDump).not.toContain('</tool>');
  });

  it('streams raw content between markers', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/marker.py</arg>" +
      "<arg name='content'>" +
      '__START_CONTENT__\n' +
      "print('<div>')\n" +
      '<arg name="x">y</arg>\n' +
      '__END_CONTENT__' +
      '</arg>' +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).not.toContain('__START_CONTENT__');
    expect(fullContent).not.toContain('__END_CONTENT__');
    expect(fullContent).toContain('<arg name="x">y</arg>');
    expect(fullContent).toBe("print('<div>')\n<arg name=\"x\">y</arg>\n");

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('handles markers split across chunks', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const chunks = [
      "<arguments><arg name='path'>/tmp/chunk.py</arg><arg name='content'>__STAR",
      "T_CONTENT__print('hi')\n<arg>ok</arg>\n__END",
      '_CONTENT__</arg></arguments></tool>'
    ];

    ctx.append(signature);
    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    for (const chunk of chunks) {
      ctx.append(chunk);
      state.run();
    }

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).not.toContain('__START_CONTENT__');
    expect(fullContent).not.toContain('__END_CONTENT__');
    expect(fullContent).toBe("print('hi')\n<arg>ok</arg>\n");

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('keeps nested end marker not followed by arg close', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/nested.py</arg>" +
      "<arg name='content'>" +
      '__START_CONTENT__\n' +
      '# This file documents __END_CONTENT__ usage\n' +
      '# The marker __END_CONTENT__ appears in comments\n' +
      "print('hello')\n" +
      '__END_CONTENT__' +
      '</arg>' +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain('# This file documents __END_CONTENT__ usage');
    expect(fullContent).toContain('# The marker __END_CONTENT__ appears in comments');
    expect(fullContent).toContain("print('hello')");
    expect(fullContent).not.toContain('__START_CONTENT__');
    expect(fullContent.trim().endsWith("print('hello')")).toBe(true);

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('accepts whitespace before arg close after end marker', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/ws.py</arg>" +
      "<arg name='content'>" +
      '__START_CONTENT__\n' +
      '# Contains __END_CONTENT__ in text\n' +
      "code = 'done'\n" +
      '__END_CONTENT__\n' +
      '  </arg>' +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain('# Contains __END_CONTENT__ in text');
    expect(fullContent).toContain("code = 'done'");
    expect(fullContent).not.toContain('__START_CONTENT__');
    expect(fullContent.split('__END_CONTENT__').length - 1).toBe(1);

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('handles nested end marker with fragmented streaming', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const chunks = [
      "<arguments><arg name='path'>/tmp/frag.py</arg><arg name='content'>",
      '__START_CONTENT__\n',
      '# Docs: __END_CONT',
      'ENT__ is the sentinel\n',
      'x = 1\n',
      '__END_CONT',
      'ENT__',
      '\n</arg>',
      '</arguments></tool>'
    ];

    ctx.append(signature);
    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    for (const chunk of chunks) {
      ctx.append(chunk);
      state.run();
    }

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain('# Docs: __END_CONTENT__ is the sentinel');
    expect(fullContent).toContain('x = 1');
    expect(fullContent).not.toContain('__START_CONTENT__');
    expect(fullContent.split('__END_CONTENT__').length - 1).toBe(1);

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('handles multiple false end markers before real one', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="write_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/multi.py</arg>" +
      "<arg name='content'>" +
      '__START_CONTENT__\n' +
      '__END_CONTENT__ is not the end\n' +
      'More text with __END_CONTENT__ in middle\n' +
      '__END_CONTENT__x = 1\n' +
      'final line\n' +
      '__END_CONTENT__</arg>' +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlWriteFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain('__END_CONTENT__ is not the end');
    expect(fullContent).toContain('More text with __END_CONTENT__ in middle');
    expect(fullContent).toContain('__END_CONTENT__x = 1');
    expect(fullContent).toContain('final line');
    expect(fullContent.split('__END_CONTENT__').length - 1).toBe(3);

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });
});
