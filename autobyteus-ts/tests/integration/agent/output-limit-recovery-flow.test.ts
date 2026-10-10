import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentContext } from '../../../src/agent/context/agent-context.js';
import { AgentRuntimeState } from '../../../src/agent/context/agent-runtime-state.js';
import {
  LLMCompleteResponseReceivedEvent,
  TurnContinuationReadyEvent,
  UserMessageReceivedEvent,
} from '../../../src/agent/events/agent-events.js';
import { AgentRuntime } from '../../../src/agent/runtime/agent-runtime.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { MemoryIngestInputProcessor } from '../../../src/agent/input-processor/memory-ingest-input-processor.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { EventType } from '../../../src/events/event-types.js';
import { AnthropicLLM } from '../../../src/llm/api/anthropic-llm.js';
import { OpenAICompatibleLLM } from '../../../src/llm/api/openai-compatible-llm.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { AnthropicPromptRenderer } from '../../../src/llm/prompt-renderers/anthropic-prompt-renderer.js';
import type { BasePromptRenderer } from '../../../src/llm/prompt-renderers/base-prompt-renderer.js';
import { OpenAIResponsesRenderer } from '../../../src/llm/prompt-renderers/openai-responses-renderer.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { buildFinish, type LlmFinishReason } from '../../../src/llm/utils/llm-response-finish.js';
import { buildLlmTokenUsageObservation } from '../../../src/llm/utils/llm-token-usage-observation.js';
import { Message, MessageRole, leadingSystemMessages } from '../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { OUTPUT_LIMIT_RECOVERY_TRACE_TYPE } from '../../../src/memory/output-limit-recovery-trace.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../src/utils/parameter-schema.js';
import { FunctionalTool } from '../../../src/tools/functional-tool.js';
import { ToolCategory } from '../../../src/tools/tool-category.js';
import { ToolOrigin } from '../../../src/tools/tool-origin.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { providerApiKeyResolver } from '../../unit/provider-api-key-resolver-test-helpers.js';

const LIMIT = 128;
const usage = (outputTokens = LIMIT) =>
  buildLlmTokenUsageObservation({ inputTokens: 10, outputTokens, totalTokens: 10 + outputTokens, rawUsage: null });

// ---- scripted provider-neutral responses -------------------------------------------------
const text = (content: string) => new ChunkResponse({ content });
const reasoning = (value: string) => new ChunkResponse({ content: '', reasoning: value });
const toolDelta = (callId: string, args: string, name = 'get_weather') =>
  new ChunkResponse({ content: '', tool_calls: [{ index: 0, call_id: callId, name, arguments_delta: args }] });
const end = (reason: LlmFinishReason, providerReason: string) =>
  new ChunkResponse({ content: '', is_complete: true, usage: usage(), finish: buildFinish(reason, providerReason) });

class ScriptedLLM extends BaseLLM {
  readonly captures: Message[][] = [];
  readonly renders: unknown[] = [];
  private readonly renderer: BasePromptRenderer;

  constructor(private readonly steps: ChunkResponse[][], provider = LLMProvider.ANTHROPIC, renderer: BasePromptRenderer = new AnthropicPromptRenderer()) {
    super(
      new LLMModel({ name: 'scripted', value: 'scripted', canonicalName: 'scripted', provider, maxOutputTokens: 128_000 }),
      new LLMConfig({ systemMessage: 'Output-limit recovery integration test.', maxTokens: LIMIT }),
    );
    this.renderer = renderer;
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(messages: Message[]): AsyncGenerator<ChunkResponse, void, unknown> {
    this.captures.push([...messages]);
    // Like the real adapters, the leading system run is sent separately, not as conversation.
    this.renders.push(await this.renderer.render(messages.slice(leadingSystemMessages(messages).length)));
    const step = this.steps[Math.min(this.captures.length - 1, this.steps.length - 1)]!;
    for (const chunk of step) yield chunk;
  }
}

// ---- agent harness ------------------------------------------------------------------------
const executions: unknown[] = [];

const registerWeatherTool = () => {
  const schema = new ParameterSchema([
    new ParameterDefinition({ name: 'city', type: ParameterType.STRING, description: 'City', required: true }),
  ]);
  defaultToolRegistry.registerTool(new ToolDefinition(
    'get_weather', 'Weather lookup', ToolOrigin.LOCAL, ToolCategory.GENERAL, () => schema, () => null,
    {
      customFactory: () => new FunctionalTool(
        (city: unknown) => { executions.push(city); return { city, weather: 'sunny' }; },
        'get_weather', 'Weather lookup', schema, null, false, false, false, ['city'], ['city'],
      ),
    },
  ));
  return { get_weather: defaultToolRegistry.createTool('get_weather') };
};

const waitFor = async (predicate: () => boolean, timeoutMs = 10_000): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return false;
};

