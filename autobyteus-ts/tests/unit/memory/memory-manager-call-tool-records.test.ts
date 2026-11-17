/**
 * DS-003: native memory keeps two records of a call made through `call_tool`. Raw traces always
 * hold the real tool (name and arguments, plus `called_through`); the working context always
 * holds the model's own `call_tool` form, its result named `call_tool`. Each path that writes a
 * record is asserted on both records: registration, `ingestToolResults` (live and through
 * `finalizePendingToolCallsForTurn`), and repair (on restore and after an interrupted turn).
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { CALL_TOOL_NAME } from '../../../src/agent/tool-search/call-tool.js';
import { parseAnthropicAssistantTurn } from '../../../src/llm/api/anthropic-native-assistant-turn.js';
import { AnthropicPromptRenderer } from '../../../src/llm/prompt-renderers/anthropic-prompt-renderer.js';
import { GeminiPromptRenderer } from '../../../src/llm/prompt-renderers/gemini-prompt-renderer.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { OpenAIResponsesRenderer } from '../../../src/llm/prompt-renderers/openai-responses-renderer.js';
import { Message, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { assertWorkingContextMessagesStructurallyValid } from '../../../src/memory/compaction/working-context-compaction-output-validator.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import {
  WorkingContextSnapshotBootstrapOptions,
  WorkingContextSnapshotBootstrapper,
} from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';
import { SYNTHETIC_TOOL_RESULT_ERROR } from '../../../src/memory/working-context-tool-protocol-repairer.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

const AGENT_ID = 'agent_call_tool_records';
const REAL_ARGS = { task_id: 'autobyteus-77', status: 'DONE' };
const MODEL_ARGS = { name: 'update_task', arguments: REAL_ARGS };

const dirs: string[] = [];
afterEach(() => dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })));

const openMemory = (dir?: string) => {
  const memoryDir = dir ?? fs.mkdtempSync(path.join(os.tmpdir(), 'call-tool-records-'));
  if (!dir) dirs.push(memoryDir);
  const store = new FileMemoryStore(memoryDir, AGENT_ID);
  const snapshotStore = new WorkingContextSnapshotStore(memoryDir, AGENT_ID);
  return { dir: memoryDir, store, snapshotStore, memory: new MemoryManager({ store, workingContextSnapshotStore: snapshotStore, agentId: AGENT_ID }) };
};

/** The invocation the stream handler builds for `call_tool {name: update_task, arguments}`. */
const convertedInvocation = (turnId: string, id = 'call_found') =>
  new ToolInvocation('update_task', structuredClone(REAL_ARGS), id, turnId, undefined, { calledThrough: CALL_TOOL_NAME });

const rawToolTraces = (memory: MemoryManager, toolCallId: string) =>
  memory.listTurnRawTraceCorpusOrdered().filter((trace) => trace.toolCallId === toolCallId);
const workingContextCall = (memory: MemoryManager, toolCallId: string) => memory.getWorkingContextMessages()
  .flatMap((message) => message.tool_payload instanceof ToolCallPayload ? message.tool_payload.toolCalls : [])
  .find((call) => call.id === toolCallId);
const workingContextResult = (memory: MemoryManager, toolCallId: string) => memory.getWorkingContextMessages()
  .map((message) => message.tool_payload)
  .find((payload): payload is ToolResultPayload => payload instanceof ToolResultPayload && payload.toolCallId === toolCallId);

/** Both records of the call as registered: raw = real tool, working context = the model's call_tool form. */
const expectRegisteredCall = (memory: MemoryManager, toolCallId = 'call_found') => {
  const [rawCall] = rawToolTraces(memory, toolCallId).filter((trace) => trace.traceType === 'tool_call');
  expect(rawCall).toMatchObject({ toolName: 'update_task', toolArgs: REAL_ARGS, calledThrough: CALL_TOOL_NAME });
  expect(rawCall!.toDict()).toMatchObject({ tool_name: 'update_task', tool_args: REAL_ARGS, called_through: CALL_TOOL_NAME });
  expect(workingContextCall(memory, toolCallId)).toMatchObject({ name: CALL_TOOL_NAME, arguments: MODEL_ARGS });
};

