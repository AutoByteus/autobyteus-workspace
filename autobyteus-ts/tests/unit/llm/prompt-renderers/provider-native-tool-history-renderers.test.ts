import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';
import { OpenAIChatRenderer } from '../../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { GeminiPromptRenderer } from '../../../../src/llm/prompt-renderers/gemini-prompt-renderer.js';
import { OllamaPromptRenderer } from '../../../../src/llm/prompt-renderers/ollama-prompt-renderer.js';
import { AnthropicPromptRenderer } from '../../../../src/llm/prompt-renderers/anthropic-prompt-renderer.js';
import { MistralPromptRenderer } from '../../../../src/llm/prompt-renderers/mistral-prompt-renderer.js';
import { OpenAIResponsesRenderer } from '../../../../src/llm/prompt-renderers/openai-responses-renderer.js';
import { GeminiTextToolHistoryRenderer } from '../../../../src/llm/prompt-renderers/gemini-text-tool-history-renderer.js';
import { OllamaTextToolHistoryRenderer } from '../../../../src/llm/prompt-renderers/ollama-text-tool-history-renderer.js';
import { AnthropicTextToolHistoryRenderer } from '../../../../src/llm/prompt-renderers/anthropic-text-tool-history-renderer.js';
import { MistralTextToolHistoryRenderer } from '../../../../src/llm/prompt-renderers/mistral-text-tool-history-renderer.js';
import { OpenAIResponsesTextToolHistoryRenderer } from '../../../../src/llm/prompt-renderers/openai-responses-text-tool-history-renderer.js';
import {
  createAnthropicPromptRendererForToolFormat,
  createGeminiPromptRendererForToolFormat,
  createMistralPromptRendererForToolFormat,
  createOllamaPromptRendererForToolFormat,
  createOpenAIResponsesRendererForToolFormat,
} from '../../../../src/llm/prompt-renderers/provider-tool-history-renderer-selection.js';
import type { ToolCallFormat } from '../../../../src/utils/tool-call-format.js';
import { ApiToolCallStreamingResponseHandler } from '../../../../src/agent/streaming/handlers/api-tool-call-streaming-response-handler.js';
import { ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import type { ProviderNativeToolCallContext } from '../../../../src/llm/utils/tool-call-delta.js';

const buildSingleToolMessages = () => [
  new Message(MessageRole.USER, 'inspect'),
  new Message(MessageRole.ASSISTANT, {
    tool_payload: new ToolCallPayload([
      { id: 'call_1', name: 'run_bash', arguments: { command: 'pwd' } }
    ])
  }),
  new Message(MessageRole.TOOL, {
    tool_payload: new ToolResultPayload('call_1', 'run_bash', { stdout: '/tmp\n' })
  })
];

const buildReverseSettlementMessages = () => [
  new Message(MessageRole.USER, 'inspect'),
  new Message(MessageRole.ASSISTANT, {
    tool_payload: new ToolCallPayload([
      { id: 'call_a', name: 'get_weather', arguments: { city: 'Berlin' } },
      { id: 'call_b', name: 'get_time', arguments: { city: 'Berlin' } }
    ])
  }),
  new Message(MessageRole.TOOL, {
    tool_payload: new ToolResultPayload('call_b', 'get_time', { time: '10:00' })
  }),
  new Message(MessageRole.TOOL, {
    tool_payload: new ToolResultPayload('call_a', 'get_weather', { temp: 21 })
  })
];

const serialized = (value: unknown) => JSON.stringify(value);

const expectNoLegacyTags = (rendered: unknown) => {
  expect(serialized(rendered)).not.toContain('[TOOL_CALL]');
  expect(serialized(rendered)).not.toContain('[TOOL_RESULT]');
  expect(serialized(rendered)).not.toContain('[TOOL_ERROR]');
};

const assistantToolMessageFromStream = (
  nativeContext: ProviderNativeToolCallContext,
  argumentsDelta = '{"query":"abc"}'
) => {
  const handler = new ApiToolCallStreamingResponseHandler({ turnId: 'turn_stream' });
  handler.feed(new ChunkResponse({
    content: '',
    tool_calls: [{
      index: 0,
      call_id: 'call_1',
      name: 'search',
      native_context: nativeContext
    }]
  }));
  handler.feed(new ChunkResponse({
    content: '',
    tool_calls: [{ index: 0, arguments_delta: argumentsDelta }]
  }));
  handler.finalize();
  const invocation = handler.getAllInvocations()[0];

  return new Message(MessageRole.ASSISTANT, {
    tool_payload: new ToolCallPayload([{
      id: invocation.id,
      name: invocation.name,
      arguments: invocation.arguments,
      nativeToolCallContext: invocation.nativeToolCallContext
    }])
  });
};

describe('provider native tool history renderers', () => {
  it('keeps OpenAI-compatible Chat native tool history as a regression guard', async () => {
    const rendered = await new OpenAIChatRenderer().render(buildSingleToolMessages()) as any[];

    expect(rendered.some((message) => message.role === 'assistant' && Array.isArray(message.tool_calls))).toBe(true);
    expect(rendered.some((message) => message.role === 'tool' && message.tool_call_id === 'call_1')).toBe(true);
    expectNoLegacyTags(rendered);
  });

  it('renders native shapes for every in-scope provider without legacy text tags', async () => {
    const messages = buildSingleToolMessages();

    const gemini = await new GeminiPromptRenderer().render(messages) as any[];
    expect(gemini[1].parts[0].functionCall).toMatchObject({ id: 'call_1', name: 'run_bash' });
    expect(gemini[2].parts[0].functionResponse).toMatchObject({ id: 'call_1', name: 'run_bash' });
    expectNoLegacyTags(gemini);

    const ollama = await new OllamaPromptRenderer().render(messages) as any[];
    expect(ollama[1].tool_calls[0].function.name).toBe('run_bash');
    expect(ollama[2]).toMatchObject({ role: 'tool', tool_name: 'run_bash' });
    expectNoLegacyTags(ollama);

    const anthropic = await new AnthropicPromptRenderer().render(messages) as any[];
    expect(anthropic[1].content[0]).toMatchObject({ type: 'tool_use', id: 'call_1', name: 'run_bash' });
    expect(anthropic[2].content[0]).toMatchObject({ type: 'tool_result', tool_use_id: 'call_1' });
    expectNoLegacyTags(anthropic);

    const mistral = await new MistralPromptRenderer().render(messages) as any[];
    expect(mistral[1].tool_calls[0]).toMatchObject({ id: 'call_1', type: 'function' });
    expect(mistral[2]).toMatchObject({ role: 'tool', tool_call_id: 'call_1', name: 'run_bash' });
    expectNoLegacyTags(mistral);

    const responses = await new OpenAIResponsesRenderer().render(messages) as any[];
    expect(responses[1]).toMatchObject({ type: 'function_call', call_id: 'call_1', name: 'run_bash' });
    expect(responses[2]).toMatchObject({ type: 'function_call_output', call_id: 'call_1' });
    expectNoLegacyTags(responses);
  });

  it('sorts and coalesces reverse-settled parallel results for Anthropic and Gemini', async () => {
    const messages = buildReverseSettlementMessages();

    const anthropic = await new AnthropicPromptRenderer().render(messages) as any[];
    expect(anthropic).toHaveLength(3);
    expect(anthropic[1].content.map((block: any) => block.id)).toEqual(['call_a', 'call_b']);
    expect(anthropic[2].role).toBe('user');
    expect(anthropic[2].content.map((block: any) => block.tool_use_id)).toEqual(['call_a', 'call_b']);
    expect(anthropic[2].content.every((block: any) => block.type === 'tool_result')).toBe(true);

    const gemini = await new GeminiPromptRenderer().render(messages) as any[];
    expect(gemini).toHaveLength(3);
    expect(gemini[1].parts.map((part: any) => part.functionCall.id)).toEqual(['call_a', 'call_b']);
    expect(gemini[2].parts.map((part: any) => part.functionResponse.id)).toEqual(['call_a', 'call_b']);
  });

  it('sorts reverse-settled parallel results for tool-role/item providers', async () => {
    const messages = buildReverseSettlementMessages();

    const ollama = await new OllamaPromptRenderer().render(messages) as any[];
    expect(ollama.slice(2).map((message) => message.tool_name)).toEqual(['get_weather', 'get_time']);

    const mistral = await new MistralPromptRenderer().render(messages) as any[];
    expect(mistral.slice(2).map((message) => message.tool_call_id)).toEqual(['call_a', 'call_b']);

    const responses = await new OpenAIResponsesRenderer().render(messages) as any[];
    expect(
      responses
        .filter((item) => item.type === 'function_call_output')
        .map((item) => item.call_id)
    ).toEqual(['call_a', 'call_b']);
  });

  it('reconciles stream-start native metadata with final normalized arguments', async () => {
    const anthropicMessage = assistantToolMessageFromStream({
      provider: 'anthropic',
      toolUseBlock: { type: 'tool_use', id: 'call_1', name: 'search', input: {} }
    });
    const anthropic = await new AnthropicPromptRenderer().render([anthropicMessage]) as any[];
    expect(anthropic[0].content[0]).toMatchObject({
      type: 'tool_use',
      id: 'call_1',
      name: 'search',
      input: { query: 'abc' }
    });

    const mistralMessage = assistantToolMessageFromStream({
      provider: 'mistral',
      toolCall: {
        id: 'call_1',
        type: 'function',
        function: { name: 'search', arguments: '{"query":"' }
      }
    });
    const mistral = await new MistralPromptRenderer().render([mistralMessage]) as any[];
    expect(mistral[0].tool_calls[0]).toMatchObject({
      id: 'call_1',
      type: 'function',
      function: { name: 'search', arguments: JSON.stringify({ query: 'abc' }) }
    });

    const responsesMessage = assistantToolMessageFromStream({
      provider: 'openai_responses',
      functionCallItem: {
        type: 'function_call',
        id: 'fc_1',
        call_id: 'call_1',
        name: 'search',
        arguments: ''
      }
    });
    const responses = await new OpenAIResponsesRenderer().render([responsesMessage]) as any[];
    expect(responses[0]).toMatchObject({
      type: 'function_call',
      id: 'fc_1',
      call_id: 'call_1',
      name: 'search',
      arguments: JSON.stringify({ query: 'abc' })
    });
  });
});

describe('provider renderer mode isolation', () => {
  const formats: ToolCallFormat[] = ['xml', 'json', 'sentinel'];

  it.each(formats)('selects explicit text-history renderers in %s mode', (format) => {
    expect(createGeminiPromptRendererForToolFormat(format)).toBeInstanceOf(GeminiTextToolHistoryRenderer);
    expect(createOllamaPromptRendererForToolFormat(format)).toBeInstanceOf(OllamaTextToolHistoryRenderer);
    expect(createAnthropicPromptRendererForToolFormat(format)).toBeInstanceOf(AnthropicTextToolHistoryRenderer);
    expect(createMistralPromptRendererForToolFormat(format)).toBeInstanceOf(MistralTextToolHistoryRenderer);
    expect(createOpenAIResponsesRendererForToolFormat(format)).toBeInstanceOf(OpenAIResponsesTextToolHistoryRenderer);
  });

  it('selects native renderers only in api_tool_call mode', () => {
    expect(createGeminiPromptRendererForToolFormat('api_tool_call')).toBeInstanceOf(GeminiPromptRenderer);
    expect(createOllamaPromptRendererForToolFormat('api_tool_call')).toBeInstanceOf(OllamaPromptRenderer);
    expect(createAnthropicPromptRendererForToolFormat('api_tool_call')).toBeInstanceOf(AnthropicPromptRenderer);
    expect(createMistralPromptRendererForToolFormat('api_tool_call')).toBeInstanceOf(MistralPromptRenderer);
    expect(createOpenAIResponsesRendererForToolFormat('api_tool_call')).toBeInstanceOf(OpenAIResponsesRenderer);
  });

  it.each(formats)('text-history renderers preserve legacy text and avoid native tool result objects in %s mode', async (format) => {
    const messages = buildSingleToolMessages();
    const renderers = [
      createGeminiPromptRendererForToolFormat(format),
      createOllamaPromptRendererForToolFormat(format),
      createAnthropicPromptRendererForToolFormat(format),
      createMistralPromptRendererForToolFormat(format),
      createOpenAIResponsesRendererForToolFormat(format),
    ];

    for (const renderer of renderers) {
      const rendered = await renderer.render(messages);
      const text = serialized(rendered);
      expect(text).toContain('[TOOL_CALL]');
      expect(text).toContain('[TOOL_RESULT]');
      expect(text).not.toContain('functionResponse');
      expect(text).not.toContain('tool_result');
      expect(text).not.toContain('function_call_output');
      const providerMessages = rendered as any[];
      expect(providerMessages.some((message) => message.role === 'tool')).toBe(false);
    }
  });
});
