import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { MessageRole, ToolCallPayload } from '../../../src/llm/utils/messages.js';
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

      const rawItems = store.list(MemoryType.RAW_TRACE);
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

      const rawItems = store.list(MemoryType.RAW_TRACE);
      expect(rawItems.filter((item) => item.traceType === 'tool_call')).toHaveLength(2);
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

      const rawItems = store.list(MemoryType.RAW_TRACE);
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

  it('returns raw tail ordered by turn and sequence', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_tail');
      const manager = new MemoryManager({ store });

      store.add([
        makeTrace('turn_0001', 1, 'user', 't1 user'),
        makeTrace('turn_0001', 2, 'assistant', 't1 assistant'),
        makeTrace('turn_0002', 1, 'user', 't2 user'),
        makeTrace('turn_0003', 1, 'user', 't3 user'),
        makeTrace('turn_0003', 2, 'tool_call', '')
      ]);

      const tailItems = manager.getRawTail(2);
      expect(tailItems.map((item) => [item.turnId, item.seq])).toEqual([
        ['turn_0002', 1],
        ['turn_0003', 1],
        ['turn_0003', 2]
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('excludes the provided turn when building a raw tail', () => {
    const tempDir = makeTempDir();
    try {
      const store = new FileMemoryStore(tempDir, 'agent_mem_tail_exclude');
      const manager = new MemoryManager({ store });

      store.add([
        makeTrace('turn_0001', 1, 'user', 't1'),
        makeTrace('turn_0002', 1, 'user', 't2'),
        makeTrace('turn_0003', 1, 'user', 't3')
      ]);

      const tailItems = manager.getRawTail(2, 'turn_0003');
      expect(tailItems.map((item) => [item.turnId, item.seq])).toEqual([
        ['turn_0001', 1],
        ['turn_0002', 1]
      ]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
