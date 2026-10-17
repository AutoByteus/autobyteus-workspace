/**
 * Golden characterization of the agent loop (agent-loop-structure-refactor, AC-003 / QR-001).
 *
 * Each scenario drives a real agent with a scripted LLM and records ONE ordered log of
 * everything observable: notifier events (segments, statuses, token usage, errors, tool
 * lifecycle, turn lifecycle), memory-manager writes (ingestion, recovery snapshot
 * commit/restore, recovery notes) and the LLM requests. Status events from the event store and
 * the final working context and raw traces are appended. The snapshots were recorded on the
 * unchanged loop and must not be updated by the refactor: any difference is a behavior change.
 *
 * Random identifiers (segment ids, UUIDs, epoch digits) are mapped to stable tokens in
 * first-seen order, so ordering and identity relations are kept (R-4).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import type { Agent } from '../../../src/agent/agent.js';
import { EventType } from '../../../src/events/event-types.js';
import { BaseLLM } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { buildFinish, type LlmFinishReason } from '../../../src/llm/utils/llm-response-finish.js';
import { buildLlmTokenUsageObservation } from '../../../src/llm/utils/llm-token-usage-observation.js';
import type { Message } from '../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { COMPACTION_SUMMARY_HEADINGS } from '../../../src/memory/compaction/compaction-summary-parser.js';
import { createEnabledMemoryCompactionConfiguration } from '../../../src/memory/compaction/memory-compaction-configuration.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../src/utils/parameter-schema.js';
import { FunctionalTool } from '../../../src/tools/functional-tool.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { resetAgentFactory, waitForCondition, waitForStatus } from './runtime/runtime-test-harness.js';

// ---- scripted LLM ------------------------------------------------------------------------

type Step = (ctx: { callIndex: number; messages: Message[] }) => AsyncGenerator<ChunkResponse>;

const usage = (inputTokens = 10, outputTokens = 5) =>
  buildLlmTokenUsageObservation({ inputTokens, outputTokens, totalTokens: inputTokens + outputTokens, rawUsage: null });
const text = (content: string) => new ChunkResponse({ content });
const reasoning = (value: string) => new ChunkResponse({ content: '', reasoning: value });
const toolDelta = (callId: string, args: string, name = 'get_weather') =>
  new ChunkResponse({ content: '', tool_calls: [{ index: 0, call_id: callId, name, arguments_delta: args }] });
const end = (reason: LlmFinishReason, providerReason: string, inputTokens = 10) =>
  new ChunkResponse({ content: '', is_complete: true, usage: usage(inputTokens), finish: buildFinish(reason, providerReason) });
const chunks = (...items: ChunkResponse[]): Step => async function* () { for (const item of items) yield item; };

const COMPACTION_CONVERSATION = /^compaction_(.+)_(\d+)$/;
const summaryText = COMPACTION_SUMMARY_HEADINGS.map((heading) => `## ${heading}\n- Preserve scope.`).join('\n\n');
const taggedSummary = `<compaction_summary>\n${summaryText}\n</compaction_summary>`;

class ScriptedLLM extends BaseLLM {
  callIndex = 0;
  summaryCalls = 0;
  summaryResponder: (attempt: number) => Promise<string> = async () => taggedSummary;

  constructor(private readonly steps: Step[], private readonly log: LogEntry[], model?: Partial<ConstructorParameters<typeof LLMModel>[0]>, config?: LLMConfig) {
    super(
      new LLMModel({ name: 'golden', value: 'golden', canonicalName: 'golden', provider: LLMProvider.OPENAI, maxOutputTokens: 4096, ...model }),
      config ?? new LLMConfig({ maxTokens: 256 }),
    );
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown> = {}): AsyncGenerator<ChunkResponse, void, unknown> {
    const compaction = COMPACTION_CONVERSATION.exec(String(kwargs.logicalConversationId ?? ''));
    if (compaction) {
      this.summaryCalls += 1;
      this.log.push({ kind: 'llm.summary_request', attempt: Number(compaction[2]), messageCount: messages.length });
      const content = await this.summaryResponder(Number(compaction[2]));
      yield new ChunkResponse({ content, is_complete: true, usage: usage(50, 20), finish: buildFinish('stop', 'stop') });
      return;
    }
    this.callIndex += 1;
    this.log.push({
      kind: 'llm.request',
      call: this.callIndex,
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
        reasoning: message.reasoning_content ?? null,
        tool: message.tool_payload ? JSON.parse(JSON.stringify(message.tool_payload)) : null,
      })),
      tools: Array.isArray(kwargs.tools) ? kwargs.tools.length : 0,
    });
    const step = this.steps[Math.min(this.callIndex - 1, this.steps.length - 1)]!;
    yield* step({ callIndex: this.callIndex, messages });
  }

  override async releaseConversation(): Promise<void> {}
}

// ---- recording ---------------------------------------------------------------------------

type LogEntry = Record<string, unknown>;

const MEMORY_METHODS = [
  'ingestUserMessage',
  'ingestAssistantResponse',
  'ingestAssistantToolResponse',
  'ingestToolResults',
  'appendOutputLimitRecoveryNote',
  'appendRawTrace',
  'commitLlmRequestRecoverySnapshot',
  'restoreLlmRequestRecoverySnapshot',
  'finalizePendingToolCallsForTurn',
] as const;

const summarizeArg = (value: unknown): unknown => {
  if (value instanceof CompleteResponse) {
    return { content: value.content, reasoning: value.reasoning, finish: value.finish, usage: value.usage?.output_tokens ?? null, native: Boolean(value.providerNativeAssistantTurn) };
  }
  if (Array.isArray(value)) return value.map(summarizeArg);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('toolInvocationId' in record || ('name' in record && 'arguments' in record)) {
      return JSON.parse(JSON.stringify(record));
    }
    if ('requestId' in record && 'turnId' in record) return { snapshotRequestId: record.requestId };
    return JSON.parse(JSON.stringify(record));
  }
  return value;
};

const attachRecorder = (agent: Agent, log: LogEntry[]) => {
  const notifier = agent.context.statusManager!.notifier;
  for (const eventType of Object.values(EventType)) {
    notifier.subscribe(eventType, (payload: unknown) => {
      log.push({ kind: `event.${eventType}`, payload: JSON.parse(JSON.stringify(payload ?? null)) });
    });
  }
  const memory = agent.context.state.memoryManager! as unknown as Record<string, (...args: unknown[]) => unknown>;
  for (const method of MEMORY_METHODS) {
    const original = memory[method]!.bind(memory);
    memory[method] = (...args: unknown[]) => {
      log.push({ kind: `memory.${method}`, args: args.map(summarizeArg) });
      return original(...args);
    };
  }
};

const finalState = (agent: Agent) => {
  const memory = agent.context.state.memoryManager!;
  return {
    statusEvents: (agent.context.state.eventStore?.allEvents() ?? []).map(({ event }) => {
      const record = event as unknown as Record<string, unknown>;
      return {
        type: event.constructor.name,
        turnId: record.turnId ?? null,
        isError: record.isError ?? null,
        toolInvocationId: record.toolInvocationId ?? (record.toolInvocation as any)?.id ?? null,
        error: record.error ?? null,
      };
    }),
    workingContext: memory.getWorkingContextMessages().map((message) => ({
      role: message.role,
      content: message.content,
      reasoning: message.reasoning_content ?? null,
      tool: message.tool_payload ? JSON.parse(JSON.stringify(message.tool_payload)) : null,
    })),
    rawTraces: (memory.store.list(MemoryType.RAW_TRACE) as any[]).map((trace) => ({
      traceType: trace.traceType,
      sourceEvent: trace.sourceEvent ?? null,
      turnId: trace.turnId,
      content: trace.content ?? null,
      toolCallId: trace.toolCallId ?? null,
    })),
  };
};

/** Stable tokens for random ids (first-seen order), dropped clocks, truncated long text. */
const normalize = (value: unknown, agentId: string): unknown => {
  const tokens = new Map<string, string>();
  const token = (raw: string, prefix: string) => {
    if (!tokens.has(raw)) tokens.set(raw, `<${prefix}${tokens.size + 1}>`);
    return tokens.get(raw)!;
  };
  const walk = (node: unknown, key?: string): unknown => {
    if (typeof node === 'number') {
      if (key && /(^ts$|timestamp|_at$|At$|duration|elapsed|latency)/i.test(key)) return '<clock>';
      if (node > 1e9 && !Number.isInteger(node)) return '<clock>';
      if (node > 1e12) return '<clock>';
      return node;
    }
    if (typeof node === 'string') {
      if (key && /(^ts$|timestamp|_at$|At$)/i.test(key)) return '<clock>';
      let result = node
        .split(agentId).join('<agent>')
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, (raw) => token(raw, 'uuid'))
        .replace(/[0-9a-f]{32}/gi, (raw) => token(raw, 'hex'))
        .replace(/\d{13}/g, (raw) => token(raw, 'ms'))
        // Date.now().toString(36) ids, e.g. llm_recovery_<t>_1 and compaction_operation_<t>_1.
        .replace(/(llm_recovery|compaction_operation)_([0-9a-z]{6,})_/g, (_raw, prefix: string, time: string) => `${prefix}_${token(time, 't')}_`)
        .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<iso>');
      if (result.length > 160) result = `${result.slice(0, 120)}…(${result.length} chars)`;
      return result;
    }
    if (Array.isArray(node)) return node.map((item) => walk(item));
    if (node && typeof node === 'object') {
      return Object.fromEntries(Object.entries(node as Record<string, unknown>).map(([k, v]) => [k, walk(v, k)]));
    }
    return node;
  };
  return walk(value);
};

