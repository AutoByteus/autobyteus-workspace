import { describe, it, expect } from 'vitest';
import { ParserContext, ParserConfig } from '../../../../../src/agent/streaming/parser/parser-context.js';
import { TextState } from '../../../../../src/agent/streaming/parser/states/text-state.js';
import {
  JsonInitializationState,
  JsonToolSignatureChecker
} from '../../../../../src/agent/streaming/parser/states/json-initialization-state.js';
import { JsonToolParsingState } from '../../../../../src/agent/streaming/parser/states/json-tool-parsing-state.js';
import { SegmentEventType, SegmentType } from '../../../../../src/agent/streaming/parser/events.js';

describe('JsonToolSignatureChecker', () => {
  it('matches name pattern', () => {
    const checker = new JsonToolSignatureChecker();
    expect(checker.checkSignature('{"name"')).toBe('match');
  });

  it('matches tool pattern', () => {
    const checker = new JsonToolSignatureChecker();
    expect(checker.checkSignature('{"tool"')).toBe('match');
  });

  it('matches array pattern', () => {
    const checker = new JsonToolSignatureChecker();
    expect(checker.checkSignature('[{"name"')).toBe('match');
  });

  it('matches tool_calls pattern', () => {
    const checker = new JsonToolSignatureChecker();
    expect(checker.checkSignature('{"tool_calls"')).toBe('match');
  });

  it('matches tools pattern', () => {
    const checker = new JsonToolSignatureChecker();
    expect(checker.checkSignature('{"tools"')).toBe('match');
  });

  it('returns partial for partial signature', () => {
    const checker = new JsonToolSignatureChecker();
    expect(checker.checkSignature('{')).toBe('partial');
    expect(checker.checkSignature('{"')).toBe('partial');
    expect(checker.checkSignature('{"n')).toBe('partial');
  });

  it('returns no_match for non-tool JSON', () => {
    const checker = new JsonToolSignatureChecker();
    expect(checker.checkSignature('{"data"')).toBe('no_match');
    expect(checker.checkSignature('{"items"')).toBe('no_match');
  });

  it('supports custom patterns', () => {
    const custom = ['{"action"', '{"command"'];
    const checker = new JsonToolSignatureChecker(custom);
    expect(checker.checkSignature('{"action"')).toBe('match');
    expect(checker.checkSignature('{"command"')).toBe('match');
    expect(checker.checkSignature('{"name"')).toBe('no_match');
  });
});

describe('JsonInitializationState', () => {
  it('transitions on tool signature', () => {
    const config = new ParserConfig({ parseToolCalls: true, strategyOrder: ['json_tool'] });
    const ctx = new ParserContext(config);
    ctx.append('{"name": "test", "arguments": {}}more');
    const state = new JsonInitializationState(ctx);
    ctx.currentState = state;
    state.run();
    expect(ctx.currentState).toBeInstanceOf(JsonToolParsingState);
  });

  it('non-tool JSON becomes text', () => {
    const config = new ParserConfig({ parseToolCalls: true, strategyOrder: ['json_tool'] });
    const ctx = new ParserContext(config);
    ctx.append('{"data": [1,2,3]}more');
    const state = new JsonInitializationState(ctx);
    ctx.currentState = state;
    state.run();
    expect(ctx.currentState).toBeInstanceOf(TextState);
    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    expect(contentEvents.length).toBeGreaterThan(0);
  });

  it('tool parsing disabled emits text', () => {
    const config = new ParserConfig({ parseToolCalls: false, strategyOrder: ['json_tool'] });
    const ctx = new ParserContext(config);
    ctx.append('{"name": "test"}more');
    const state = new JsonInitializationState(ctx);
    ctx.currentState = state;
    state.run();
    expect(ctx.currentState).toBeInstanceOf(TextState);
  });

  it('finalize emits buffered content as text', () => {
    const config = new ParserConfig({ parseToolCalls: true, strategyOrder: ['json_tool'] });
    const ctx = new ParserContext(config);
    ctx.append('{"na');
    const state = new JsonInitializationState(ctx);
    ctx.currentState = state;
    state.run();
    state.finalize();
    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    expect(contentEvents.some((e) => String(e.payload.delta).includes('{"na'))).toBe(true);
  });
});

describe('JsonToolParsingState', () => {
  it('parses simple tool call', () => {
    const ctx = new ParserContext();
    const signature = '{"name"';
    ctx.append('{"name": "weather", "arguments": {"city": "NYC"}}after');
    const state = new JsonToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();
    const events = ctx.getAndClearEvents();
    const startEvents = events.filter((e) => e.event_type === SegmentEventType.START);
    expect(startEvents).toHaveLength(1);
    expect(startEvents[0].segment_type).toBe(SegmentType.TOOL_CALL);
  });

  it('handles nested JSON', () => {
    const ctx = new ParserContext();
    const signature = '{"name"';
    ctx.append('{"name": "api", "arguments": {"data": {"nested": true}}}after');
    const state = new JsonToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();
    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('handles array format', () => {
    const ctx = new ParserContext();
    const signature = '[{"name"';
    ctx.append('[{"name": "tool1", "arguments": {}}]after');
    const state = new JsonToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();
    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
  });

  it('handles braces inside strings', () => {
    const ctx = new ParserContext();
    const signature = '{"name"';
    ctx.append('{"name": "test", "arguments": {"code": "if (a) { b }"}}after');
    const state = new JsonToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();
    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
    expect(ctx.currentState).toBeInstanceOf(TextState);
  });

  it('finalize handles incomplete JSON', () => {
    const ctx = new ParserContext();
    const signature = '{"name"';
    ctx.append('{"name": "test", "arguments": {');
    const state = new JsonToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();
    state.finalize();
    const events = ctx.getAndClearEvents();
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents.length).toBeGreaterThan(0);
  });

  it('streams raw JSON content without arguments metadata', () => {
    const ctx = new ParserContext();
    const signature = '{"name"';
    ctx.append('{"name": "search", "args": {"query": "autobyteus"}}after');
    const state = new JsonToolParsingState(ctx, signature);
    ctx.currentState = state;
    state.run();
    const events = ctx.getAndClearEvents();
    const contentEvents = events.filter((e) => e.event_type === SegmentEventType.CONTENT);
    const fullContent = contentEvents.map((e) => e.payload.delta ?? '').join('');
    expect(fullContent).toContain('"args"');
    const endEvents = events.filter((e) => e.event_type === SegmentEventType.END);
    expect(endEvents).toHaveLength(1);
    const metadata = endEvents[0].payload.metadata ?? {};
    expect(metadata.arguments).toBeUndefined();
  });
});
