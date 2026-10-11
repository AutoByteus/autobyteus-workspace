import { describe, expect, it, vi } from 'vitest';
import { AnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMRuntime } from '../../../../src/llm/runtimes.js';
import { supportedModelDefinitions } from '../../../../src/llm/supported-model-definitions.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import {
  LlmPhaseSummaryPort,
  SUMMARY_OUTPUT_TOKEN_FLOOR,
  resolveSummaryOutputTokenOverride,
} from '../../../../src/agent/loop/llm-phase-summary-port.js';
import { conversationRequestKwargs, conversationRequestOptions } from '../../../../src/agent/loop/conversation-request.js';
import { resolveLlmRequestCapacity } from '../../../../src/agent/token-budget.js';
import { estimateMessagesTokens } from '../../../../src/memory/compaction/message-budget-strategy.js';
import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from '../../../../src/memory/compaction/compaction-summary-prompt.js';
import { providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

type Definition = (typeof supportedModelDefinitions)[number];
/** A catalog model exactly as the factory builds it from static metadata (no live refresh). */
const modelOf = (definition: Definition): LLMModel => {
  const { staticMetadata, ...runtimeDefinition } = definition;
  return new LLMModel({
    ...runtimeDefinition,
    maxContextTokens: staticMetadata.maxContextTokens,
    maxInputTokens: staticMetadata.maxInputTokens,
    maxOutputTokens: staticMetadata.maxOutputTokens,
  });
};
const catalogModel = (value: string, provider = value.startsWith('deepseek') ? LLMProvider.DEEPSEEK : LLMProvider.ANTHROPIC): LLMModel => {
  const definition = supportedModelDefinitions.find((entry) => entry.value === value && entry.provider === provider);
  if (!definition) throw new Error(`No catalog model ${provider}/${value}`);
  return modelOf(definition);
};

/** A local Ollama model without output metadata; `num_ctx` becomes its active context. */
const ollamaModel = (numCtx: number): LLMModel => new LLMModel({
  name: 'qwen3:8b', value: 'qwen3:8b', canonicalName: 'qwen3:8b', provider: LLMProvider.OLLAMA,
  runtime: LLMRuntime.OLLAMA, hostUrl: 'http://localhost:11434',
  maxContextTokens: 40_960, activeContextTokens: numCtx, maxOutputTokens: null,
});

const contextOf = (model: LLMModel, config: LLMConfig) => resolveLlmRequestCapacity(model, config)?.effectiveContextCapacity ?? null;

describe('summary output-limit override (REQ-009, design Intended Change 11 worked examples, AC-011)', () => {
  const deepseek = catalogModel('deepseek-v4-pro');
  const deepseekExpected = Math.min(SUMMARY_OUTPUT_TOKEN_FLOOR, deepseek.maxOutputTokens!, Math.floor(deepseek.maxContextTokens! / 4));
  const budgetThinking = (budget: number) => ({ thinking_enabled: true, thinking_budget_tokens: budget });

  it.each([
    ['Opus 5.5, maxTokens 1,024', catalogModel('claude-opus-5-5'), new LLMConfig({ maxTokens: 1024 }), 1024, 128_000, 1_000_000, 16_384],
    ['Opus 5.5, no maxTokens', catalogModel('claude-opus-5-5'), new LLMConfig(), 128_000, 128_000, 1_000_000, null],
    ['Ollama, no output metadata, no maxTokens, num_ctx 8,192', ollamaModel(8192), new LLMConfig(), null, null, 8192, null],
    ['Ollama, maxTokens 1,024, num_ctx 8,192', ollamaModel(8192), new LLMConfig({ maxTokens: 1024 }), 1024, null, 8192, 2048],
    ['Ollama, maxTokens 1,024, num_ctx 32,768', ollamaModel(32_768), new LLMConfig({ maxTokens: 1024 }), 1024, null, 32_768, 8192],
    ['Sonnet 4.6, budget thinking 20,000, no maxTokens', catalogModel('claude-sonnet-4-6'),
      new LLMConfig({ extraParams: budgetThinking(20_000) }), 64_000, 64_000, 1_000_000, null],
    ['Sonnet 4.6, maxTokens 8,192, budget 4,096', catalogModel('claude-sonnet-4-6'),
      new LLMConfig({ maxTokens: 8192, extraParams: budgetThinking(4096) }), 8192, 64_000, 1_000_000, 16_384],
    ['DeepSeek scenario, maxTokens 1,024', deepseek, new LLMConfig({ maxTokens: 1024 }), 1024, deepseek.maxOutputTokens, deepseek.maxContextTokens, deepseekExpected],
  ] as const)('%s', (_label, model, config, agentLimit, modelMax, context, expected) => {
    expect(config.maxTokens ?? model.maxOutputTokens ?? null).toBe(agentLimit);
    expect(model.maxOutputTokens).toBe(modelMax);
    expect(contextOf(model, config)).toBe(context);
    expect(resolveSummaryOutputTokenOverride(model, config, contextOf(model, config))).toBe(expected);
  });

  it('is never below the agent\'s own limit, even when a quarter of the context is smaller', () => {
    expect(resolveSummaryOutputTokenOverride(ollamaModel(2048), new LLMConfig({ maxTokens: 1024 }), 2048)).toBe(1024);
  });

  it('is bounded by a known model maximum below the floor', () => {
    const model = new LLMModel({ name: 'm', value: 'm', canonicalName: 'm', provider: LLMProvider.OPENAI, maxOutputTokens: 8192 });
    expect(resolveSummaryOutputTokenOverride(model, new LLMConfig({ maxTokens: 1024 }), 1_000_000)).toBe(8192);
    expect(resolveSummaryOutputTokenOverride(model, new LLMConfig(), 1_000_000)).toBe(8192);
  });

  it('uses the floor when the context is unknown', () => {
    const model = new LLMModel({ name: 'm', value: 'm', canonicalName: 'm', provider: LLMProvider.OPENAI });
    expect(resolveSummaryOutputTokenOverride(model, new LLMConfig({ maxTokens: 1024 }), null)).toBe(SUMMARY_OUTPUT_TOKEN_FLOOR);
  });
});

const mockAnthropicCreate = (llm: AnthropicLLM) => {
  async function* stream() {
    yield { type: 'message_start', message: { usage: { input_tokens: 4, cache_read_input_tokens: 9400 } } };
    yield { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } };
    yield { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '<compaction_summary>s</compaction_summary>' } };
    yield { type: 'content_block_stop', index: 0 };
    yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 12 } };
    yield { type: 'message_stop' };
  }
  const create = vi.fn(async () => stream());
  (llm as any).clientPromise = Promise.resolve({ messages: { create } });
  return create;
};