const expectResult = (memory: MemoryManager, toolCallId: string, expected: { error?: string | null; result?: unknown }) => {
  const rawResults = rawToolTraces(memory, toolCallId).filter((trace) => trace.traceType === 'tool_result');
  expect(rawResults).toHaveLength(1);
  expect(rawResults[0]).toMatchObject({ toolName: 'update_task', toolArgs: REAL_ARGS, toolError: expected.error ?? null });
  expect(workingContextResult(memory, toolCallId)).toMatchObject({ toolName: CALL_TOOL_NAME, toolError: expected.error ?? null });
  if ('result' in expected) {
    expect(rawResults[0]!.toolResult).toEqual(expected.result);
    expect(workingContextResult(memory, toolCallId)!.toolResult).toEqual(expected.result);
  }
  assertWorkingContextMessagesStructurallyValid(memory.getWorkingContextMessages());
};

const registerConvertedCall = (memory: MemoryManager, turnId: string, extra: ToolInvocation[] = []) =>
  memory.ingestAssistantToolResponse(new CompleteResponse({ content: 'Closing it.' }), [convertedInvocation(turnId), ...extra], turnId);

describe('DS-003 (a) registration and (b) ingestToolResults: the live path', () => {
  it('records the real tool in raw traces and the call_tool form in the working context, for the call and its result', () => {
    const { memory } = openMemory();
    const turnId = memory.startTurn();
    const direct = new ToolInvocation('read_file', { path: 'a.txt' }, 'call_direct', turnId);
    registerConvertedCall(memory, turnId, [direct]);

    expectRegisteredCall(memory);
    expect(workingContextCall(memory, 'call_direct')).toMatchObject({ name: 'read_file', arguments: { path: 'a.txt' } });
    expect(rawToolTraces(memory, 'call_direct')[0]).toMatchObject({ toolName: 'read_file', calledThrough: null });
    expect(rawToolTraces(memory, 'call_direct')[0]!.toDict()).not.toHaveProperty('called_through');

    memory.ingestToolResults([
      new ToolResultEvent('update_task', { ok: true }, 'call_found', undefined, REAL_ARGS, turnId),
      new ToolResultEvent('read_file', 'text', 'call_direct', undefined, { path: 'a.txt' }, turnId),
    ], turnId);

    expectResult(memory, 'call_found', { result: { ok: true } });
    expect(workingContextResult(memory, 'call_direct')).toMatchObject({ toolName: 'read_file' });
  });

  it('names the working-context result from the raw call after a restart (the lifecycle state read from disk)', () => {
    const first = openMemory();
    const turnId = first.memory.startTurn();
    registerConvertedCall(first.memory, turnId);

    const restarted = openMemory(first.dir).memory;
    restarted.replaceWorkingContext(first.memory.getWorkingContext().copy());
    restarted.ingestToolResults([new ToolResultEvent('update_task', 'done', 'call_found', undefined, REAL_ARGS, turnId)], turnId);

    expectResult(restarted, 'call_found', { result: 'done' });
  });

  it('gives the Anthropic native-turn check the model form, so a converted call passes it', () => {
    const { memory } = openMemory();
    const turnId = memory.startTurn();
    const nativeTurn = parseAnthropicAssistantTurn({ provider: 'anthropic', blocks: [
      { type: 'text', text: 'Closing it.' },
      { type: 'tool_use', id: 'call_found', name: CALL_TOOL_NAME, input: { arguments: REAL_ARGS, name: 'update_task' } },
    ] });

    memory.ingestAssistantToolResponse(
      new CompleteResponse({ content: 'Closing it.', providerNativeAssistantTurn: nativeTurn }),
      [convertedInvocation(turnId)], turnId,
    );

    expectRegisteredCall(memory);
  });
});

