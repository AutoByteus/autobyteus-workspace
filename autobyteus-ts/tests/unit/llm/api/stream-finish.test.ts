import { describe, expect, it, vi } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { GlmLLM } from '../../../../src/llm/api/glm-llm.js';
import { MistralLLM } from '../../../../src/llm/api/mistral-llm.js';
import { OllamaLLM } from '../../../../src/llm/api/ollama-llm.js';
import { OpenAICompatibleLLM } from '../../../../src/llm/api/openai-compatible-llm.js';
import { OpenAILLM } from '../../../../src/llm/api/openai-llm.js';
import type { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import type { ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { geminiRuntimeResolver, providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const key = providerApiKeyResolver('synthetic-key');
const messages = [new Message(MessageRole.USER, { content: 'hello' })];
const model = (provider: LLMProvider, value = 'synthetic') => new LLMModel({
  name: value, value, canonicalName: value, provider, maxOutputTokens: 400, hostUrl: 'http://localhost:1',
});

async function* fromEvents<T>(events: T[]): AsyncGenerator<T> {
  for (const event of events) yield event;
}

const collect = async (llm: BaseLLM): Promise<ChunkResponse[]> => {
  const chunks: ChunkResponse[] = [];
  for await (const chunk of llm.streamMessages(messages, { logicalConversationId: 'c' })) chunks.push(chunk);
  return chunks;
};

/** The single-terminal-chunk contract: exactly one `is_complete` chunk, and it is last. */
const terminalOf = (chunks: ChunkResponse[]): ChunkResponse => {
  expect(chunks.filter((chunk) => chunk.is_complete)).toHaveLength(1);
  expect(chunks.at(-1)!.is_complete).toBe(true);
  return chunks.at(-1)!;
};

const anthropic = (events: unknown[]) => {
  const llm = new AnthropicLLM(model(LLMProvider.ANTHROPIC, 'claude-opus-5-5'), new LLMConfig(), key);
  (llm as any).clientPromise = Promise.resolve({ messages: { create: vi.fn(async () => fromEvents(events)) } });
  return llm;
};

const toolUseStart = { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'toolu_1', name: 'write_file', input: {} } };
const messageStart = { type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 0 } } };
const stopWith = (stopReason: string) => [
  { type: 'message_delta', delta: { stop_reason: stopReason }, usage: { output_tokens: 400 } },
  { type: 'message_stop' },
];

