import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { AutobyteusLLM } from '../../../../src/llm/api/autobyteus-llm.js';
import { BaseLLM } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { buildFinish } from '../../../../src/llm/utils/llm-response-finish.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { LLMRequestAssembler } from '../../../../src/agent/llm-request-assembler.js';
import { LlmPhaseSummaryPort, COMPACTION_CONVERSATION_RELEASE_TIMEOUT_MS } from '../../../../src/agent/loop/llm-phase-summary-port.js';
import { conversationRequestKwargs, conversationRequestOptions } from '../../../../src/agent/loop/conversation-request.js';
import type { LlmRequestCapacity } from '../../../../src/agent/token-budget.js';
import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from '../../../../src/memory/compaction/compaction-summary-prompt.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const mockCreate = vi.hoisted(() => vi.fn());
vi.mock('@anthropic-ai/sdk', () => {
  const Anthropic = vi.fn();
  Anthropic.prototype.messages = { create: mockCreate };
  return { default: Anthropic };
});

const AGENT_ID = 'agent_summary_port';
const tools = [{ name: 'read_file', description: 'Read a file.', input_schema: { type: 'object', properties: { path: { type: 'string' } } } }];
const capacity = (inputBudget = 100_000): LlmRequestCapacity => ({
  effectiveContextCapacity: 200_000, contextDerivedInputCapTokens: 190_000, providerInputCapTokens: null,
  effectiveInputCapacity: 190_000, reservedOutputTokens: 10_000, safetyMarginTokens: 256, inputBudget, overrideActive: false,
});
const identity = (attempt = 1) => ({ operationId: 'op_12', executionTurnId: 'turn_0007', attempt });
const notifier = () => ({ notifyAgentTokenUsageUpdated: vi.fn() });

async function* anthropicStream(text: string) {
  yield { type: 'message_start', message: { usage: { input_tokens: 4, cache_read_input_tokens: 9400, cache_creation_input_tokens: 30 } } };
  yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } };
  yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text } };
  yield { type: 'content_block_stop', index: 0 };
  yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 120 } };
  yield { type: 'message_stop' };
}

class ScriptedLLM extends BaseLLM {
  chunks: ChunkResponse[] = [new ChunkResponse({ content: '<compaction_summary>ok</compaction_summary>', is_complete: true })];
  constructor(name = 'scripted') {
    super(new LLMModel({ name, value: name, canonicalName: name, provider: LLMProvider.OPENAI }), new LLMConfig());
  }
  protected async _sendMessagesToLLM(): Promise<CompleteResponse> { return new CompleteResponse({ content: '' }); }
  protected async *_streamMessagesToLLM(): AsyncGenerator<ChunkResponse, void, unknown> { yield* this.chunks; }
}