// ---- harness -----------------------------------------------------------------------------

const weatherCalls: unknown[] = [];
const weatherTool = () => {
  const schema = new ParameterSchema([
    new ParameterDefinition({ name: 'city', type: ParameterType.STRING, description: 'City', required: true }),
  ]);
  return new FunctionalTool(
    (city: unknown) => { weatherCalls.push(city); return { city, weather: 'sunny' }; },
    'get_weather', 'Weather lookup', schema, null, false, false, false, ['city'], ['city'],
  );
};

type Harness = { agent: Agent; llm: ScriptedLLM; log: LogEntry[]; dir: string };
let harness: Harness | null = null;

const startAgent = async (steps: Step[], options: { compaction?: boolean; model?: Partial<ConstructorParameters<typeof LLMModel>[0]>; config?: LLMConfig } = {}): Promise<Harness> => {
  const log: LogEntry[] = [];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-loop-golden-'));
  const llm = new ScriptedLLM(steps, log, options.model, options.config);
  const config = new AgentConfig('golden', 'tester', 'Agent loop golden characterization', llm, 'You are a golden test agent.', [weatherTool()]);
  config.memoryDir = dir;
  if (options.compaction) config.memoryCompaction = createEnabledMemoryCompactionConfiguration(new CompactionPolicy());
  const agent = new AgentFactory().createAgent(config);
  agent.start();
  expect(await waitForStatus(agent.context, (status) => status === AgentStatus.IDLE)).toBe(true);
  attachRecorder(agent, log);
  harness = { agent, llm, log, dir };
  return harness;
};