describe('Anthropic stream end (D-03, DS-006)', () => {
  it('classifies the probe shape (open tool_use, max_tokens, message_stop) as output_limit without a native turn', async () => {
    const chunks = await collect(anthropic([
      messageStart,
      toolUseStart,
      { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"path":"spec.md","con' } },
      ...stopWith('max_tokens'),
    ]));
    const terminal = terminalOf(chunks);
    expect(terminal.finish).toEqual({ reason: 'output_limit', providerReason: 'max_tokens' });
    expect(terminal.usage?.output_tokens).toBe(400);
    expect(chunks.some((chunk) => chunk.providerNativeAssistantTurn)).toBe(false);
  });

  it('classifies a text block cut by max_tokens as output_limit', async () => {
    const chunks = await collect(anthropic([
      messageStart,
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'A long answer' } },
      ...stopWith('max_tokens'),
    ]));
    expect(chunks.map((chunk) => chunk.content).join('')).toBe('A long answer');
    expect(terminalOf(chunks).finish?.reason).toBe('output_limit');
  });

  it('assembles a large write_file from many input deltas, then yields the native turn before the single terminal chunk', async () => {
    const content = 'x'.repeat(5000);
    const json = JSON.stringify({ path: 'spec.md', content });
    const parts = json.match(/.{1,64}/g)!;
    const chunks = await collect(anthropic([
      messageStart,
      toolUseStart,
      ...parts.map((partial_json) => ({ type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json } })),
      { type: 'content_block_stop', index: 0 },
      ...stopWith('tool_use'),
    ]));
    const terminal = terminalOf(chunks);
    expect(terminal.finish).toEqual({ reason: 'tool_calls', providerReason: 'tool_use' });
    const nativeIndex = chunks.findIndex((chunk) => chunk.providerNativeAssistantTurn);
    expect(nativeIndex).toBe(chunks.length - 2);
    expect(chunks[nativeIndex]!.providerNativeAssistantTurn!.blocks).toEqual([
      { type: 'tool_use', id: 'toolu_1', name: 'write_file', input: { path: 'spec.md', content } },
    ]);
    const streamedArgs = chunks.flatMap((chunk) => chunk.tool_calls ?? []).map((delta) => delta.arguments_delta ?? '').join('');
    expect(JSON.parse(streamedArgs)).toEqual({ path: 'spec.md', content });
  });

  it.each([
    ['refusal', 'content_filter'],
    ['model_context_window_exceeded', 'context_window_exceeded'],
    ['pause_turn', 'other'],
  ])('maps %s with an open block to %s and builds no native turn', async (stopReason, reason) => {
    const chunks = await collect(anthropic([messageStart, toolUseStart, ...stopWith(stopReason)]));
    expect(terminalOf(chunks).finish).toEqual({ reason, providerReason: stopReason });
    expect(chunks.some((chunk) => chunk.providerNativeAssistantTurn)).toBe(false);
  });

  it.each(['end_turn', 'tool_use'])('still fails a block left open under %s (protocol violation, REQ-006)', async (stopReason) => {
    await expect(collect(anthropic([messageStart, toolUseStart, ...stopWith(stopReason)])))
      .rejects.toThrow('Anthropic content block is incomplete.');
  });

  it('fails a stream that ends without message_stop and yields no terminal chunk', async () => {
    const chunks: ChunkResponse[] = [];
    const llm = anthropic([
      messageStart,
      { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
      { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'partial' } },
    ]);
    await expect((async () => {
      for await (const chunk of llm.streamMessages(messages)) chunks.push(chunk);
    })()).rejects.toThrow('Anthropic stream ended before message_stop.');
    expect(chunks.some((chunk) => chunk.is_complete)).toBe(false);
  });

  it('records the finish for after-hooks at the BaseLLM boundary', async () => {
    const llm = anthropic([messageStart, ...stopWith('end_turn')]);
    const afterInvoke = vi.fn();
    llm.registerExtension({ beforeInvoke: vi.fn(), afterInvoke, cleanup: vi.fn() } as any);
    await collect(llm);
    expect(afterInvoke.mock.calls[0]![1].finish).toEqual({ reason: 'stop', providerReason: 'end_turn' });
  });
});

describe('OpenAI Responses stream end', () => {
  const responses = (events: unknown[]) => {
    const llm = new OpenAILLM(model(LLMProvider.OPENAI, 'gpt-5.5'), new LLMConfig(), key);
    (llm as any).clientPromise = Promise.resolve({ responses: { create: vi.fn(async () => fromEvents(events)) } });
    return llm;
  };
  const usage = { input_tokens: 5, output_tokens: 400 };

  it('maps response.incomplete with max_output_tokens to output_limit after cut function-call arguments', async () => {
    const chunks = await collect(responses([
      { type: 'response.output_item.added', output_index: 0, item: { type: 'function_call', call_id: 'call_1', name: 'write_file' } },
      { type: 'response.function_call_arguments.delta', output_index: 0, delta: '{"path":"a' },
      { type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, usage, output: [] } },
    ]));
    expect(terminalOf(chunks).finish).toEqual({ reason: 'output_limit', providerReason: 'max_output_tokens' });
  });

  it('maps response.incomplete with content_filter to content_filter', async () => {
    const chunks = await collect(responses([
      { type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'content_filter' }, usage, output: [] } },
    ]));
    expect(terminalOf(chunks).finish?.reason).toBe('content_filter');
  });

  it('fails the request on response.failed', async () => {
    await expect(collect(responses([
      { type: 'response.failed', response: { status: 'failed', error: { code: 'server_error', message: 'The model crashed.' } } },
    ]))).rejects.toThrow('The model crashed.');
  });

  it.each([
    [[{ type: 'message', content: [{ type: 'output_text', text: 'hi' }] }], 'stop'],
    [[{ type: 'function_call', call_id: 'c', name: 'n', arguments: '{}' }], 'tool_calls'],
    [[{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }], 'content_filter'],
  ])('maps response.completed by its output (%#) to %s', async (output, reason) => {
    const chunks = await collect(responses([
      { type: 'response.completed', response: { status: 'completed', usage, output } },
    ]));
    expect(terminalOf(chunks).finish).toEqual({ reason, providerReason: 'completed' });
  });
});