type Harness = Awaited<ReturnType<typeof startAgent>>;

const startAgent = async (llm: BaseLLM, tempDir: string) => {
  const memoryManager = new MemoryManager({ store: new FileMemoryStore(tempDir, 'agent_output_limit') });
  const state = new AgentRuntimeState('agent_output_limit', tempDir);
  state.memoryManager = memoryManager;
  state.llmInstance = llm;
  state.toolInstances = registerWeatherTool();
  const config = new AgentConfig(
    'OutputLimitRecovery', 'tester', 'Output-limit recovery integration test', llm, null,
    Object.values(state.toolInstances), true, [new MemoryIngestInputProcessor()], null, [],
  );
  const context = new AgentContext(state.agentId, config, state);
  const runtime = new AgentRuntime(context);
  const errors: any[] = [];
  const usages: any[] = [];
  const completedTurns: any[] = [];
  const notifier = (runtime as any).externalEventNotifier;
  notifier.subscribe(EventType.AGENT_ERROR_OUTPUT_GENERATION, (payload: any) => errors.push(payload));
  notifier.subscribe(EventType.AGENT_TOKEN_USAGE_UPDATED, (payload: any) => usages.push(payload));
  notifier.subscribe(EventType.AGENT_TURN_COMPLETED, (payload: any) => completedTurns.push(payload));
  runtime.start();
  expect(await waitFor(() => context.currentStatus === AgentStatus.IDLE)).toBe(true);

  const send = async (content: string, expectedCompletedTurns: number) => {
    await runtime.submitEvent(new UserMessageReceivedEvent(new AgentInputUserMessage(content)));
    expect(await waitFor(() => completedTurns.length >= expectedCompletedTurns && state.activeTurn === null)).toBe(true);
  };
  const statusEvents = () => state.eventStore?.allEvents().map((envelope) => envelope.event) ?? [];
  const rawTraces = () => memoryManager.store.list(MemoryType.RAW_TRACE) as any[];
  const finalResponses = () => statusEvents().filter((event) => event instanceof LLMCompleteResponseReceivedEvent) as LLMCompleteResponseReceivedEvent[];
  return { runtime, context, state, memoryManager, errors, usages, send, statusEvents, rawTraces, finalResponses };
};

const userAndAssistant = (messages: Message[]) => messages
  .filter((message) => message.role !== MessageRole.SYSTEM)
  .map((message) => [message.role, message.content, message.reasoning_content ?? null] as const);

