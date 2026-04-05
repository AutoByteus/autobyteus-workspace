import { describe, it, expect } from 'vitest';
import { ENV_PARSER_NAME, createStreamingParser, resolveParserName } from '../../../../../src/agent/streaming/parser/parser-factory.js';
import { ParserConfig } from '../../../../../src/agent/streaming/parser/parser-context.js';
import { StreamingParser } from '../../../../../src/agent/streaming/parser/streaming-parser.js';

const TURN_ID = 'turn_test';

describe('parser-factory', () => {
  it('defaults to xml when env is unset', () => {
    const prev = process.env[ENV_PARSER_NAME];
    delete process.env[ENV_PARSER_NAME];
    expect(resolveParserName()).toBe('xml');
    if (prev !== undefined) {
      process.env[ENV_PARSER_NAME] = prev;
    }
  });

  it('uses env override when set', () => {
    const prev = process.env[ENV_PARSER_NAME];
    process.env[ENV_PARSER_NAME] = 'api_tool_call';
    expect(resolveParserName()).toBe('api_tool_call');
    if (prev !== undefined) {
      process.env[ENV_PARSER_NAME] = prev;
    } else {
      delete process.env[ENV_PARSER_NAME];
    }
  });

  it('creates xml parser', () => {
    const parser = createStreamingParser({ parserName: 'xml', turnId: TURN_ID });
    expect(parser).toBeInstanceOf(StreamingParser);
  });

  it('api_tool_call parser disables tool parsing', () => {
    const config = new ParserConfig({ turnId: TURN_ID, parseToolCalls: true, strategyOrder: ['xml_tag'] });
    const parser = createStreamingParser({ config, parserName: 'api_tool_call' });
    expect(parser.config.parseToolCalls).toBe(false);
  });

  it('native parser removed raises', () => {
    expect(() => createStreamingParser({ parserName: 'native', turnId: TURN_ID })).toThrowError(/Unknown parser strategy/i);
  });

  it('creates sentinel parser', () => {
    const parser = createStreamingParser({ parserName: 'sentinel', turnId: TURN_ID });
    expect(parser).toBeInstanceOf(StreamingParser);
  });

  it('unknown parser raises', () => {
    expect(() => createStreamingParser({ parserName: 'unknown', turnId: TURN_ID })).toThrowError(/Unknown parser strategy/i);
  });
});