describe('OpenAI-compatible stream end', () => {
  const compatible = (chunks: unknown[], build = () => new OpenAICompatibleLLM(model(LLMProvider.OPENAI), 'http://localhost:1', new LLMConfig(), key, LLMProvider.OPENAI)) => {
    const llm = build();
    (llm as any).clientPromise = Promise.resolve({ chat: { completions: { create: vi.fn(async () => fromEvents(chunks)) } } });
    return llm;
  };
  const toolDelta = (args: string, extra: Record<string, unknown> = {}) => ({
    choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name: 'write_file', arguments: args }, ...extra }] }, finish_reason: null }],
  });

  it('reports length mid tool call as output_limit in one terminal chunk after the usage-only chunk', async () => {
    const chunks = await collect(compatible([
      toolDelta('{"path":"a.md","content":"# Ti'),
      { choices: [{ index: 0, delta: {}, finish_reason: 'length' }] },
      { choices: [], usage: { prompt_tokens: 3, completion_tokens: 400, total_tokens: 403 } },
    ]));
    const terminal = terminalOf(chunks);
    expect(terminal.finish).toEqual({ reason: 'output_limit', providerReason: 'length' });
    expect(terminal.usage?.output_tokens).toBe(400);
  });

  it.each([
    ['stop', 'stop'],
    ['tool_calls', 'tool_calls'],
    ['content_filter', 'content_filter'],
    ['insufficient_system_resource', 'other'],
  ])('maps finish_reason %s to %s', async (finishReason, reason) => {
    const chunks = await collect(compatible([
      { choices: [{ index: 0, delta: { content: 'x' }, finish_reason: finishReason }] },
    ]));
    expect(terminalOf(chunks).finish?.reason).toBe(reason);
  });

  it('reports an unreported finish as null and still yields one terminal chunk', async () => {
    const chunks = await collect(compatible([{ choices: [{ index: 0, delta: { content: 'x' }, finish_reason: null }] }]));
    const terminal = terminalOf(chunks);
    expect(terminal.finish).toBeNull();
    expect(terminal.usage).toBeNull();
  });

  it.each([
    ['sensitive', 'content_filter'],
    ['model_context_window_exceeded', 'context_window_exceeded'],
  ])('GLM maps its documented %s to %s', async (finishReason, reason) => {
    const chunks = await collect(compatible(
      [{ choices: [{ index: 0, delta: { content: 'x' }, finish_reason: finishReason }] }],
      () => new GlmLLM(model(LLMProvider.GLM, 'glm-5.3'), new LLMConfig(), key),
    ));
    expect(terminalOf(chunks).finish).toEqual({ reason, providerReason: finishReason });
  });
});