describe('DS-003 (b) through finalizePendingToolCallsForTurn', () => {
  it('ends a converted call left open by an interrupted turn with the real tool in raw traces and call_tool in the working context', () => {
    const { memory } = openMemory();
    const turnId = memory.startTurn();
    registerConvertedCall(memory, turnId);

    memory.finalizePendingToolCallsForTurn(turnId, 'User stopped the turn.');

    expectResult(memory, 'call_found', { error: 'User stopped the turn.' });
  });
});

describe('DS-003 (c) repair', () => {
  it('repairs a converted call pending approval or running at a restart: call_tool result in the working context, real tool in the raw recovery trace', () => {
    // Pending approval and running leave memory in the same state: a call with no result.
    const first = openMemory();
    const turnId = first.memory.startTurn();
    registerConvertedCall(first.memory, turnId);
    first.memory.persistWorkingContextSnapshot();

    const restarted = openMemory(first.dir);
    new WorkingContextSnapshotBootstrapper(restarted.snapshotStore).bootstrap(
      restarted.memory, 'System prompt', new WorkingContextSnapshotBootstrapOptions(),
    );

    const error = SYNTHETIC_TOOL_RESULT_ERROR('update_task', 'call_found');
    expectRegisteredCall(restarted.memory);
    expectResult(restarted.memory, 'call_found', { error, result: null });
    expect(WorkingContextSnapshotSerializer.validate(restarted.snapshotStore.read(AGENT_ID)!)).toBe(true);

    // History shows the real tool, interrupted: the raw traces never name call_tool.
    expect(restarted.memory.listTurnRawTraceCorpusOrdered().some((trace) => trace.toolName === CALL_TOOL_NAME)).toBe(false);

    // A second restore repairs nothing more.
    const again = openMemory(first.dir);
    new WorkingContextSnapshotBootstrapper(again.snapshotStore).bootstrap(again.memory, 'System prompt', new WorkingContextSnapshotBootstrapOptions());
    expect(rawToolTraces(again.memory, 'call_found').filter((trace) => trace.traceType === 'tool_result')).toHaveLength(1);
  });

  it('after an interrupted turn, inserts the committed result under the call_tool name (the turn runner\'s sequence)', async () => {
    const { memory } = openMemory();
    const turnId = memory.startTurn();
    const direct = new ToolInvocation('read_file', { path: 'a.txt' }, 'call_direct', turnId);
    registerConvertedCall(memory, turnId, [direct]);

    // AgentTurnRunner on interruption: completed facts and open calls go to raw traces only, then the projection repairs.
    memory.ingestToolResults([new ToolResultEvent('update_task', { ok: true }, 'call_found', undefined, REAL_ARGS, turnId)], turnId, {
      source: 'ToolResultEvent', appendToWorkingContext: false,
    });
    memory.finalizePendingToolCallsForTurn(turnId, 'User stopped the turn.', { appendToWorkingContext: false });
    await memory.projectWorkingContextForNextLlm({
      mode: 'llm_safe', fenceIncompleteToolProtocolScope: { kind: 'agent_turn', id: turnId }, includeCommittedFacts: true,
    });

    expectResult(memory, 'call_found', { result: { ok: true } });
    expect(workingContextResult(memory, 'call_direct')).toMatchObject({ toolName: 'read_file', toolError: 'User stopped the turn.' });
  });
});