describe('LlmPhaseSummaryPort output limit on the wire', () => {
  const tools = [{ name: 'read_file', description: 'Read a file.', input_schema: { type: 'object', properties: {} } }];
  const conversation = [
    new Message(MessageRole.SYSTEM, { content: 'You are a careful agent.' }),
    new Message(MessageRole.USER, { content: 'Inspect /repo.' }),
    new Message(MessageRole.ASSISTANT, { content: 'Inspected.' }),
  ];
  const identity = (attempt: number) => ({ operationId: 'op_1', executionTurnId: 'turn_1', attempt });
  const portFor = (llm: BaseLLM) => new LlmPhaseSummaryPort({
    agentId: 'agent', llm, tools, notifier: null, requestCapacity: resolveLlmRequestCapacity(llm.model, llm.config),
  });

  it('Opus 5.5 at maxTokens 1,024: both summary requests carry 16,384; the agent request and the cached prefix are unchanged', async () => {
    const llm = new AnthropicLLM(catalogModel('claude-opus-5-5'), new LLMConfig({ maxTokens: 1024 }), providerApiKeyResolver('synthetic'));
    const create = mockAnthropicCreate(llm);
    const signal = new AbortController().signal;
    for await (const _ of llm.streamMessages(conversation, conversationRequestKwargs('agent', tools),
      conversationRequestOptions({ signal, turnId: 'turn_1' }))) { /* drain */ }
    const agentRequest = structuredClone((create.mock.calls.at(-1) as any[])[0]);

    const port = portFor(llm);
    await port.requestCachedSummary(conversation, COMPACTION_SUMMARY_INSTRUCTION, identity(1), signal);
    const cached = (create.mock.calls.at(-1) as any[])[0];
    await port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'rendered history', identity(2), signal);
    const transcript = (create.mock.calls.at(-1) as any[])[0];

    expect(agentRequest.max_tokens).toBe(1024);
    expect(cached.max_tokens).toBe(16_384);
    expect(transcript.max_tokens).toBe(16_384);
    for (const key of ['system', 'tools', 'thinking', 'cache_control']) expect(cached[key]).toEqual(agentRequest[key]);
    expect(cached.messages.slice(0, agentRequest.messages.length)).toEqual(agentRequest.messages);
    expect(llm.config.maxTokens).toBe(1024);
  });

  it('Opus 5.5 without maxTokens: the summary requests use the agent limit (no override)', async () => {
    const llm = new AnthropicLLM(catalogModel('claude-opus-5-5'), new LLMConfig(), providerApiKeyResolver('synthetic'));
    const create = mockAnthropicCreate(llm);
    const port = portFor(llm);
    await port.requestCachedSummary(conversation, COMPACTION_SUMMARY_INSTRUCTION, identity(1), new AbortController().signal);
    await port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'rendered history', identity(2), new AbortController().signal);
    expect(create.mock.calls.map((call: any[]) => call[0].max_tokens)).toEqual([128_000, 128_000]);
  });

  class RecordingLLM extends BaseLLM {
    readonly options: LLMInvocationOptions[] = [];
    protected async _sendMessagesToLLM(): Promise<CompleteResponse> { return new CompleteResponse({ content: '' }); }
    protected async *_streamMessagesToLLM(_m: Message[], _k: Record<string, unknown>, options: LLMInvocationOptions = {}) {
      this.options.push(options);
      yield new ChunkResponse({ content: '<compaction_summary>s</compaction_summary>', is_complete: true });
    }
  }

  it('an unknown agent limit (Ollama, no output metadata) passes no override', async () => {
    const llm = new RecordingLLM(ollamaModel(8192), new LLMConfig());
    const port = portFor(llm);
    await port.requestCachedSummary(conversation, COMPACTION_SUMMARY_INSTRUCTION, identity(1), new AbortController().signal);
    await port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'rendered history', identity(2), new AbortController().signal);
    expect(llm.options.map((options) => 'maxOutputTokens' in options)).toEqual([false, false]);
  });

  it('fitsInputBudget reserves the override instead of the agent limit, and the agent budget otherwise', () => {
    const withOverride = new RecordingLLM(ollamaModel(8192), new LLMConfig({ maxTokens: 1024 }));
    const capacity = resolveLlmRequestCapacity(withOverride.model, withOverride.config)!;
    expect(capacity.inputBudget).toBe(8192 - 1024 - capacity.safetyMarginTokens);
    const overrideBudget = 8192 - 2048 - capacity.safetyMarginTokens;
    const sized = (chars: number) => [new Message(MessageRole.USER, { content: 'x'.repeat(chars) })];
    const estimate = (chars: number) => estimateMessagesTokens([...sized(chars), new Message(MessageRole.USER, { content: 'i' })]);
    let chars = 1000;
    while (estimate(chars) <= overrideBudget) chars += 500;
    expect(estimate(chars)).toBeLessThanOrEqual(capacity.inputBudget);

    const port = new LlmPhaseSummaryPort({ agentId: 'agent', llm: withOverride, tools: [], notifier: null, requestCapacity: capacity });
    expect(port.fitsInputBudget(sized(chars), 'i')).toBe(false);
    expect(port.fitsInputBudget(sized(chars - 500), 'i')).toBe(true);

    // Without an override (unknown agent limit) the same capacity is used unchanged: the request fits.
    const unknownLimit = new RecordingLLM(ollamaModel(8192), new LLMConfig());
    const noOverridePort = new LlmPhaseSummaryPort({ agentId: 'agent', llm: unknownLimit, tools: [], notifier: null, requestCapacity: capacity });
    expect(noOverridePort.fitsInputBudget(sized(chars), 'i')).toBe(true);
  });
});

