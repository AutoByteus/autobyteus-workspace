import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  StreamingHandlerResult,
  StreamingResponseHandlerFactory
} from '../../../../../src/agent/streaming/handlers/streaming-handler-factory.js';
import { PassThroughStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/pass-through-streaming-response-handler.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { LLMProvider } from '../../../../../src/llm/providers.js';
import { ToolSchemaProvider } from '../../../../../src/tools/usage/providers/tool-schema-provider.js';

const TURN_ID = 'turn_test';

const factoryOptions = (overrides: Partial<{
  toolNames: string[];
  provider: LLMProvider | null;
  turnId: string;
  segmentIdPrefix: string;
}> = {}) => ({
  toolNames: ['test_tool'],
  provider: LLMProvider.OPENAI,
  turnId: TURN_ID,
  segmentIdPrefix: 'test:',
  ...overrides
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('StreamingResponseHandlerFactory native-only setup', () => {
  it('returns a native handler and provider schemas when tools are configured', () => {
    const mockSchemas = [{ type: 'function', function: { name: 'test_tool' } }];
    const schemaSpy = vi
      .spyOn(ToolSchemaProvider.prototype, 'buildSchema')
      .mockReturnValue(mockSchemas);

    const result = StreamingResponseHandlerFactory.create(factoryOptions());

    expect(result).toBeInstanceOf(StreamingHandlerResult);
    expect(result.handler).toBeInstanceOf(ApiToolCallStreamingResponseHandler);
    expect(result.toolSchemas).toEqual(mockSchemas);
    expect(schemaSpy).toHaveBeenCalledOnce();
    expect(schemaSpy).toHaveBeenCalledWith(['test_tool'], LLMProvider.OPENAI);
  });

  it.each([
    LLMProvider.OPENAI,
    LLMProvider.ANTHROPIC,
    LLMProvider.GEMINI,
    LLMProvider.MISTRAL,
    LLMProvider.OLLAMA,
    LLMProvider.LMSTUDIO
  ])('uses the same native handler path for %s', (provider) => {
    vi.spyOn(ToolSchemaProvider.prototype, 'buildSchema').mockReturnValue([
      { type: 'function', function: { name: 'test_tool' } }
    ]);

    const result = StreamingResponseHandlerFactory.create(factoryOptions({ provider }));

    expect(result.handler).toBeInstanceOf(ApiToolCallStreamingResponseHandler);
    expect(result.toolSchemas).not.toBeNull();
  });

  it('uses pass-through and sends no schemas when no tools are configured', () => {
    const schemaSpy = vi.spyOn(ToolSchemaProvider.prototype, 'buildSchema');

    const result = StreamingResponseHandlerFactory.create(factoryOptions({ toolNames: [] }));

    expect(result.handler).toBeInstanceOf(PassThroughStreamingResponseHandler);
    expect(result.toolSchemas).toBeNull();
    expect(schemaSpy).not.toHaveBeenCalled();
  });
});