describe('output-limit recovery through the agent loop', () => {
  let registrySnapshot: ReturnType<typeof defaultToolRegistry.snapshot>;
  let tempDir: string;
  let harness: Harness | null;

  beforeEach(() => {
    registrySnapshot = defaultToolRegistry.snapshot();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'output-limit-flow-'));
    executions.length = 0;
    harness = null;
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    if (harness?.runtime.isRunning) await harness.runtime.stop(2);
    defaultToolRegistry.restore(registrySnapshot);
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('AC-003: discards a cut Anthropic tool call (probe shape), adds the note, and runs the regenerated call', async () => {
    const llm = new AnthropicLLM(
      new LLMModel({ name: 'claude-opus-5-5', value: 'claude-opus-5-5', canonicalName: 'claude-opus-5-5', provider: LLMProvider.ANTHROPIC, maxOutputTokens: 128_000 }),
      new LLMConfig({ maxTokens: 400 }),
      providerApiKeyResolver('synthetic-anthropic-key'),
    );
    const usageStart = { type: 'message_start', message: { usage: { input_tokens: 10, output_tokens: 0 } } };
    const toolStart = (id: string) => ({ type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id, name: 'get_weather', input: {} } });
    const streams = [
      [usageStart, toolStart('toolu_cut'),
        { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"city":"Ber' } },
        { type: 'message_delta', delta: { stop_reason: 'max_tokens' }, usage: { output_tokens: 400 } },
        { type: 'message_stop' }],
      [usageStart, toolStart('toolu_ok'),
        { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"city":"Berlin"}' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 9 } },
        { type: 'message_stop' }],
      [usageStart,
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'It is sunny.' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 4 } },
        { type: 'message_stop' }],
    ];
    const requests: any[] = [];
    (llm as any).clientPromise = Promise.resolve({ messages: { create: vi.fn(async (params: any) => {
      requests.push(structuredClone(params));
      return (async function* () { for (const event of streams[requests.length - 1]!) yield event; })();
    }) } });

    harness = await startAgent(llm, tempDir);
    await harness.send('What is the weather in Berlin?', 1);

    expect(requests).toHaveLength(3);
    expect(requests[0].max_tokens).toBe(400);
    const second = JSON.stringify(requests[1].messages);
    expect(second).toContain('hit the output limit of 400 tokens while generating a `get_weather` tool call');
    expect(second).not.toContain('toolu_cut');
    expect(executions).toEqual(['Berlin']);
    const toolCallTraces = harness.rawTraces().filter((trace) => trace.traceType === 'tool_call');
    expect(toolCallTraces.map((trace) => trace.toolCallId)).toEqual(['toolu_ok']);
    expect(harness.rawTraces().filter((trace) => trace.traceType === OUTPUT_LIMIT_RECOVERY_TRACE_TYPE)).toHaveLength(1);
    expect(JSON.stringify(requests[2].messages)).toContain('toolu_ok');
    expect(JSON.stringify(requests[2].messages)).not.toContain('toolu_cut');
    expect(harness.finalResponses().at(-1)).toMatchObject({ isError: false });
  }, 20_000);

  it('AC-011: recovers the same way from an OpenAI-compatible finish_reason=length mid tool call', async () => {
    const llm = new OpenAICompatibleLLM(
      new LLMModel({ name: 'compat', value: 'compat', canonicalName: 'compat', provider: LLMProvider.DEEPSEEK, maxOutputTokens: 1000 }),
      'http://localhost:1', new LLMConfig({ maxTokens: LIMIT }), providerApiKeyResolver(), LLMProvider.DEEPSEEK,
    );
    const call = (id: string, args: string) => ({ choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id, type: 'function', function: { name: 'get_weather', arguments: args } }] }, finish_reason: null }] });
    const streams = [
      [call('call_cut', '{"city":"Ber'), { choices: [{ index: 0, delta: {}, finish_reason: 'length' }] }],
      [call('call_ok', '{"city":"Berlin"}'), { choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }] }],
      [{ choices: [{ index: 0, delta: { content: 'Sunny.' }, finish_reason: 'stop' }] }],
    ];
    const requests: any[] = [];
    (llm as any).clientPromise = Promise.resolve({ chat: { completions: { create: vi.fn(async (params: any) => {
      requests.push(structuredClone(params));
      return (async function* () { for (const chunk of streams[requests.length - 1]!) yield chunk; })();
    }) } } });

    harness = await startAgent(llm, tempDir);
    await harness.send('Weather?', 1);

    expect(requests).toHaveLength(3);
    const noteMessage = requests[1].messages.at(-1);
    expect(noteMessage.role).toBe('user');
    expect(JSON.stringify(noteMessage)).toContain(`the output limit of ${LIMIT} tokens while generating a \`get_weather\` tool call`);
    expect(JSON.stringify(requests[1].messages)).not.toContain('call_cut');
    expect(executions).toEqual(['Berlin']);
  }, 20_000);

  it('AC-005: keeps the partial text (without its reasoning), resumes with a hidden note, and keeps both parts', async () => {
    const llm = new ScriptedLLM([
      [reasoning('planning the long answer'), text('Part one'), end('output_limit', 'max_tokens')],
      [text(' and part two.'), end('stop', 'end_turn')],
    ]);
    harness = await startAgent(llm, tempDir);
    await harness.send('Write a long answer.', 1);

    expect(llm.captures).toHaveLength(2);
    expect(userAndAssistant(llm.captures[1]!)).toEqual([
      [MessageRole.USER, 'Write a long answer.', null],
      [MessageRole.ASSISTANT, 'Part one', null],
      [MessageRole.USER, expect.stringContaining('Resume directly from where your previous message stopped'), null],
    ]);
    const assistantTraces = harness.rawTraces().filter((trace) => trace.traceType === 'assistant');
    expect(assistantTraces.map((trace) => trace.content)).toEqual(['Part one', ' and part two.']);
    expect(harness.rawTraces().some((trace) => String(trace.content ?? '').includes('planning the long answer'))).toBe(false);
    expect(harness.memoryManager.getWorkingContextMessages().filter((message) => message.role === MessageRole.ASSISTANT)
      .map((message) => message.content)).toEqual(['Part one', ' and part two.']);
    expect(harness.finalResponses().at(-1)?.completeResponse.content).toBe(' and part two.');
    expect(harness.statusEvents().filter((event) => event instanceof TurnContinuationReadyEvent)).toHaveLength(1);
    expect(harness.errors).toEqual([]);
  }, 20_000);

  it('AC-006 / AR-006: stops after 3 recoveries with a clear error; history stays valid for the next message', async () => {
    const cut = [toolDelta('call_cut', '{"city":"Ber'), end('output_limit', 'max_tokens')];
    const llm = new ScriptedLLM([cut, cut, cut, cut, [text('Done in parts.'), end('stop', 'end_turn')]]);
    harness = await startAgent(llm, tempDir);
    await harness.send('Write a huge file.', 1);

    expect(llm.captures).toHaveLength(4);
    expect(executions).toEqual([]);
    expect(harness.rawTraces().filter((trace) => trace.traceType === OUTPUT_LIMIT_RECOVERY_TRACE_TYPE)).toHaveLength(3);
    expect(harness.rawTraces().filter((trace) => trace.traceType === 'tool_call')).toEqual([]);
    const exhausted = harness.errors.find((error) => error.code === 'LLM_OUTPUT_LIMIT_EXHAUSTED');
    expect(exhausted?.message).toContain(`the output limit of ${LIMIT} tokens 4 times in a row`);
    expect(exhausted?.message).toContain('smaller pieces');
    expect(harness.finalResponses().at(-1)).toMatchObject({ isError: true });
    expect(harness.finalResponses().at(-1)?.completeResponse.content).toBe(exhausted?.message);
    // The error is not ingested; no cut call or provider-native turn is stored.
    const workingContext = harness.memoryManager.getWorkingContextMessages();
    expect(workingContext.some((message) => message.content?.includes('times in a row'))).toBe(false);
    expect(workingContext.some((message) => message.role === MessageRole.ASSISTANT || message.role === MessageRole.TOOL)).toBe(false);
    // Unique call ids and idempotency keys across the recovery calls.
    expect(harness.usages.map((payload) => payload.llm_call_id)).toEqual(
      ['turn_0001:llm:1', 'turn_0001:llm:2', 'turn_0001:llm:3', 'turn_0001:llm:4'],
    );
    expect(new Set(harness.usages.map((payload) => payload.idempotency_key)).size).toBe(4);

    await harness.send('Try again, in parts.', 2);
    expect(llm.captures).toHaveLength(5);
    const rendered = llm.renders[4] as Array<{ role: string; content: unknown }>;
    expect(rendered.map((message) => message.role)).toEqual(['user']);
    expect(JSON.stringify(rendered)).toContain('Try again, in parts.');
    expect(harness.finalResponses().at(-1)).toMatchObject({ isError: false });
  }, 20_000);

  it.each([
    ['anthropic', LLMProvider.ANTHROPIC, () => new AnthropicPromptRenderer()],
    ['openai_responses', LLMProvider.OPENAI, () => new OpenAIResponsesRenderer()],
  ] as const)('AR-001 (%s): a cut tool call with reasoning but no text stores no assistant message and the next request is valid', async (_name, provider, renderer) => {
    const llm = new ScriptedLLM([
      [reasoning('thinking about the call'), toolDelta('call_cut', '{"city":"Ber'), end('output_limit', 'max_tokens')],
      [text('Sunny.'), end('stop', 'end_turn')],
    ], provider, renderer());
    harness = await startAgent(llm, tempDir);
    await harness.send('Weather?', 1);

    expect(llm.captures).toHaveLength(2);
    expect(llm.captures[1]!.some((message) => message.role === MessageRole.ASSISTANT)).toBe(false);
    expect(JSON.stringify(llm.renders[1])).not.toContain('thinking about the call');
    expect(JSON.stringify(llm.renders[1])).toContain('`get_weather` tool call; the call was discarded and not executed');
    expect(harness.rawTraces().some((trace) => trace.traceType === 'reasoning')).toBe(false);
  }, 20_000);

  it('uses the "nothing kept" note when the cut response produced only reasoning', async () => {
    const llm = new ScriptedLLM([
      [reasoning('long hidden thinking'), end('output_limit', 'max_tokens')],
      [text('Answer.'), end('stop', 'end_turn')],
    ]);
    harness = await startAgent(llm, tempDir);
    await harness.send('Question?', 1);

    expect(JSON.stringify(llm.captures[1]!.at(-1)?.content)).toContain('before producing any visible output, so nothing was kept');
  }, 20_000);

  it.each([
    ['content_filter', 'refusal', 'LLM_RESPONSE_REFUSED'],
    ['context_window_exceeded', 'model_context_window_exceeded', 'LLM_CONTEXT_WINDOW_EXCEEDED'],
  ] as const)('AC-004: %s ends the turn with a clear error, no tool run, no recovery, and rollback', async (reason, providerReason, code) => {
    const llm = new ScriptedLLM([[toolDelta('call_x', '{"city":"Berlin"}'), end(reason, providerReason)]]);
    harness = await startAgent(llm, tempDir);
    await harness.send('Do it.', 1);

    expect(llm.captures).toHaveLength(1);
    expect(executions).toEqual([]);
    const error = harness.errors.find((entry) => entry.code === code);
    expect(error?.message).toContain(`provider reason: ${providerReason}`);
    expect(harness.finalResponses().at(-1)).toMatchObject({ isError: true });
    expect(harness.rawTraces().filter((trace) => trace.traceType === OUTPUT_LIMIT_RECOVERY_TRACE_TYPE)).toEqual([]);
    expect(harness.memoryManager.getWorkingContextMessages().some((message) => message.content === 'Do it.')).toBe(false);
  }, 20_000);

  it('AC-012: a completed call with invalid JSON is not run; the model gets a retry error and the turn continues', async () => {
    const llm = new ScriptedLLM([
      [toolDelta('call_bad', '{"city": Berlin}'), end('tool_calls', 'tool_use')],
      [text('Retrying differently.'), end('stop', 'end_turn')],
    ]);
    harness = await startAgent(llm, tempDir);
    await harness.send('Weather?', 1);

    expect(executions).toEqual([]);
    expect(llm.captures).toHaveLength(2);
    const toolMessage = llm.captures[1]!.find((message) => message.role === MessageRole.TOOL);
    expect(JSON.stringify(toolMessage?.tool_payload)).toContain('Your tool call was malformed and could not be parsed');
    expect(JSON.stringify(toolMessage?.tool_payload)).toContain('Please retry.');
    expect(harness.finalResponses().at(-1)).toMatchObject({ isError: false });
  }, 20_000);
});
