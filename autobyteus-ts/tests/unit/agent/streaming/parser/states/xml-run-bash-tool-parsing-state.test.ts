import { describe, it, expect } from 'vitest';
import { ParserContext } from '../../../../../../src/agent/streaming/parser/parser-context.js';
import { XmlRunBashToolParsingState } from '../../../../../../src/agent/streaming/parser/states/xml-run-bash-tool-parsing-state.js';
import { SegmentEventType, SegmentType } from '../../../../../../src/agent/streaming/parser/events.js';

describe('XmlRunBashToolParsingState', () => {
  it('parses run_bash tool', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="run_bash">';
    const content = "<arguments><arg name='command'>ls -la</arg></arguments></tool>";
    ctx.append(signature + content);

    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.RUN_BASH);

    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');
    expect(fullContent).toContain('ls -la');
    expect(fullContent).not.toContain('<arg');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('exposes run_bash segment type', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="run_bash">';
    const state = new XmlRunBashToolParsingState(ctx, signature);
    expect((state.constructor as typeof XmlRunBashToolParsingState).SEGMENT_TYPE).toBe(SegmentType.RUN_BASH);
  });

  it('handles fragmented streaming', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="run_bash">';
    const chunks = [
      '<arguments><arg ',
      "name='command'>",
      'ls ',
      '-la /var/log',
      '</arg></arguments></tool>'
    ];

    ctx.append(signature);
    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;

    for (const chunk of chunks) {
      ctx.append(chunk);
      state.run();
    }

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta).join('');
    expect(fullContent).toContain('ls -la /var/log');
    expect(fullContent).not.toContain('<arg');

    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('swallows closing tags and preserves following text', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="run_bash">';
    const fullText =
      "<arguments><arg name='command'>echo test</arg></arguments></tool>" + 'Post command text';

    ctx.append(fullText);
    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    while (ctx.hasMoreChars()) {
      ctx.currentState.run();
    }

    const events = ctx.getAndClearEvents();
    const fullDump = events.filter((e) => e.event_type === SegmentEventType.CONTENT).map((e) => e.payload.delta).join('');

    expect(fullDump).toContain('echo test');
    expect(fullDump).toContain('Post command text');
    expect(fullDump).not.toContain('</arguments>');
    expect(fullDump).not.toContain('</tool>');
  });

  it('captures background and timeout_seconds from arguments metadata', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="run_bash">';
    const content =
      "<arguments><arg name='background'>true</arg><arg name='timeout_seconds'>90</arg><arg name='command'>echo test</arg></arguments></tool>";

    ctx.append(signature + content);
    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0].payload.metadata).toMatchObject({
      background: true,
      timeout_seconds: 90
    });
  });

  it('captures background and timeout metadata from opening attributes', () => {
    const ctx = new ParserContext();
    const signature = "<tool name=\"run_bash\" background=\"true\" timeout_seconds=\"33\">";
    const content = "<arguments><arg name='command'>echo attrs</arg></arguments></tool>";

    ctx.append(signature + content);
    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].payload.metadata).toMatchObject({
      tool_name: 'run_bash',
      background: true,
      timeout_seconds: 33
    });
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0].payload.metadata).toMatchObject({
      tool_name: 'run_bash',
      background: true,
      timeout_seconds: 33
    });
  });

  it('captures timeoutSeconds alias and normalizes it to timeout_seconds', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="run_bash">';
    const content =
      "<arguments><arg name='timeoutSeconds'>75</arg><arg name='command'>echo test</arg></arguments></tool>";

    ctx.append(signature + content);
    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0].payload.metadata).toMatchObject({
      timeout_seconds: 75
    });
  });

  it('ignores invalid metadata values from arguments', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="run_bash">';
    const content =
      "<arguments><arg name='background'>maybe</arg><arg name='timeout_seconds'>abc</arg><arg name='command'>echo invalid</arg></arguments></tool>";

    ctx.append(signature + content);
    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0].payload.metadata).toMatchObject({
      tool_name: 'run_bash'
    });
    expect(endEvents[0].payload.metadata.background).toBeUndefined();
    expect(endEvents[0].payload.metadata.timeout_seconds).toBeUndefined();
  });

  it('keeps attribute metadata when conflicting argument metadata appears later', () => {
    const ctx = new ParserContext();
    const signature = "<tool name='run_bash' background='false' timeout_seconds='10'>";
    const content =
      "<arguments><arg name='background'>true</arg><arg name='timeout_seconds'>99</arg><arg name='command'>echo precedence</arg></arguments></tool>";

    ctx.append(signature + content);
    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0].payload.metadata).toMatchObject({
      tool_name: 'run_bash',
      background: false,
      timeout_seconds: 10
    });
  });

  it('extracts metadata when metadata args arrive in fragmented chunks', () => {
    const ctx = new ParserContext();
    const signature = '<tool name="run_bash">';
    const chunks = [
      "<arguments><arg name='back",
      "ground'>true</arg><arg name='timeout",
      "_seconds'>60</arg><arg name='command'>echo split</arg></arguments></tool>"
    ];

    ctx.append(signature);
    const state = new XmlRunBashToolParsingState(ctx, signature);
    ctx.currentState = state;
    for (const chunk of chunks) {
      ctx.append(chunk);
      state.run();
    }

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
    expect(endEvents[0].payload.metadata).toMatchObject({
      tool_name: 'run_bash',
      background: true,
      timeout_seconds: 60
    });
  });
});
