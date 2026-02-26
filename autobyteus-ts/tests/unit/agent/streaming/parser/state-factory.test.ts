import { describe, it, expect } from 'vitest';
import { ParserContext } from '../../../../../src/agent/streaming/parser/parser-context.js';
import { StateFactory } from '../../../../../src/agent/streaming/parser/state-factory.js';
import { BaseState } from '../../../../../src/agent/streaming/parser/states/base-state.js';

describe('StateFactory', () => {
  it('creates TextState', () => {
    const ctx = new ParserContext();
    const state = StateFactory.textState(ctx);
    expect(state).toBeInstanceOf(BaseState);
    expect(state.constructor.name).toBe('TextState');
  });

  it('creates XmlTagInitializationState', () => {
    const ctx = new ParserContext();
    ctx.append('<test');
    const state = StateFactory.xmlTagInitState(ctx);
    expect(state.constructor.name).toBe('XmlTagInitializationState');
  });

  it('creates CustomXmlTagWriteFileParsingState', () => {
    const ctx = new ParserContext();
    ctx.append('content</write_file>');
    const state = StateFactory.writeFileParsingState(ctx, "<write_file path='/test.py'>");
    expect(state.constructor.name).toBe('CustomXmlTagWriteFileParsingState');
  });

  it('creates CustomXmlTagRunBashParsingState', () => {
    const ctx = new ParserContext();
    const state = StateFactory.runBashParsingState(ctx, '<run_bash>');
    expect(state.constructor.name).toBe('CustomXmlTagRunBashParsingState');
  });

  it('creates XmlToolParsingState', () => {
    const ctx = new ParserContext();
    ctx.append('content</tool>');
    const state = StateFactory.xmlToolParsingState(ctx, "<tool name='test'>");
    expect(state.constructor.name).toBe('XmlToolParsingState');
  });

  it('creates JsonInitializationState', () => {
    const ctx = new ParserContext();
    ctx.append('{"name": "test"}');
    const state = StateFactory.jsonInitState(ctx);
    expect(state.constructor.name).toBe('JsonInitializationState');
  });

  it('creates JsonToolParsingState', () => {
    const ctx = new ParserContext();
    ctx.append('{"name": "test", "arguments": {}}');
    const state = StateFactory.jsonToolParsingState(ctx, '{"name"');
    expect(state.constructor.name).toBe('JsonToolParsingState');
  });

  it('all states expose run/finalize', () => {
    const ctx = new ParserContext();
    ctx.append('content</test>');

    const states = [
      StateFactory.textState(ctx),
      StateFactory.writeFileParsingState(ctx, "<write_file path='/test'>"),
      StateFactory.runBashParsingState(ctx, '<run_bash>')
    ];

    for (const state of states) {
      expect(typeof (state as any).run).toBe('function');
      expect(typeof (state as any).finalize).toBe('function');
    }
  });
});
