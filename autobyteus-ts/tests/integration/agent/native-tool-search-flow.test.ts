/**
 * Tool search on the native runtime, end to end in one real agent with a scripted model
 * (autobyteus-515): the request's tools (AC-001), a found tool's call with approval (AC-003),
 * byte-identical requests around searches, calls and tool changes (AC-005, AC-006), and
 * search-then-call after automatic compaction (AC-007). No provider is called.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Agent } from '../../../src/agent/agent.js';
import { AgentConfig } from '../../../src/agent/context/agent-config.js';
import { AgentFactory } from '../../../src/agent/factory/agent-factory.js';
import { AgentInputUserMessage } from '../../../src/agent/message/agent-input-user-message.js';
import { AgentStatus } from '../../../src/agent/status/status-enum.js';
import { EventType } from '../../../src/events/event-types.js';
import { BaseLLM, type LLMInvocationOptions } from '../../../src/llm/base.js';
import { LLMModel } from '../../../src/llm/models.js';
import { LLMProvider } from '../../../src/llm/providers.js';
import { LLMConfig } from '../../../src/llm/utils/llm-config.js';
import { buildFinish } from '../../../src/llm/utils/llm-response-finish.js';
import { buildLlmTokenUsageObservation } from '../../../src/llm/utils/llm-token-usage-observation.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { COMPACTION_SUMMARY_HEADINGS } from '../../../src/memory/compaction/compaction-summary-parser.js';
import { createEnabledMemoryCompactionConfiguration } from '../../../src/memory/compaction/memory-compaction-configuration.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import type { BaseTool } from '../../../src/tools/base-tool.js';
import type { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { CompactionAttempts } from '../../helpers/compaction-summary-request.js';
import { BASE_TOOL_NAMES, PM_TOOLS, registerTestTool } from '../../helpers/tool-search-test-tools.js';
import { resetAgentFactory, waitForCondition, waitForStatus } from './runtime/runtime-test-harness.js';

const REAL_ARGS = { task_id: 'autobyteus-77', status: 'DONE', comment: 'Delivered and verified' };
const LISTED_IN_REQUEST = [...BASE_TOOL_NAMES, 'search_tools', 'call_tool'];

// ---- scripted model ------------------------------------------------------------------------

const usage = (inputTokens: number) =>
  buildLlmTokenUsageObservation({ inputTokens, outputTokens: 5, totalTokens: inputTokens + 5, rawUsage: null });
const callTool = (id: string, name: string, args: unknown): ChunkResponse[] => [
  new ChunkResponse({ content: '', tool_calls: [{ index: 0, call_id: id, name, arguments_delta: JSON.stringify(args) }] }),
  new ChunkResponse({ content: '', is_complete: true, usage: usage(10), finish: buildFinish('tool_calls', 'tool_calls') }),
];
const answer = (content: string, inputTokens = 10): ChunkResponse[] => [
  new ChunkResponse({ content }),
  new ChunkResponse({ content: '', is_complete: true, usage: usage(inputTokens), finish: buildFinish('stop', 'stop') }),
];
const taggedSummary = `<compaction_summary>\n${COMPACTION_SUMMARY_HEADINGS.map((heading) => `## ${heading}\n- Preserve scope.`).join('\n\n')}\n</compaction_summary>`;

type RecordedRequest = { tools: string; toolNames: string[]; system: string | null; messages: Message[] };

class ScriptedLLM extends BaseLLM {
  readonly requests: RecordedRequest[] = [];
  summaryCalls = 0;
  private readonly attempts = new CompactionAttempts();

  constructor(private readonly steps: ChunkResponse[][], model: Partial<ConstructorParameters<typeof LLMModel>[0]> = {}, config?: LLMConfig) {
    super(
      new LLMModel({ name: 'tool-search', value: 'tool-search', canonicalName: 'tool-search', provider: LLMProvider.DEEPSEEK, maxOutputTokens: 4096, ...model }),
      config ?? new LLMConfig({ maxTokens: 256 }),
    );
  }

  protected async _sendMessagesToLLM(): Promise<CompleteResponse> {
    return new CompleteResponse({ content: 'unused' });
  }

  protected async *_streamMessagesToLLM(messages: Message[], kwargs: Record<string, unknown> = {}, options: LLMInvocationOptions = {}): AsyncGenerator<ChunkResponse, void, unknown> {
    if (this.attempts.observe(messages, options.signal)) {
      this.summaryCalls += 1;
      yield new ChunkResponse({ content: taggedSummary, is_complete: true, usage: usage(50), finish: buildFinish('stop', 'stop') });
      return;
    }
    const tools = (kwargs.tools ?? []) as Array<{ function: { name: string } }>;
    this.requests.push({
      tools: JSON.stringify(tools),
      toolNames: tools.map((tool) => tool.function.name),
      system: messages[0]?.role === MessageRole.SYSTEM ? messages[0].content : null,
      messages,
    });
    const step = this.steps[this.requests.length - 1];
    if (!step) throw new Error(`No scripted step for request ${this.requests.length}.`);
    for (const chunk of step) yield chunk;
  }
}

// ---- harness ---------------------------------------------------------------------------------

type Harness = { agent: Agent; llm: ScriptedLLM; dir: string; events: Array<{ type: string; payload: any }>; calls: Array<[string, unknown]>; tools: Record<string, BaseTool> };
let harness: Harness | null = null;
let registrySnapshot: Map<string, ToolDefinition>;

const startAgent = async (steps: ChunkResponse[][], options: { autoExecuteTools?: boolean; compaction?: boolean } = {}): Promise<Harness> => {
  const calls: Array<[string, unknown]> = [];
  const tools = Object.fromEntries([...PM_TOOLS, { name: 'get_project_task', description: 'Read one Task.', parameters: ['task_id'] }]
    .map((spec) => [spec.name, registerTestTool({ ...spec, run: (args) => { calls.push([spec.name, args]); return `${spec.name} ok`; } })]));
  const llm = options.compaction
    ? new ScriptedLLM(steps, { maxContextTokens: 12000, activeContextTokens: 12000, compactionSummaryMode: 'cached_conversation' },
      new LLMConfig({ maxTokens: 200, compactionRatio: 0.5, safetyMarginTokens: 10 }))
    : new ScriptedLLM(steps);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-tool-search-'));
  const initial = PM_TOOLS.map((spec) => tools[spec.name]!);
  const config = new AgentConfig('pm', 'Project Task Manager', 'Tool search flow', llm, 'You manage Tasks.', initial, options.autoExecuteTools ?? true);
  config.memoryDir = dir;
  config.listedToolNames = BASE_TOOL_NAMES;
  if (options.compaction) config.memoryCompaction = createEnabledMemoryCompactionConfiguration(new CompactionPolicy());
  const agent = new AgentFactory().createAgent(config);
  agent.start();
  expect(await waitForStatus(agent.context, (status) => status === AgentStatus.IDLE)).toBe(true);
  const events: Harness['events'] = [];
  const notifier = agent.context.statusManager!.notifier;
  for (const type of [EventType.AGENT_TOOL_APPROVAL_REQUESTED, EventType.AGENT_TOOL_EXECUTION_SUCCEEDED, EventType.AGENT_TOOL_EXECUTION_FAILED,
    EventType.AGENT_DATA_SEGMENT_EVENT, EventType.AGENT_TURN_COMPLETED, EventType.AGENT_COMPACTION_STATUS_UPDATED]) {
    notifier.subscribeFrom(notifier, type, (payload: unknown) => events.push({ type, payload }));
  }
  harness = { agent, llm, dir, events, calls, tools };
  return harness;
};

const turnsCompleted = (h: Harness) => h.events.filter((event) => event.type === EventType.AGENT_TURN_COMPLETED).length;
const send = async (h: Harness, content: string, completedTurns: number, approve = false) => {
  await h.agent.postUserMessage(new AgentInputUserMessage(content));
  const approved = new Set<string>();
  expect(await waitForCondition(() => {
    if (approve) {
      for (const event of h.events.filter((e) => e.type === EventType.AGENT_TOOL_APPROVAL_REQUESTED)) {
        const id = event.payload.invocation_id as string;
        if (!approved.has(id)) { approved.add(id); void h.agent.postToolExecutionApproval(id, true, 'approved'); }
      }
    }
    return turnsCompleted(h) >= completedTurns && h.agent.context.state.activeTurn === null;
  }, 10_000)).toBe(true);
};
const toolResultsSent = (request: RecordedRequest) => request.messages
  .map((message) => message.tool_payload)
  .filter((payload): payload is ToolResultPayload => payload instanceof ToolResultPayload);
const expectSameToolsAndSystemPrompt = (requests: RecordedRequest[]) => {
  expect(requests[0]!.toolNames).toEqual(LISTED_IN_REQUEST);
  for (const request of requests) {
    expect(request.tools).toBe(requests[0]!.tools);
    expect(request.system).toBe(requests[0]!.system);
  }
};

beforeEach(() => {
  resetAgentFactory();
  registrySnapshot = defaultToolRegistry.snapshot();
  vi.spyOn(console, 'debug').mockImplementation(() => undefined);
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(async () => {
  if (harness?.agent.isRunning) await harness.agent.stop(2);
  if (harness) fs.rmSync(harness.dir, { recursive: true, force: true });
  harness = null;
  defaultToolRegistry.restore(registrySnapshot);
  resetAgentFactory();
  vi.restoreAllMocks();
});

describe('native tool search, end to end with a scripted model', () => {
  it('searches, then calls a found tool through call_tool: approval, run, events and history show the real tool (AC-001, AC-003, AC-006)', async () => {
    const h = await startAgent([
      callTool('c_search', 'search_tools', { query: 'update_task' }),
      callTool('c_call', 'call_tool', { name: 'update_task', arguments: REAL_ARGS }),
      answer('Closed.'),
    ], { autoExecuteTools: false });

    await send(h, 'Close autobyteus-77 as DONE.', 1, true);

    expectSameToolsAndSystemPrompt(h.llm.requests);
    expect(h.llm.requests).toHaveLength(3);
    const approvals = h.events.filter((event) => event.type === EventType.AGENT_TOOL_APPROVAL_REQUESTED).map((event) => event.payload);
    expect(approvals.map((payload) => [payload.tool_name, payload.invocation_id])).toEqual([['search_tools', 'c_search'], ['update_task', 'c_call']]);
    expect(approvals[1].arguments).toEqual(REAL_ARGS);
    expect(h.calls).toEqual([['update_task', REAL_ARGS]]);
    const succeeded = h.events.filter((event) => event.type === EventType.AGENT_TOOL_EXECUTION_SUCCEEDED).map((event) => event.payload.tool_name);
    expect(succeeded).toEqual(['search_tools', 'update_task']);
    const callEnd = h.events.find((event) => event.type === EventType.AGENT_DATA_SEGMENT_EVENT
      && event.payload.segment_id === 'c_call' && event.payload.type === 'SEGMENT_END');
    expect(callEnd?.payload.payload.metadata).toMatchObject({ tool_name: 'update_task', arguments: REAL_ARGS });

    // The model got the definition from its search, and sees its call_tool call answered as call_tool.
    expect(String(toolResultsSent(h.llm.requests[1]!)[0]!.toolResult)).toContain('"name":"update_task"');
    const lastRequest = h.llm.requests[2]!;
    const sentCall = lastRequest.messages.flatMap((m) => m.tool_payload instanceof ToolCallPayload ? m.tool_payload.toolCalls : []).find((c) => c.id === 'c_call');
    expect(sentCall).toMatchObject({ name: 'call_tool', arguments: { name: 'update_task', arguments: REAL_ARGS } });
    expect(toolResultsSent(lastRequest).find((r) => r.toolCallId === 'c_call')).toMatchObject({ toolName: 'call_tool', toolResult: 'update_task ok' });

    // History (raw traces) shows the real tool.
    const raw = h.agent.context.state.memoryManager!.listTurnRawTraceCorpusOrdered().filter((trace) => trace.toolCallId === 'c_call');
    expect(raw.map((trace) => [trace.traceType, trace.toolName, trace.toolArgs, trace.calledThrough]))
      .toEqual([['tool_call', 'update_task', REAL_ARGS, 'call_tool'], ['tool_result', 'update_task', REAL_ARGS, null]]);
  });

  it('keeps the request tools identical when a tool is added and removed during the run; the added tool is found and called, the removed one refused (AC-005)', async () => {
    const h = await startAgent([
      answer('Hello.'),
      callTool('c_search', 'search_tools', { query: 'get_project_task' }),
      callTool('c_get', 'call_tool', { name: 'get_project_task', arguments: { task_id: 'autobyteus-77' } }),
      answer('Read it.'),
      callTool('c_removed', 'call_tool', { name: 'update_task', arguments: REAL_ARGS }),
      callTool('c_malformed', 'call_tool', { name: 'update_task' }),
      answer('It is gone.'),
    ]);
    await send(h, 'Hello.', 1);

    const current = { ...h.agent.context.toolInstances };
    await h.agent.replaceTools([...Object.values(current), h.tools.get_project_task!]);
    await send(h, 'Read autobyteus-77.', 2);
    await h.agent.replaceTools(Object.values(h.agent.context.toolInstances).filter((tool) => tool !== current.update_task));
    await send(h, 'Close it.', 3);

    expectSameToolsAndSystemPrompt(h.llm.requests);
    expect(h.llm.requests).toHaveLength(7);
    expect(h.calls).toEqual([['get_project_task', { task_id: 'autobyteus-77' }]]);
    expect(String(toolResultsSent(h.llm.requests[2]!).at(-1)!.toolResult)).toContain('"name":"get_project_task"');
    const refused = toolResultsSent(h.llm.requests[5]!).find((r) => r.toolCallId === 'c_removed')!;
    expect(refused).toMatchObject({ toolName: 'call_tool' });
    expect(refused.toolError).toMatch(/Tool 'update_task' not found or configured/);
    const malformed = toolResultsSent(h.llm.requests[6]!).find((r) => r.toolCallId === 'c_malformed')!;
    expect(malformed.toolError).toContain('call_tool ran no tool: "arguments" is missing or not an object');
  });

  it('searches and calls again after automatic compaction removed the earlier search (AC-007)', async () => {
    const h = await startAgent([
      callTool('c_search_1', 'search_tools', { query: 'update_task' }),
      callTool('c_call_1', 'call_tool', { name: 'update_task', arguments: REAL_ARGS }),
      answer('Closed.', 200),
      answer('Noted.', 200),
      answer('Noted.', 200),
      answer('Done for now.', 7000),
      callTool('c_search_2', 'search_tools', { query: 'close a task' }),
      callTool('c_call_2', 'call_tool', { name: 'update_task', arguments: { ...REAL_ARGS, task_id: 'autobyteus-78' } }),
      answer('Closed again.'),
    ], { compaction: true });

    // The found tool's search and call are in the oldest turns; the fourth turn's prompt size compacts them.
    await send(h, `Close autobyteus-77. ${'context '.repeat(1100)}`, 1);
    await send(h, `Seed 2: ${'context '.repeat(1100)}`, 2);
    await send(h, `Seed 3: ${'context '.repeat(1100)}`, 3);
    await send(h, 'Complete this turn.', 4);
    expect(await waitForCondition(() => h.events.some((event) => event.type === EventType.AGENT_COMPACTION_STATUS_UPDATED
      && event.payload?.phase === 'completed'), 10_000)).toBe(true);
    await send(h, 'Now close autobyteus-78.', 5);

    expect(h.llm.summaryCalls).toBe(1);
    expectSameToolsAndSystemPrompt(h.llm.requests);
    const afterCompaction = h.llm.requests[6]!;
    expect(toolResultsSent(afterCompaction).some((result) => result.toolCallId === 'c_search_1')).toBe(false);
    expect(String(toolResultsSent(h.llm.requests[7]!).find((r) => r.toolCallId === 'c_search_2')!.toolResult)).toContain('"name":"update_task"');
    expect(h.calls).toEqual([['update_task', REAL_ARGS], ['update_task', { ...REAL_ARGS, task_id: 'autobyteus-78' }]]);
  }, 30_000);
});