const completedTurns = (log: LogEntry[]) => log.filter((entry) => entry.kind === `event.${EventType.AGENT_TURN_COMPLETED}`).length;

const send = async (h: Harness, content: string, expectedCompletedTurns: number) => {
  await h.agent.postUserMessage(new AgentInputUserMessage(content));
  expect(await waitForCondition(
    () => completedTurns(h.log) >= expectedCompletedTurns && h.agent.context.state.activeTurn === null && h.agent.currentStatus !== AgentStatus.PROCESSING_USER_INPUT,
    10_000,
  )).toBe(true);
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

const snapshotOf = (h: Harness) => normalize({ log: h.log, final: finalState(h.agent) }, h.agent.agentId);

describe('agent loop golden event sequences', () => {
  beforeEach(() => {
    resetAgentFactory();
    weatherCalls.length = 0;
    harness = null;
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    defaultToolRegistry.snapshot();
  });

  afterEach(async () => {
    if (harness?.agent.isRunning) await harness.agent.stop(2);
    if (harness) fs.rmSync(harness.dir, { recursive: true, force: true });
    resetAgentFactory();
    vi.restoreAllMocks();
  });

  it('final text answer with reasoning', async () => {
    const h = await startAgent([chunks(reasoning('thinking'), text('Hello '), text('there.'), end('stop', 'stop'))]);
    await send(h, 'Say hello.', 1);
    await settle();
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('one tool cycle', async () => {
    const h = await startAgent([
      chunks(reasoning('need weather'), text('Checking.'), toolDelta('call_1', '{"city":"Berlin"}'), end('tool_calls', 'tool_calls')),
      chunks(text('It is sunny.'), end('stop', 'stop', 20)),
    ]);
    await send(h, 'Weather in Berlin?', 1);
    await settle();
    expect(weatherCalls).toEqual(['Berlin']);
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('output-limit recovery: a cut tool call, then success', async () => {
    const h = await startAgent([
      chunks(reasoning('planning'), toolDelta('call_cut', '{"city":"Ber'), end('output_limit', 'length')),
      chunks(toolDelta('call_ok', '{"city":"Berlin"}'), end('tool_calls', 'tool_calls')),
      chunks(text('Sunny.'), end('stop', 'stop')),
    ]);
    await send(h, 'Weather?', 1);
    await settle();
    expect(weatherCalls).toEqual(['Berlin']);
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('output-limit recovery: text cut, then resumed', async () => {
    const h = await startAgent([
      chunks(reasoning('long'), text('Part one'), end('output_limit', 'length')),
      chunks(text(' and part two.'), end('stop', 'stop')),
    ]);
    await send(h, 'Write a long answer.', 1);
    await settle();
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('output-limit exhaustion after 3 recoveries', async () => {
    const cut = chunks(toolDelta('call_cut', '{"city":"Ber'), end('output_limit', 'length'));
    const h = await startAgent([cut, cut, cut, cut]);
    await send(h, 'Huge file please.', 1);
    await settle();
    expect(h.llm.callIndex).toBe(4);
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('interrupt mid-stream', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const h = await startAgent([async function* () {
      yield reasoning('thinking');
      yield text('partial answer');
      await gate;
      yield end('stop', 'stop');
    }]);
    await h.agent.postUserMessage(new AgentInputUserMessage('Start something long.'));
    expect(await waitForCondition(() => h.log.some((entry) => JSON.stringify(entry).includes('partial answer')), 5000)).toBe(true);
    await h.agent.interrupt({ reason: 'user stop' });
    expect(await waitForCondition(() => h.agent.context.state.activeTurn === null, 5000)).toBe(true);
    release();
    await settle();
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('interrupt at post_llm_stream after reasoning was streamed (R-3)', async () => {
    const h = await startAgent([chunks(reasoning('thinking'), text('Answer text'), end('stop', 'stop'))]);
    // Interrupt exactly when the reasoning segment ends normally: the next fence is post_llm_stream.
    h.agent.context.statusManager!.notifier.subscribe(EventType.AGENT_DATA_SEGMENT_EVENT, (payload: any) => {
      if (payload?.type === 'SEGMENT_END' && String(payload?.segment_id ?? '').includes(':reasoning_')) {
        h.agent.context.state.activeTurn?.interrupt('stop after reasoning');
      }
    });
    await h.agent.postUserMessage(new AgentInputUserMessage('Answer, please.'));
    expect(await waitForCondition(() => h.agent.context.state.activeTurn === null && h.llm.callIndex === 1, 5000)).toBe(true);
    await settle();
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('provider error mid-stream', async () => {
    const h = await startAgent([async function* () {
      yield reasoning('thinking');
      yield text('partial');
      throw Object.assign(new Error('Upstream exploded'), { status: 503, code: 'upstream_unavailable' });
    }]);
    await send(h, 'Do it.', 1);
    await settle();
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('content_filter stop error', async () => {
    const h = await startAgent([chunks(toolDelta('call_x', '{"city":"Berlin"}'), end('content_filter', 'content_filter'))]);
    await send(h, 'Do something.', 1);
    await settle();
    expect(weatherCalls).toEqual([]);
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  it('malformed tool call is rejected, then the turn continues', async () => {
    const h = await startAgent([
      chunks(toolDelta('call_bad', '{"city": Berlin}'), end('tool_calls', 'tool_calls')),
      chunks(text('Retrying differently.'), end('stop', 'stop')),
    ]);
    await send(h, 'Weather?', 1);
    await settle();
    expect(weatherCalls).toEqual([]);
    expect(snapshotOf(h)).toMatchSnapshot();
  });

  const compactionModel = { maxContextTokens: 12000, activeContextTokens: 12000, compactionSummaryMode: 'cached_conversation' as const };
  const compactionConfig = () => new LLMConfig({ maxTokens: 200, compactionRatio: 0.5, safetyMarginTokens: 10 });
  const answer = (inputTokens: number): Step => async function* ({ callIndex }) {
    yield text(`assistant-turn-${callIndex}`);
    yield end('stop', 'stop', inputTokens);
  };

  it('after-final compaction requested and executed', async () => {
    const h = await startAgent([answer(200), answer(200), answer(200), answer(7000), answer(200)], {
      compaction: true, model: compactionModel, config: compactionConfig(),
    });
    for (let i = 1; i <= 3; i += 1) await send(h, `Seed ${i}: ${'context '.repeat(1100)}`, i);
    await send(h, 'Complete this turn and compact.', 4);
    expect(await waitForCondition(() => h.log.some((entry) => entry.kind === `event.${EventType.AGENT_COMPACTION_STATUS_UPDATED}` && (entry.payload as any)?.phase === 'completed'), 10_000)).toBe(true);
    await send(h, 'Continue with the approved scope.', 5);
    await settle();
    expect(h.llm.summaryCalls).toBe(1);
    expect(snapshotOf(h)).toMatchSnapshot();
  }, 30_000);

  it('compaction_blocked, then the retry runs the held turn', async () => {
    const h = await startAgent([answer(200), answer(200), answer(200), answer(200), answer(200)], {
      compaction: true, model: compactionModel, config: compactionConfig(),
    });
    for (let i = 1; i <= 3; i += 1) await send(h, `Seed ${i} ${'context '.repeat(1100)}`, i);
    const memory = h.agent.context.state.memoryManager!;
    const { resolveCompactionPlanningBudget } = await import('../../../src/memory/compaction/compaction-planning-budget.js');
    memory.requestCompaction({
      requestKind: 'hard_input_cap', requestedTurnId: 'request',
      planningBudget: resolveCompactionPlanningBudget({ inputBudget: 11800, triggerThresholdTokens: 5900 }, 7000),
    });
    // Every attempt of the first compaction operation fails; the user's next message retries it.
    h.llm.summaryResponder = async () => {
      if (h.llm.summaryCalls <= 5) throw new Error('fixture host failure');
      return taggedSummary;
    };
    await h.agent.postUserMessage(new AgentInputUserMessage('ORIGINAL A MUST STAY'));
    expect(await waitForCondition(() => h.agent.getCompactionRecovery()?.position.kind === 'held_turn' && h.agent.currentStatus === AgentStatus.ERROR, 15_000)).toBe(true);
    await h.agent.postUserMessage(new AgentInputUserMessage('LATER B'));
    expect(await waitForCondition(() => h.llm.callIndex === 5 && h.agent.context.state.activeTurn === null && completedTurns(h.log) >= 2, 10_000)).toBe(true);
    await settle();
    expect(snapshotOf(h)).toMatchSnapshot();
  }, 30_000);
});
