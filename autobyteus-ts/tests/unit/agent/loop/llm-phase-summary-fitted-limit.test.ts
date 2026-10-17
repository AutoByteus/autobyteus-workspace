import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseLLM, type LLMInvocationOptions } from '../../../../src/llm/base.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMRuntime } from '../../../../src/llm/runtimes.js';
import { supportedModelDefinitions } from '../../../../src/llm/supported-model-definitions.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { LlmPhaseSummaryPort } from '../../../../src/agent/loop/llm-phase-summary-port.js';
import { resolveLlmRequestCapacity } from '../../../../src/agent/token-budget.js';
import { COMPACTION_SUMMARY_INSTRUCTION, COMPACTION_SUMMARY_PROMPT } from '../../../../src/memory/compaction/compaction-summary-prompt.js';

/**
 * The input estimate `E` of a request is set exactly per case. The port uses this one estimator
 * for both its accept decision and its limit (N-2), so each row exercises both with the same `E`.
 */
const estimate = vi.hoisted(() => ({ tokens: 0 }));
vi.mock('../../../../src/memory/compaction/message-budget-strategy.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../src/memory/compaction/message-budget-strategy.js')>()),
  estimateMessagesTokens: vi.fn(() => estimate.tokens),
}));

class RecordingLLM extends BaseLLM {
  readonly options: LLMInvocationOptions[] = [];
  protected async _sendMessagesToLLM(): Promise<CompleteResponse> { return new CompleteResponse({ content: '' }); }
  protected async *_streamMessagesToLLM(_m: Message[], _k: Record<string, unknown>, options: LLMInvocationOptions = {}) {
    this.options.push(options);
    yield new ChunkResponse({ content: '<compaction_summary>s</compaction_summary>', is_complete: true });
  }
}

const ollama = (numCtx: number, maxTokens?: number) => new RecordingLLM(new LLMModel({
  name: 'qwen3:8b', value: 'qwen3:8b', canonicalName: 'qwen3:8b', provider: LLMProvider.OLLAMA,
  runtime: LLMRuntime.OLLAMA, hostUrl: 'http://localhost:11434', maxContextTokens: 40_960, activeContextTokens: numCtx,
}), new LLMConfig(maxTokens === undefined ? {} : { maxTokens }));

const opus = (maxTokens: number) => {
  const definition = supportedModelDefinitions.find((entry) => entry.provider === LLMProvider.ANTHROPIC && entry.value === 'claude-opus-5-5')!;
  const { staticMetadata, ...runtimeDefinition } = definition;
  return new RecordingLLM(new LLMModel({ ...runtimeDefinition, maxContextTokens: staticMetadata.maxContextTokens,
    maxInputTokens: staticMetadata.maxInputTokens, maxOutputTokens: staticMetadata.maxOutputTokens }), new LLMConfig({ maxTokens }));
};

const portFor = (llm: RecordingLLM) => new LlmPhaseSummaryPort({
  agentId: 'agent', llm, tools: [], notifier: null, requestCapacity: resolveLlmRequestCapacity(llm.model, llm.config),
});
const identity = { operationId: 'op_1', executionTurnId: 'turn_1', attempt: 3 };
const conversation = [new Message(MessageRole.SYSTEM, { content: 'system' }), new Message(MessageRole.USER, { content: 'task' })];
const sentLimit = (llm: RecordingLLM) => llm.options.at(-1)!.maxOutputTokens;