describe('LlmPhaseSummaryPort', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'summary-port-'));
    mockCreate.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sends the agent\'s own conversation request unchanged plus the instruction (AC-001)', async () => {
    const llm = new AnthropicLLM(
      new LLMModel({ name: 'claude-opus-5-5', value: 'claude-opus-5-5', canonicalName: 'claude-opus-5-5', provider: LLMProvider.ANTHROPIC }),
      new LLMConfig({ maxTokens: 64_000 }), providerApiKeyResolver('synthetic-anthropic-key'));
    const memory = new MemoryManager({ store: new FileMemoryStore(dir, AGENT_ID) });
    const signal = new AbortController().signal;
    mockCreate.mockImplementation(async () => anthropicStream('Working on it.'));

    // The agent's normal conversation request, exactly as LlmPhase sends it.
    const request = await new LLMRequestAssembler(memory).prepareRequest(new LLMUserMessage({ content: 'Inspect /repo.' }),
      { turnId: 'turn_0007', requestId: 'turn_0007:llm:1', signal }, 'You are a careful agent.', tools);
    for await (const _ of llm.streamMessages(request.outboundMessages, conversationRequestKwargs(AGENT_ID, request.tools),
      conversationRequestOptions({ signal, turnId: 'turn_0007' }))) { /* drain */ }
    const normal = structuredClone(mockCreate.mock.calls.at(-1)![0]);
    memory.ingestAssistantResponse(new CompleteResponse({ content: 'Inspected.' }), 'turn_0007', 'test');

    mockCreate.mockImplementation(async () => anthropicStream('<compaction_summary>summary</compaction_summary>'));
    const port = new LlmPhaseSummaryPort({ agentId: AGENT_ID, llm, tools, requestCapacity: capacity(), notifier: null });
    const result = await port.requestCachedSummary(memory.getWorkingContextMessages(), COMPACTION_SUMMARY_INSTRUCTION, identity(), signal);
    const summary = mockCreate.mock.calls.at(-1)![0];

    expect(summary.system).toEqual(normal.system);
    expect(summary.tools).toEqual(normal.tools);
    expect(summary.thinking).toEqual(normal.thinking);
    expect(summary.max_tokens).toBe(normal.max_tokens);
    expect(summary.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' });
    expect(summary.cache_control).toEqual(normal.cache_control);
    expect(summary.messages.slice(0, normal.messages.length)).toEqual(normal.messages);
    expect(summary.messages.slice(normal.messages.length)).toEqual([
      { role: 'assistant', content: 'Inspected.' },
      { role: 'user', content: COMPACTION_SUMMARY_INSTRUCTION },
    ]);
    expect(mockCreate.mock.calls.at(-1)![1]).toMatchObject({ maxRetries: 0 });
    expect(result).toMatchObject({ content: '<compaction_summary>summary</compaction_summary>', hasToolCalls: false,
      metadata: { mode: 'cached', invocationId: 'compaction_op_12_1', modelIdentifier: 'claude-opus-5-5', provider: 'ANTHROPIC' } });
    expect(result.metadata.usage).toMatchObject({ cache_read_input_tokens: 9400 });
  });

  it('sends the transcript request without tools or cache scope, as one provider call', async () => {
    const llm = new ScriptedLLM();
    const stream = vi.spyOn(llm, 'streamMessages');
    const port = new LlmPhaseSummaryPort({ agentId: AGENT_ID, llm, tools, requestCapacity: capacity(), notifier: null });
    const signal = new AbortController().signal;
    const result = await port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'rendered history', identity(3), signal);
    const [messages, kwargs, options] = stream.mock.calls[0]!;
    expect(messages.map(({ role, content }) => [role, content])).toEqual([[MessageRole.SYSTEM, COMPACTION_SUMMARY_PROMPT], [MessageRole.USER, 'rendered history']]);
    expect(kwargs).toEqual({ logicalConversationId: 'compaction_op_12_3' });
    expect(options).toEqual({ signal, turnId: 'turn_0007', retryMode: 'single_attempt' });
    expect(result.metadata.mode).toBe('transcript');
  });

  it('reports the stream\'s terminal finish as the attempt completion (truncation → incomplete)', async () => {
    const llm = new ScriptedLLM();
    llm.chunks = [
      new ChunkResponse({ content: '<compaction_summary>cut' }),
      new ChunkResponse({ content: '', is_complete: true, finish: buildFinish('output_limit', 'max_tokens') }),
    ];
    const port = new LlmPhaseSummaryPort({ agentId: AGENT_ID, llm, tools, requestCapacity: capacity(), notifier: null });
    const result = await port.requestCachedSummary([new Message(MessageRole.USER, { content: 'hi' })], 'summarize', identity(), new AbortController().signal);
    expect(result.metadata).toMatchObject({ completionStatus: 'incomplete', completionReason: 'max_tokens' });
  });

  it('rejects a transcript request that exceeds the input budget before any provider call', async () => {
    const llm = new ScriptedLLM();
    const stream = vi.spyOn(llm, 'streamMessages');
    const port = new LlmPhaseSummaryPort({ agentId: AGENT_ID, llm, tools, requestCapacity: capacity(10), notifier: null });
    await expect(port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'x'.repeat(1000), identity(), new AbortController().signal))
      .rejects.toMatchObject({ code: 'input_budget_exceeded' });
    expect(stream).not.toHaveBeenCalled();
  });

  it('reports tool calls and emits one compaction usage event per attempt', async () => {
    const llm = new ScriptedLLM();
    llm.chunks = [
      new ChunkResponse({ content: '', tool_calls: [{ index: 0, call_id: 'c1', name: 'read_file', arguments_delta: '{}' } as any] }),
      new ChunkResponse({ content: '', is_complete: true, usage: { input_tokens: 5, cache_read_input_tokens: 900 } as any }),
    ];
    const events = notifier();
    const port = new LlmPhaseSummaryPort({ agentId: AGENT_ID, llm, tools, requestCapacity: capacity(), notifier: events as any });
    const result = await port.requestCachedSummary([new Message(MessageRole.USER, { content: 'hi' })], 'summarize', identity(2), new AbortController().signal);
    expect(result.hasToolCalls).toBe(true);
    expect(events.notifyAgentTokenUsageUpdated).toHaveBeenCalledExactlyOnceWith({
      usage: { input_tokens: 5, cache_read_input_tokens: 900 },
      turn_id: 'turn_0007',
      llm_call_id: 'turn_0007:compaction:op_12:2',
      runtime_kind: 'autobyteus',
      ingestion_kind: 'autobyteus_compaction',
      idempotency_key: `${AGENT_ID}:turn_0007:compaction:op_12:2`,
      latest_prompt_tokens: null,
      effective_context_window_tokens: 200_000,
      context_window_usage_percent: null,
    });
  });

  it('checks the cached request against the input budget including tool schemas', () => {
    const llm = new ScriptedLLM();
    const messages = [new Message(MessageRole.USER, { content: 'x'.repeat(400) })];
    const fits = (inputBudget: number | null, schemas = tools) => new LlmPhaseSummaryPort({
      agentId: AGENT_ID, llm, tools: schemas, requestCapacity: inputBudget === null ? null : capacity(inputBudget), notifier: null,
    }).fitsInputBudget(messages, 'instruction');
    expect(fits(100_000)).toBe(true);
    expect(fits(null)).toBe(false);
    const withoutTools = 130;
    expect(fits(withoutTools, [])).toBe(true);
    expect(fits(withoutTools)).toBe(false);
  });

  describe('isolated compaction conversations on a remote-session provider (AC-009)', () => {
    const autobyteus = () => {
      const llm = new AutobyteusLLM(new LLMModel({ name: 'rpa', value: 'rpa', canonicalName: 'rpa',
        provider: LLMProvider.AUTOBYTEUS, hostUrl: 'https://rpa.example.test' }), new LLMConfig(), providerApiKeyResolver('synthetic-key'));
      const client = {
        streamMessage: vi.fn(async function* (_request: { conversationId: string }, _options: { signal: AbortSignal | null }) {
          yield { content: '<compaction_summary>s</compaction_summary>', is_complete: true, token_usage: { prompt_tokens: 3, completion_tokens: 2, total_tokens: 5 } };
        }),
        cleanup: vi.fn(async (_id: string, _options: { signal?: AbortSignal }) => ({})),
      };
      (llm as any).clientPromise = Promise.resolve(client);
      return { llm, client };
    };

    it('uses a compaction conversation id per attempt, releases exactly it, and never touches the agent session', async () => {
      const { llm, client } = autobyteus();
      const llmCleanup = vi.spyOn(llm, 'cleanup');
      for await (const _ of llm.streamMessages([new Message(MessageRole.USER, { content: 'agent turn' })], { logicalConversationId: AGENT_ID })) { /* agent call */ }
      const port = new LlmPhaseSummaryPort({ agentId: AGENT_ID, llm, tools: [], requestCapacity: capacity(), notifier: null });
      const signal = new AbortController().signal;
      await port.requestCachedSummary([new Message(MessageRole.USER, { content: 'agent turn' })], 'summarize', identity(1), signal);
      await port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'history', identity(2), signal);

      expect(client.streamMessage.mock.calls.map(([request]) => request.conversationId)).toEqual([AGENT_ID, 'compaction_op_12_1', 'compaction_op_12_2']);
      expect(client.cleanup.mock.calls.map(([id]) => id)).toEqual(['compaction_op_12_1', 'compaction_op_12_2']);
      expect(llmCleanup).not.toHaveBeenCalled();
      await llm.cleanup();
      expect(client.cleanup.mock.calls.map(([id]) => id)).toEqual(['compaction_op_12_1', 'compaction_op_12_2', AGENT_ID]);
    });

    it('still releases the compaction conversation with its own live signal when the attempt is aborted', async () => {
      const { llm, client } = autobyteus();
      const controller = new AbortController();
      client.streamMessage.mockImplementation(async function* () {
        controller.abort();
        throw new Error('aborted by interruption');
      });
      const port = new LlmPhaseSummaryPort({ agentId: AGENT_ID, llm, tools: [], requestCapacity: capacity(), notifier: null });
      await expect(port.requestCachedSummary([new Message(MessageRole.USER, { content: 'x' })], 'summarize', identity(), controller.signal))
        .rejects.toMatchObject({ code: 'cancelled' });
      expect(client.cleanup).toHaveBeenCalledOnce();
      const [releasedId, releaseOptions] = client.cleanup.mock.calls[0]!;
      expect(releasedId).toBe('compaction_op_12_1');
      expect(releaseOptions.signal?.aborted).toBe(false);
    });

    it('bounds a hanging release and keeps the attempt result', async () => {
      vi.useFakeTimers();
      const { llm, client } = autobyteus();
      client.cleanup.mockImplementation(() => new Promise(() => {}));
      const port = new LlmPhaseSummaryPort({ agentId: AGENT_ID, llm, tools: [], requestCapacity: capacity(), notifier: null });
      const pending = port.requestCachedSummary([new Message(MessageRole.USER, { content: 'x' })], 'summarize', identity(), new AbortController().signal);
      await vi.advanceTimersByTimeAsync(COMPACTION_CONVERSATION_RELEASE_TIMEOUT_MS);
      await expect(pending).resolves.toMatchObject({ content: '<compaction_summary>s</compaction_summary>' });
      expect(client.cleanup.mock.calls[0]![1].signal?.aborted).toBe(true);
      expect(console.warn).toHaveBeenCalledWith('Compaction conversation release failed.', { conversationId: 'compaction_op_12_1' });
    });
  });

  it('has nothing to release by default', async () => {
    await expect(new ScriptedLLM().releaseConversation('compaction_op_1_1')).resolves.toBeUndefined();
  });
});
