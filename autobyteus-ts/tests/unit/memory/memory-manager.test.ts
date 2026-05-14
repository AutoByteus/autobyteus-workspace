import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { Message, MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { ToolResultEvent } from '../../../src/agent/events/agent-events.js';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { ToolInteractionStatus } from '../../../src/memory/models/tool-interaction.js';

const makeTempDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'memory-manager-'));
const makeTrace = (
  turnId: string,
  seq: number,
  traceType = 'user',
  content = ''
) =>
  new RawTraceItem({
    id: `rt_${turnId}_${seq}`,
    ts: Date.now() / 1000,
    turnId,
    seq,
    traceType,
    content,
    sourceEvent: 'TestEvent'
  });

describe('MemoryManager', () => {
  it('ingests user message and assistant response with sequencing', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem');
      const manager = new MemoryManager({ store });

      const turnId = manager.startTurn();
      manager.ingestUserMessage(new LLMUserMessage({ content: 'hello' }), turnId, 'LLMUserMessageReadyEvent');
      manager.ingestAssistantResponse({ content: 'hi', reasoning: null } as any, turnId, 'LLMCompleteResponseReceivedEvent');

      const rawItems = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(rawItems).toHaveLength(2);
      expect(rawItems[0].seq).toBe(1);
      expect(rawItems[1].seq).toBe(2);
      expect(rawItems[0].traceType).toBe('user');
      expect(rawItems[1].traceType).toBe('assistant');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ingests tool intent and result into working context snapshot', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_tools');
      const manager = new MemoryManager({ store });

      const turnId = manager.startTurn();
      const invocation = new ToolInvocation('write_file', { path: 'x.txt' }, 'call_1', turnId);
      manager.ingestToolIntent(invocation, turnId);

      const toolResult = new ToolResultEvent('write_file', 'ok', 'call_1', undefined, { path: 'x.txt' }, turnId);
      manager.ingestToolResult(toolResult, turnId);

      const snapshot = manager.getWorkingContextMessages();
      expect(snapshot).toHaveLength(2);
      expect(snapshot[0].role).toBe(MessageRole.ASSISTANT);
      expect(snapshot[1].role).toBe(MessageRole.TOOL);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('builds tool interactions from stored traces', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_interactions');
      const manager = new MemoryManager({ store });

      const turnId = manager.startTurn();
      const invocation = new ToolInvocation('read_file', { path: 'a.txt' }, 'call_1', turnId);
      manager.ingestToolIntent(invocation, turnId);

      const toolResult = new ToolResultEvent('read_file', 'ok', 'call_1', undefined, { path: 'a.txt' }, turnId);
      manager.ingestToolResult(toolResult, turnId);

      const interactions = manager.getToolInteractions(turnId);
      expect(interactions).toHaveLength(1);
      expect(interactions[0].toolName).toBe('read_file');
      expect(interactions[0].status).toBe(ToolInteractionStatus.SUCCESS);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('groups multiple tool intents into one assistant tool-call message', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_grouped_tool_calls');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      const first = new ToolInvocation('write_file', { path: 'a.txt' }, 'call_1', turnId);
      const second = new ToolInvocation('read_file', { path: 'b.txt' }, 'call_2', turnId);
      manager.ingestToolIntents([first, second], turnId);

      const snapshot = manager.getWorkingContextMessages();
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].role).toBe(MessageRole.ASSISTANT);
      expect(snapshot[0].tool_payload).toBeInstanceOf(ToolCallPayload);
      const payload = snapshot[0].tool_payload as ToolCallPayload;
      expect(payload.toolCalls.map((call) => call.id)).toEqual(['call_1', 'call_2']);

      const rawItems = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(rawItems.filter((item) => item.traceType === 'tool_call')).toHaveLength(2);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('preserves provider-native tool-call context in grouped tool intents', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_native_tool_context');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();
      const invocation = new ToolInvocation(
        'search',
        { q: 'abc' },
        'call_1',
        turnId,
        { provider: 'gemini', functionCallPart: { functionCall: { id: 'call_1', name: 'search' } } }
      );

      manager.ingestToolIntents([invocation], turnId);

      const payload = manager.getWorkingContextMessages()[0].tool_payload as ToolCallPayload;
      expect(payload.toolCalls[0].nativeToolCallContext).toEqual(invocation.nativeToolCallContext);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('ingests ordered tool result batches in received order', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_ordered_tool_results');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.ingestToolResults([
        new ToolResultEvent('tool_A', 'result A', 'call_A', undefined, undefined, turnId),
        new ToolResultEvent('tool_B', 'result B', 'call_B', undefined, undefined, turnId)
      ], turnId, { source: 'native_api_ordered_batch' });

      const messages = manager.getWorkingContextMessages();
      expect(messages.map((message) => message.role)).toEqual([MessageRole.TOOL, MessageRole.TOOL]);
      expect(messages.map((message) => (message.tool_payload as any).toolCallId)).toEqual(['call_A', 'call_B']);
      const rawItems = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(rawItems.map((item) => item.sourceEvent)).toEqual([
        'native_api_ordered_batch',
        'native_api_ordered_batch'
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('can skip appending assistant response to working context snapshot', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_skip_assistant_append');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.ingestAssistantResponse(
        { content: 'tool planning text', reasoning: null } as any,
        turnId,
        'LLMCompleteResponseReceivedEvent',
        { appendToWorkingContext: false }
      );

      expect(manager.getWorkingContextMessages()).toHaveLength(0);

      const rawItems = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
      expect(rawItems).toHaveLength(1);
      expect(rawItems[0].traceType).toBe('assistant');
      expect(rawItems[0].content).toBe('tool planning text');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('filters tool interactions by turn id', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_filter');
      const manager = new MemoryManager({ store });

      store.add([
        new RawTraceItem({
          id: 'rt_1',
          ts: Date.now() / 1000,
          turnId: 'turn_0001',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'TestEvent',
          toolName: 'search',
          toolCallId: 'call_1',
          toolArgs: { q: 'a' }
        }),
        new RawTraceItem({
          id: 'rt_2',
          ts: Date.now() / 1000,
          turnId: 'turn_0001',
          seq: 2,
          traceType: 'tool_result',
          content: '',
          sourceEvent: 'TestEvent',
          toolName: 'search',
          toolCallId: 'call_1',
          toolResult: { ok: true }
        }),
        new RawTraceItem({
          id: 'rt_3',
          ts: Date.now() / 1000,
          turnId: 'turn_0002',
          seq: 1,
          traceType: 'tool_call',
          content: '',
          sourceEvent: 'TestEvent',
          toolName: 'write_file',
          toolCallId: 'call_2',
          toolArgs: { path: 'a.txt' }
        })
      ]);

      const allInteractions = manager.getToolInteractions();
      expect(new Set(allInteractions.map((interaction) => interaction.toolCallId))).toEqual(
        new Set(['call_1', 'call_2'])
      );

      const turn1Interactions = manager.getToolInteractions('turn_0001');
      expect(turn1Interactions).toHaveLength(1);
      expect(turn1Interactions[0].toolCallId).toBe('call_1');
      expect(turn1Interactions[0].status).toBe(ToolInteractionStatus.SUCCESS);

      const turn2Interactions = manager.getToolInteractions('turn_0002');
      expect(turn2Interactions).toHaveLength(1);
      expect(turn2Interactions[0].status).toBe(ToolInteractionStatus.PENDING);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('lists ordered raw traces from the store append order', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_tail');
      const manager = new MemoryManager({ store });

      store.add([
        makeTrace('turn_0001', 1, 'user', 't1 user'),
        makeTrace('turn_0001', 2, 'assistant', 't1 assistant'),
        makeTrace('turn_0002', 1, 'user', 't2 user'),
      ]);

      const rawItems = manager.listRawTracesOrdered();
      expect(rawItems.map((item) => [item.turnId, item.seq])).toEqual([
        ['turn_0001', 1],
        ['turn_0001', 2],
        ['turn_0002', 1]
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('persists a tool continuation boundary without duplicating tool results', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_boundary');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.ingestToolResult(new ToolResultEvent('search', { ok: true }, 'call_1', undefined, undefined, turnId), turnId);
      manager.ingestToolContinuationBoundary(turnId, 'ToolContinuationInput');

      const rawItems = manager.listRawTracesOrdered();
      expect(rawItems.map((item) => item.traceType)).toEqual(['tool_result', 'tool_continuation']);
      expect(rawItems[1]?.content).toBe('Tool continuation');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('finalizes interrupted turns without restoring accepted user input out of working context', async () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_interrupted_projection');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      manager.workingContextSnapshot.appendMessage(
        new Message(MessageRole.SYSTEM, { content: 'stable system prompt' })
      );
      manager.workingContextSnapshot.appendMessage(
        new Message(MessageRole.USER, { content: 'interrupted user input' })
      );
      manager.ingestUserMessage(new LLMUserMessage({ content: 'interrupted user input' }), turnId, 'LLMUserMessageReadyEvent');
      manager.ingestToolIntent(new ToolInvocation('read_file', { path: '/tmp/incomplete.txt' }, 'inv-interrupt', turnId), turnId);

      await manager.finalizeInterruptedTurn({ turnId, reason: 'user_interrupt' });

      const messages = manager.getWorkingContextMessages();
      expect(messages.some((message) => message.content === 'stable system prompt')).toBe(true);
      expect(messages.some((message) => message.content === 'interrupted user input')).toBe(true);
      expect(messages.some((message) =>
        typeof message.content === 'string' &&
        message.content.includes(`turn '${turnId}' was interrupted`) &&
        message.content.includes('user_interrupt')
      )).toBe(true);
      expect(messages.some((message) => message.tool_payload instanceof ToolCallPayload)).toBe(false);
      expect(messages.some((message) => message.tool_payload instanceof ToolResultPayload)).toBe(false);

      const rawItems = manager.listRawTracesOrdered();
      expect(rawItems.some((item) => item.traceType === 'user' && item.content === 'interrupted user input')).toBe(true);
      expect(rawItems.some((item) =>
        item.traceType === 'turn_interrupted' &&
        item.sourceEvent === 'AgentTurnInterruptedEvent' &&
        item.content.includes('user_interrupt')
      )).toBe(true);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('keeps complete native tool-call history while adding the interrupted marker', async () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_interrupted_complete_tools');
      const manager = new MemoryManager({ store });
      const turnId = manager.startTurn();

      const invocation = new ToolInvocation('search', { q: 'abc' }, 'call_complete', turnId);
      manager.ingestToolIntent(invocation, turnId);
      manager.ingestToolResult(
        new ToolResultEvent('search', { ok: true }, 'call_complete', undefined, { q: 'abc' }, turnId),
        turnId
      );

      await manager.finalizeInterruptedTurn({ turnId, reason: 'post_tool_interrupt' });

      const messages = manager.getWorkingContextMessages();
      expect(messages.some((message) => message.tool_payload instanceof ToolCallPayload)).toBe(true);
      expect(messages.some((message) => message.tool_payload instanceof ToolResultPayload)).toBe(true);
      expect(messages.at(-1)?.content).toContain(`turn '${turnId}' was interrupted`);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