describe('the working context replays the call_tool call and its result on every provider format', () => {
  const recordedConversation = () => {
    const { memory } = openMemory();
    const turnId = memory.startTurn();
    memory.appendWorkingContextUserMessage('Close autobyteus-77.', { turnId });
    registerConvertedCall(memory, turnId);
    memory.ingestToolResults([new ToolResultEvent('update_task', { ok: true }, 'call_found', undefined, REAL_ARGS, turnId)], turnId);
    return memory;
  };

  it('survives the snapshot round trip unchanged', () => {
    const memory = recordedConversation();
    const payload = WorkingContextSnapshotSerializer.serialize(memory.getWorkingContext(), { agent_id: AGENT_ID });
    expect(WorkingContextSnapshotSerializer.validate(payload)).toBe(true);
    const restored = WorkingContextSnapshotSerializer.deserialize(payload);
    const messages: Message[] = restored.workingContext.buildMessages();
    expect(JSON.stringify(messages.map((m) => m.tool_payload))).toBe(JSON.stringify(memory.getWorkingContextMessages().map((m) => m.tool_payload)));
  });

  it('OpenAI-compatible chat: an assistant call_tool call and a tool message answering it', async () => {
    const rendered = await new OpenAIChatRenderer().render(recordedConversation().getWorkingContextMessages()) as any[];
    const call = rendered.find((message) => message.role === 'assistant' && message.tool_calls)!.tool_calls[0];
    expect(call).toMatchObject({ id: 'call_found', function: { name: CALL_TOOL_NAME } });
    expect(JSON.parse(call.function.arguments)).toEqual(MODEL_ARGS);
    expect(rendered.find((message) => message.role === 'tool')).toMatchObject({ tool_call_id: 'call_found' });
  });

  it('Gemini: the function response carries the call\'s name, call_tool', async () => {
    const rendered = await new GeminiPromptRenderer().render(recordedConversation().getWorkingContextMessages()) as any[];
    const parts = rendered.flatMap((content) => content.parts ?? []);
    expect(parts.find((part) => part.functionCall)!.functionCall).toMatchObject({ name: CALL_TOOL_NAME, args: MODEL_ARGS });
    expect(parts.find((part) => part.functionResponse)!.functionResponse).toMatchObject({ name: CALL_TOOL_NAME });
  });

  it('Anthropic: a call_tool tool_use and a tool_result for its id', async () => {
    const rendered = await new AnthropicPromptRenderer().render(recordedConversation().getWorkingContextMessages()) as any[];
    const blocks = rendered.flatMap((message) => Array.isArray(message.content) ? message.content : []);
    expect(blocks.find((block) => block.type === 'tool_use')).toMatchObject({ id: 'call_found', name: CALL_TOOL_NAME, input: MODEL_ARGS });
    expect(blocks.find((block) => block.type === 'tool_result')).toMatchObject({ tool_use_id: 'call_found' });
  });

  it('OpenAI Responses: a call_tool function_call and its function_call_output', async () => {
    const rendered = await new OpenAIResponsesRenderer().render(recordedConversation().getWorkingContextMessages()) as any[];
    const call = rendered.find((item) => item.type === 'function_call')!;
    expect(call).toMatchObject({ call_id: 'call_found', name: CALL_TOOL_NAME });
    expect(JSON.parse(call.arguments)).toEqual(MODEL_ARGS);
    expect(rendered.find((item) => item.type === 'function_call_output')).toMatchObject({ call_id: 'call_found' });
  });
});

describe('raw trace field', () => {
  it('reads called_through back, and an old trace without it as a direct call', () => {
    const base = { id: 'rt_1', ts: 1, turnId: 'turn_1', seq: 1, traceType: 'tool_call', content: '', sourceEvent: 'PendingToolInvocationEvent', toolName: 'update_task', toolCallId: 'c1' };
    expect(RawTraceItem.fromDict(new RawTraceItem({ ...base, calledThrough: CALL_TOOL_NAME }).toDict()).calledThrough).toBe(CALL_TOOL_NAME);
    expect(RawTraceItem.fromDict({ id: 'rt_1', ts: 1, turn_id: 'turn_1', seq: 1, trace_type: 'tool_call', content: '', source_event: 'x', tool_name: 'update_task', tool_call_id: 'c1' }).calledThrough).toBeNull();
  });
});
