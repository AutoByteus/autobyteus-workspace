import { describe, it, expect } from 'vitest';
import { ParserContext } from '../../../../../../src/agent/streaming/parser/parser-context.js';
import { XmlEditFileToolParsingState } from '../../../../../../src/agent/streaming/parser/states/xml-edit-file-tool-parsing-state.js';
import { SegmentEventType, SegmentType } from '../../../../../../src/agent/streaming/parser/events.js';

describe('XmlEditFileToolParsingState', () => {
  it('parses edit_file tool', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/test.py</arg>" +
      "<arg name='patch'>@@ -1,3 +1,4 @@\n+new line</arg>" +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.EDIT_FILE);
    expect(startEvents[0].payload.metadata?.path).toBe('/tmp/test.py');

    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');
    expect(fullContent).toContain('@@ -1,3 +1,4 @@');
    expect(fullContent).toContain('+new line');
    expect(fullContent).not.toContain('<arg');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('uses EDIT_FILE segment type', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const state = new XmlEditFileToolParsingState(ctx, signature);
    expect((state.constructor as typeof XmlEditFileToolParsingState).SEGMENT_TYPE).toBe(SegmentType.EDIT_FILE);
  });

  it('handles fragmented streaming', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const chunks = [
      '<argu',
      'ments><arg name',
      "='path'>/tmp/frag.py</arg>",
      "<arg name='pat",
      "ch'>",
      '@@ -1 +1 @@\n-old',
      '\n+new</arg',
      '></arguments></tool>'
    ];

    ctx.append(signature);
    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    for (const chunk of chunks) {
      ctx.append(chunk);
      state.run();
    }

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain('@@ -1 +1 @@');
    expect(fullContent).toContain('-old');
    expect(fullContent).toContain('+new');
    expect(fullContent).not.toContain('<arg');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('defers start event until path is available', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    ctx.append('<tool name="edit_file"><arguments>');
    state.run();

    expect(ctx.getEvents()).toHaveLength(0);

    ctx.append("<arg name='path'>/tmp/delayed.py</arg>");
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].payload.metadata?.path).toBe('/tmp/delayed.py');

    ctx.append("<arg name='patch'>@@ diff @@</arg></arguments></tool>");
    state.run();

    const contentEvents = ctx.getAndClearEvents().filter((e) => e.event_type === SegmentEventType.CONTENT);
    expect(contentEvents.length).toBeGreaterThan(0);
    expect(contentEvents.map((e) => e.payload.delta).join('')).toContain('@@ diff @@');
  });

  it('swallows closing tags and preserves following text', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    let fullText =
      "<arguments>" +
      "<arg name='path'>/tmp/test.py</arg>" +
      "<arg name='patch'>patch data</arg>" +
      '</arguments></tool>';
    fullText += 'Post tool text';

    ctx.append(fullText);
    state.run();

    while (ctx.hasMoreChars()) {
      ctx.currentState.run();
    }

    const events = ctx.getAndClearEvents();
    const fullDump = events.filter((e) => e.event_type === SegmentEventType.CONTENT).map((e) => e.payload.delta).join('');

    expect(fullDump).toContain('patch data');
    expect(fullDump).toContain('Post tool text');
    expect(fullDump).not.toContain('</arguments>');
    expect(fullDump).not.toContain('</tool>');
  });

  it('streams raw patch content between markers', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/marker.py</arg>" +
      "<arg name='patch'>" +
      '__START_PATCH__\n' +
      '--- a/file.py\n' +
      '+++ b/file.py\n' +
      '@@ -1,2 +1,3 @@\n' +
      ' existing\n' +
      '+new line\n' +
      '__END_PATCH__' +
      '</arg>' +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).not.toContain('__START_PATCH__');
    expect(fullContent).not.toContain('__END_PATCH__');
    expect(fullContent).toContain('--- a/file.py');
    expect(fullContent).toContain('+++ b/file.py');
    expect(fullContent).toContain('+new line');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('handles patch markers split across chunks', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const chunks = [
      "<arguments><arg name='path'>/tmp/chunk.py</arg><arg name='patch'>__STAR",
      'T_PATCH__--- file.py\n+new\n__END',
      '_PATCH__</arg></arguments></tool>'
    ];

    ctx.append(signature);
    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    for (const chunk of chunks) {
      ctx.append(chunk);
      state.run();
    }

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).not.toContain('__START_PATCH__');
    expect(fullContent).not.toContain('__END_PATCH__');
    expect(fullContent).toContain('--- file.py');
    expect(fullContent).toContain('+new');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('preserves special characters in unified diff', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/special.py</arg>" +
      "<arg name='patch'>" +
      '__START_PATCH__\n' +
      '--- a/code.py\n' +
      '+++ b/code.py\n' +
      '@@ -1,2 +1,2 @@\n' +
      '-if x < 10 and y > 5:\n' +
      '+if x <= 10 and y >= 5:\n' +
      '__END_PATCH__' +
      '</arg>' +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain('x < 10');
    expect(fullContent).toContain('y > 5');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('keeps nested end marker not followed by arg close', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const content =
      "<arguments>" +
      "<arg name='path'>/tmp/nested.py</arg>" +
      "<arg name='patch'>" +
      '__START_PATCH__\n' +
      '--- a/file.py\n' +
      '+++ b/file.py\n' +
      '@@ -10,3 +10,3 @@\n' +
      '-# Old comment\n' +
      '+# Note: Do not remove __END_PATCH__ marker\n' +
      ' code()\n' +
      '__END_PATCH__' +
      '</arg>' +
      '</arguments></tool>';

    ctx.append(signature + content);

    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain('+# Note: Do not remove __END_PATCH__ marker');
    expect(fullContent).toContain('code()');
    expect(fullContent).not.toContain('__START_PATCH__');
    expect(fullContent.trim().endsWith('code()')).toBe(true);

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('handles nested end patch marker with fragmented streaming', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="edit_file">';
    const chunks = [
      "<arguments><arg name='path'>/tmp/frag.py</arg><arg name='patch'>",
      '__START_PATCH__\n',
      '-old line\n',
      '+new line with __END_PA',
      'TCH__ inside\n',
      '__END_PA',
      'TCH__',
      '\n</arg>',
      '</arguments></tool>'
    ];

    ctx.append(signature);
    const state = new XmlEditFileToolParsingState(ctx, signature);
    ctx.currentState = state;

    for (const chunk of chunks) {
      ctx.append(chunk);
      state.run();
    }

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');

    expect(fullContent).toContain('+new line with __END_PATCH__ inside');
    expect(fullContent).toContain('-old line');
    expect(fullContent).not.toContain('__START_PATCH__');
    expect(fullContent.split('__END_PATCH__').length - 1).toBe(1);

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });
});
