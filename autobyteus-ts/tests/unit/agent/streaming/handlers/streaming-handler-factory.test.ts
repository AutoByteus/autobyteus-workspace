import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StreamingResponseHandlerFactory, StreamingHandlerResult } from '../../../../../src/agent/streaming/handlers/streaming-handler-factory.js';
import { ParsingStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/parsing-streaming-response-handler.js';
import { PassThroughStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/pass-through-streaming-response-handler.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { LLMProvider } from '../../../../../src/llm/providers.js';
import { ToolSchemaProvider } from '../../../../../src/tools/usage/providers/tool-schema-provider.js';

const ENV_VAR = 'AUTOBYTEUS_STREAM_PARSER';

const factoryOptions = (overrides?: Partial<{
  toolNames: string[];
  provider?: LLMProvider | null;
  segmentIdPrefix?: string | null;
  onSegmentEvent?: any;
  onToolInvocation?: any;
  agentId?: string | null;
}>) => ({
  toolNames: ['test_tool'],
  provider: LLMProvider.OPENAI,
  segmentIdPrefix: 'test:',
  onSegmentEvent: null,
  onToolInvocation: null,
  agentId: 'agent_test',
  ...overrides
});

let envBackup: string | undefined;

beforeEach(() => {
  envBackup = process.env[ENV_VAR];
});

afterEach(() => {
  if (envBackup === undefined) {
    delete process.env[ENV_VAR];
  } else {
    process.env[ENV_VAR] = envBackup;
  }
  vi.restoreAllMocks();
});

describe('StreamingHandlerResult', () => {
  it('contains handler', () => {
    const result = StreamingResponseHandlerFactory.create(factoryOptions());
    expect(result.handler).toBeDefined();
    expect(result).toBeInstanceOf(StreamingHandlerResult);
  });
});

describe('No tools mode', () => {
  it('uses pass-through when no tools', () => {
    const result = StreamingResponseHandlerFactory.create(factoryOptions({ toolNames: [] }));
    expect(result.handler).toBeInstanceOf(PassThroughStreamingResponseHandler);
    expect(result.toolSchemas).toBeNull();
  });

  it('uses pass-through for empty tool list', () => {
    const result = StreamingResponseHandlerFactory.create(factoryOptions({ toolNames: [] }));
    expect(result.handler).toBeInstanceOf(PassThroughStreamingResponseHandler);
  });
});

describe('API tool call mode', () => {
  it('uses API handler when format is api_tool_call', () => {
    process.env[ENV_VAR] = 'api_tool_call';
    const result = StreamingResponseHandlerFactory.create(factoryOptions());
    expect(result.handler).toBeInstanceOf(ApiToolCallStreamingResponseHandler);
  });

  it('builds tool schemas in API mode', () => {
    process.env[ENV_VAR] = 'api_tool_call';
    const mockSchemas = [{ type: 'function', function: { name: 'test_tool' } }];
    const spy = vi.spyOn(ToolSchemaProvider.prototype, 'buildSchema').mockReturnValue(mockSchemas);

    const result = StreamingResponseHandlerFactory.create(factoryOptions());
    expect(result.toolSchemas).toEqual(mockSchemas);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('API mode without tools uses pass-through', () => {
    process.env[ENV_VAR] = 'api_tool_call';
    const result = StreamingResponseHandlerFactory.create(factoryOptions({ toolNames: [] }));
    expect(result.handler).toBeInstanceOf(PassThroughStreamingResponseHandler);
    expect(result.toolSchemas).toBeNull();
  });
});

describe('Text parsing modes', () => {
  it('xml mode uses parsing handler', () => {
    process.env[ENV_VAR] = 'xml';
    const result = StreamingResponseHandlerFactory.create(factoryOptions());
    expect(result.handler).toBeInstanceOf(ParsingStreamingResponseHandler);
    expect((result.handler as ParsingStreamingResponseHandler).parserName).toBe('xml');
    expect(result.toolSchemas).toBeNull();
  });

  it('json mode uses parsing handler', () => {
    process.env[ENV_VAR] = 'json';
    const result = StreamingResponseHandlerFactory.create(factoryOptions());
    expect(result.handler).toBeInstanceOf(ParsingStreamingResponseHandler);
    expect((result.handler as ParsingStreamingResponseHandler).parserName).toBe('json');
    expect(result.toolSchemas).toBeNull();
  });

  it('sentinel mode uses parsing handler', () => {
    process.env[ENV_VAR] = 'sentinel';
    const result = StreamingResponseHandlerFactory.create(factoryOptions());
    expect(result.handler).toBeInstanceOf(ParsingStreamingResponseHandler);
    expect((result.handler as ParsingStreamingResponseHandler).parserName).toBe('sentinel');
    expect(result.toolSchemas).toBeNull();
  });
});

describe('Provider defaults', () => {
  it('Anthropic defaults to xml', () => {
    const parserName = StreamingResponseHandlerFactory.resolveParserName({
      formatOverride: null,
      provider: LLMProvider.ANTHROPIC
    });
    expect(parserName).toBe('xml');
  });

  it('OpenAI defaults to json', () => {
    const parserName = StreamingResponseHandlerFactory.resolveParserName({
      formatOverride: null,
      provider: LLMProvider.OPENAI
    });
    expect(parserName).toBe('json');
  });

  it('Gemini defaults to json', () => {
    const parserName = StreamingResponseHandlerFactory.resolveParserName({
      formatOverride: null,
      provider: LLMProvider.GEMINI
    });
    expect(parserName).toBe('json');
  });
});

describe('Format override', () => {
  it('xml override for OpenAI', () => {
    process.env[ENV_VAR] = 'xml';
    const result = StreamingResponseHandlerFactory.create(factoryOptions({ provider: LLMProvider.OPENAI }));
    expect(result.handler).toBeInstanceOf(ParsingStreamingResponseHandler);
    expect((result.handler as ParsingStreamingResponseHandler).parserName).toBe('xml');
  });

  it('api_tool_call override for Anthropic', () => {
    process.env[ENV_VAR] = 'api_tool_call';
    const result = StreamingResponseHandlerFactory.create(factoryOptions({ provider: LLMProvider.ANTHROPIC }));
    expect(result.handler).toBeInstanceOf(ApiToolCallStreamingResponseHandler);
  });
});
