import { describe, it, expect } from 'vitest';
import { ParserContext } from '../../../../../../src/agent/streaming/parser/parser-context.js';
import { SegmentEventType, SegmentType } from '../../../../../../src/agent/streaming/parser/events.js';
import { CustomXmlTagRunBashParsingState } from '../../../../../../src/agent/streaming/parser/states/custom-xml-tag-run-bash-parsing-state.js';
import { TextState } from '../../../../../../src/agent/streaming/parser/states/text-state.js';

describe('CustomXmlTagRunBashParsingState basics', () => {
  it('parses simple command', () => {
    const ctx = new ParserContext();
    ctx.append('ls -la</run_bash>');

    const state = new CustomXmlTagRunBashParsingState(ctx, '<run_bash>');
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.RUN_BASH);

    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const content = contentEvents.map((e) => e.payload.delta).join('');
    expect(content).toContain('ls -la');

    expect(ctx.currentState).toBeInstanceOf(TextState);
  });

  it('extracts supported tag attributes into metadata', () => {
    const ctx = new ParserContext();
    ctx.append('ls -la</run_bash>');

    const state = new CustomXmlTagRunBashParsingState(
      ctx,
      "<run_bash description='List files' background='true' timeout_seconds='120'>"
    );
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    const metadata = startEvents[0].payload.metadata;
    expect(metadata).toEqual({ background: true, timeout_seconds: 120 });
  });

  it('normalizes timeoutSeconds attribute alias to timeout_seconds metadata', () => {
    const ctx = new ParserContext();
    ctx.append('echo alias</run_bash>');

    const state = new CustomXmlTagRunBashParsingState(
      ctx,
      "<run_bash timeoutSeconds='42'>"
    );
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    const metadata = startEvents[0].payload.metadata;
    expect(metadata).toEqual({ timeout_seconds: 42 });
  });

  it('ignores invalid background and timeout attribute values', () => {
    const ctx = new ParserContext();
    ctx.append('echo invalid</run_bash>');

    const state = new CustomXmlTagRunBashParsingState(
      ctx,
      "<run_bash background='maybe' timeout_seconds='abc'>"
    );
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].payload.metadata).toBeUndefined();
  });

  it('accepts yes/no background aliases', () => {
    const yesCtx = new ParserContext();
    yesCtx.append('echo yes</run_bash>');
    const yesState = new CustomXmlTagRunBashParsingState(yesCtx, "<run_bash background='yes'>");
    yesCtx.currentState = yesState;
    yesState.run();
    const yesEvents = yesCtx.getAndClearEvents();
    const yesStart = yesEvents.find((e) => e.event_type === SegmentEventType.START);
    expect(yesStart?.payload.metadata).toEqual({ background: true });

    const noCtx = new ParserContext();
    noCtx.append('echo no</run_bash>');
    const noState = new CustomXmlTagRunBashParsingState(noCtx, "<run_bash background='no'>");
    noCtx.currentState = noState;
    noState.run();
    const noEvents = noCtx.getAndClearEvents();
    const noStart = noEvents.find((e) => e.event_type === SegmentEventType.START);
    expect(noStart?.payload.metadata).toEqual({ background: false });
  });

  it('preserves comments in content', () => {
    const ctx = new ParserContext();
    ctx.append('# Install deps\nnpm install</run_bash>');

    const state = new CustomXmlTagRunBashParsingState(ctx, '<run_bash>');
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const content = contentEvents.map((e) => e.payload.delta).join('');
    expect(content).toContain('# Install deps');
    expect(content).toContain('npm install');
  });
});

describe('CustomXmlTagRunBashParsingState streaming', () => {
  it('holds back partial closing tags', () => {
    const ctx = new ParserContext();
    ctx.append('echo hello world command</run');

    const state = new CustomXmlTagRunBashParsingState(ctx, '<run_bash>');
    ctx.currentState = state;
    state.run();

    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const content = contentEvents.map((e) => e.payload.delta).join('');
    expect(content).toContain('echo hello');
    expect(content).not.toContain('</run');
  });
});

describe('CustomXmlTagRunBashParsingState finalize', () => {
  it('finalize closes incomplete command', () => {
    const ctx = new ParserContext();
    ctx.append('partial command');

    const state = new CustomXmlTagRunBashParsingState(ctx, '<run_bash>');
    ctx.currentState = state;
    state.run();
    state.finalize();

    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });
});