describe('Gemini stream end', () => {
  const gemini = (chunks: unknown[]) => {
    const llm = new GeminiLLM(model(LLMProvider.GEMINI, 'gemini-3.1-pro-preview'), new LLMConfig(), key, geminiRuntimeResolver());
    (llm as any).clientPromise = Promise.resolve({
      client: { models: { generateContentStream: vi.fn(async () => fromEvents(chunks)) } },
      runtimeInfo: { runtime: 'api_key' },
    });
    return llm;
  };
  const usageMetadata = (candidates: number) => ({ promptTokenCount: 5, candidatesTokenCount: candidates, totalTokenCount: 5 + candidates });

  it('yields one terminal chunk with the last usage although several chunks carried usage (MAX_TOKENS → output_limit)', async () => {
    const chunks = await collect(gemini([
      { candidates: [{ content: { parts: [{ text: 'part ' }] } }], usageMetadata: usageMetadata(2) },
      { candidates: [{ content: { parts: [{ text: 'cut' }] }, finishReason: 'MAX_TOKENS' }], usageMetadata: usageMetadata(400) },
    ]));
    const terminal = terminalOf(chunks);
    expect(terminal.finish).toEqual({ reason: 'output_limit', providerReason: 'MAX_TOKENS' });
    expect(terminal.usage?.output_tokens).toBe(400);
  });

  it.each([
    ['SAFETY', 'content_filter'],
    ['RECITATION', 'content_filter'],
    ['MALFORMED_FUNCTION_CALL', 'other'],
    ['STOP', 'stop'],
  ])('maps %s to %s', async (finishReason, reason) => {
    const chunks = await collect(gemini([{ candidates: [{ content: { parts: [{ text: 'x' }] }, finishReason }] }]));
    expect(terminalOf(chunks).finish?.reason).toBe(reason);
  });

  it('reports STOP after emitted function calls as tool_calls', async () => {
    const chunks = await collect(gemini([
      { candidates: [{ content: { parts: [{ functionCall: { name: 'get_weather', args: { city: 'Berlin' } } }] }, finishReason: 'STOP' }] },
    ]));
    expect(terminalOf(chunks).finish?.reason).toBe('tool_calls');
  });

  it('reports a blocked prompt as content_filter', async () => {
    const chunks = await collect(gemini([{ promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } }]));
    expect(terminalOf(chunks).finish).toEqual({ reason: 'content_filter', providerReason: 'PROHIBITED_CONTENT' });
  });
});

describe('Mistral stream end', () => {
  const mistral = (chunks: unknown[]) => {
    const llm = new MistralLLM(model(LLMProvider.MISTRAL), new LLMConfig(), key);
    (llm as any).clientPromise = Promise.resolve({ chat: { stream: vi.fn(async () => fromEvents(chunks.map((data) => ({ data })))) } });
    return llm;
  };

  it.each([
    ['length', 'output_limit'],
    ['model_length', 'context_window_exceeded'],
    ['stop', 'stop'],
  ])('maps %s to %s', async (finishReason, reason) => {
    const chunks = await collect(mistral([
      { choices: [{ delta: { content: 'x' }, finishReason }], usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 } },
    ]));
    expect(terminalOf(chunks).finish).toEqual({ reason, providerReason: finishReason });
  });

  it('fails the request on finishReason error', async () => {
    await expect(collect(mistral([{ choices: [{ delta: { content: 'x' }, finishReason: 'error' }] }])))
      .rejects.toThrow('finish reason "error"');
  });
});

describe('Ollama stream end', () => {
  it.each([
    ['length', 'output_limit'],
    ['stop', 'stop'],
  ])('maps done_reason %s to %s', async (doneReason, reason) => {
    const llm = new OllamaLLM(model(LLMProvider.OLLAMA), new LLMConfig(), key);
    (llm as any).client = {
      chat: vi.fn(async () => fromEvents([
        { message: { content: 'x' }, done: false },
        { message: { content: '' }, done: true, done_reason: doneReason, prompt_eval_count: 1, eval_count: 400 },
      ])),
      abort: vi.fn(),
    };
    const chunks = await collect(llm);
    expect(terminalOf(chunks).finish).toEqual({ reason, providerReason: doneReason });
  });
});