describe('summary output limit fitted to each request (SR-010, design Intended Change 11 boundary table)', () => {
  beforeEach(() => { estimate.tokens = 0; });

  it.each([
    ['Ollama 8k, maxTokens 1,024, well inside', () => ollama(8192, 1024), 6912, 4000, 2048],
    ['Ollama 8k, maxTokens 1,024, CR-004 window (input + output = context − margin)', () => ollama(8192, 1024), 6912, 6500, 1436],
    ['Ollama 8k, maxTokens 1,024, at the agent budget: today\'s limit', () => ollama(8192, 1024), 6912, 6912, 1024],
    ['Ollama 32k, maxTokens 1,024, CR-004 window', () => ollama(32_768, 1024), 31_488, 26_000, 6512],
  ] as const)('transcript: %s', async (_label, build, agentBudget, inputTokens, expected) => {
    const llm = build();
    const port = portFor(llm);
    expect(resolveLlmRequestCapacity(llm.model, llm.config)!.inputBudget).toBe(agentBudget);
    estimate.tokens = inputTokens;
    await port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'rendered history', identity, new AbortController().signal);
    expect(sentLimit(llm)).toBe(expected);
    expect(inputTokens + expected).toBeLessThanOrEqual(llm.model.activeContextTokens! - 256);
  });

  it('transcript: an input above the agent budget is input_budget_exceeded, as today, with no provider call', async () => {
    const llm = ollama(8192, 1024);
    estimate.tokens = 7000;
    await expect(portFor(llm).requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'rendered history', identity, new AbortController().signal))
      .rejects.toMatchObject({ code: 'input_budget_exceeded' });
    expect(llm.options).toHaveLength(0);
  });

  it.each([100, 6000, 7900])('no override (Ollama, no maxTokens): no maxOutputTokens on either path (E %i)', async (inputTokens) => {
    const llm = ollama(8192);
    const port = portFor(llm);
    estimate.tokens = inputTokens;
    await port.requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'rendered history', identity, new AbortController().signal);
    await port.requestCachedSummary(conversation, COMPACTION_SUMMARY_INSTRUCTION, { ...identity, attempt: 1 }, new AbortController().signal);
    expect(llm.options.map((options) => 'maxOutputTokens' in options)).toEqual([false, false]);
  });

  it('cached: Opus 5.5 at maxTokens 1,024 with E 990,000 is accepted with the agent budget and sends the fitted 9,744', async () => {
    const llm = opus(1024);
    const port = portFor(llm);
    expect(resolveLlmRequestCapacity(llm.model, llm.config)!.inputBudget).toBe(998_720);
    estimate.tokens = 990_000;
    // Between context − L − margin (983,360) and the agent budget: still the cached request (SR-009 dropped it to the fallback).
    expect(port.fitsInputBudget(conversation, COMPACTION_SUMMARY_INSTRUCTION)).toBe(true);
    await port.requestCachedSummary(conversation, COMPACTION_SUMMARY_INSTRUCTION, { ...identity, attempt: 1 }, new AbortController().signal);
    expect(sentLimit(llm)).toBe(9744);
  });

  it('cached: accepts exactly the inputs the agent budget accepts, and sends the full ceiling well inside', async () => {
    const llm = ollama(8192, 1024);
    const port = portFor(llm);
    estimate.tokens = 6912;
    expect(port.fitsInputBudget(conversation, COMPACTION_SUMMARY_INSTRUCTION)).toBe(true);
    estimate.tokens = 6913;
    expect(port.fitsInputBudget(conversation, COMPACTION_SUMMARY_INSTRUCTION)).toBe(false);
    estimate.tokens = 4000;
    await port.requestCachedSummary(conversation, COMPACTION_SUMMARY_INSTRUCTION, { ...identity, attempt: 1 }, new AbortController().signal);
    expect(sentLimit(llm)).toBe(2048);
  });

  it('cached: the estimate includes the tool schemas, for both the accept decision and the limit (N-2)', async () => {
    const llm = ollama(8192, 1024);
    const tools = [{ name: 'read_file', description: 'x'.repeat(3990), input_schema: { type: 'object' } }];
    const toolTokens = Math.ceil(JSON.stringify(tools).length / 4);
    const port = new LlmPhaseSummaryPort({ agentId: 'agent', llm, tools, notifier: null, requestCapacity: resolveLlmRequestCapacity(llm.model, llm.config) });
    expect(toolTokens).toBeGreaterThan(900);
    // Without the tools both would fit and send the full 2,048; with them the decision and the limit both move.
    estimate.tokens = 6912 - toolTokens + 1;
    expect(port.fitsInputBudget(conversation, COMPACTION_SUMMARY_INSTRUCTION)).toBe(false);
    estimate.tokens = 5500;
    expect(port.fitsInputBudget(conversation, COMPACTION_SUMMARY_INSTRUCTION)).toBe(true);
    await port.requestCachedSummary(conversation, COMPACTION_SUMMARY_INSTRUCTION, { ...identity, attempt: 1 }, new AbortController().signal);
    expect(sentLimit(llm)).toBe(8192 - 5500 - toolTokens - 256);
    expect(sentLimit(llm)).toBeLessThan(2048);
  });

  it('unknown context: the ceiling is sent unbounded by room', async () => {
    const llm = new RecordingLLM(new LLMModel({ name: 'm', value: 'm', canonicalName: 'm', provider: LLMProvider.OPENAI, maxInputTokens: 100_000 }),
      new LLMConfig({ maxTokens: 1024 }));
    const capacity = resolveLlmRequestCapacity(llm.model, llm.config)!;
    expect(capacity.effectiveContextCapacity).toBeNull();
    estimate.tokens = 90_000;
    await portFor(llm).requestTranscriptSummary(COMPACTION_SUMMARY_PROMPT, 'rendered history', identity, new AbortController().signal);
    expect(sentLimit(llm)).toBe(16_384);
  });
});