describe('per-model summary mode (REQ-002)', () => {
  it('the cached summary is selected by the Anthropic catalog models and (pending the rerun) DeepSeek; everything else uses the transcript', () => {
    for (const definition of supportedModelDefinitions) {
      const expected = definition.provider === LLMProvider.ANTHROPIC || definition.provider === LLMProvider.DEEPSEEK
        ? 'cached_conversation' : 'transcript';
      expect(modelOf(definition).compactionSummaryMode, `${definition.provider}/${definition.value}`).toBe(expected);
    }
    expect(supportedModelDefinitions.some((definition) => definition.provider === LLMProvider.ANTHROPIC)).toBe(true);
  });

  it('dynamic and custom models default to the transcript summary', () => {
    expect(ollamaModel(8192).compactionSummaryMode).toBe('transcript');
    expect(new LLMModel({ name: 'c', value: 'c', canonicalName: 'c', provider: LLMProvider.ANTHROPIC }).compactionSummaryMode).toBe('transcript');
  });

  it('the port reports the model\'s mode', () => {
    const port = (model: LLMModel) => new LlmPhaseSummaryPort({ agentId: 'agent', tools: [], notifier: null, requestCapacity: null,
      llm: new AnthropicLLM(model, new LLMConfig(), providerApiKeyResolver('synthetic')) });
    expect(port(catalogModel('claude-opus-5-5')).usesCachedSummary()).toBe(true);
    expect(port(ollamaModel(8192)).usesCachedSummary()).toBe(false);
  });
});
