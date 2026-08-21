import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ToolInvocation } from '../../../src/agent/tool-invocation.js';
import { MessageRole, ToolCallPayload } from '../../../src/llm/utils/messages.js';
import { CompleteResponse } from '../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { getWorkingContextMessageProvenance } from '../../../src/memory/working-context-provenance.js';

const makeManager = () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-manager-reasoning-'));
  return {
    manager: new MemoryManager({ store: new FileMemoryStore(tempDir, 'agent_reasoning') }),
    remove: () => fs.rmSync(tempDir, { recursive: true, force: true }),
  };
};

describe('MemoryManager native assistant reasoning persistence', () => {
  it('persists a reasoning-only response exactly once before its assistant boundary', () => {
    const { manager, remove } = makeManager();
    try {
      const turnId = manager.startTurn();
      const reasoning = '  inspect\nthen answer  ';
      manager.ingestAssistantResponse(
        new CompleteResponse({ content: '', reasoning }),
        turnId,
        'LLMCompleteResponseReceivedEvent',
      );

      const traces = manager.listTurnRawTracesOrdered();
      expect(traces.map(({ traceType, content }) => ({ traceType, content }))).toEqual([
        { traceType: 'reasoning', content: reasoning },
        { traceType: 'assistant', content: '' },
      ]);
      expect(traces.map((trace) => trace.seq)).toEqual([1, 2]);
      expect(new Set(traces.map((trace) => trace.id)).size).toBe(2);
      expect(traces.every((trace) => trace.turnId === turnId)).toBe(true);
      expect(traces.every((trace) => trace.sourceEvent === 'LLMCompleteResponseReceivedEvent')).toBe(true);

      const [message] = manager.getWorkingContextMessages();
      expect(message).toMatchObject({
        role: MessageRole.ASSISTANT,
        content: '',
        reasoning_content: reasoning,
      });
      expect(getWorkingContextMessageProvenance(message!)).toEqual({
        kind: 'single',
        turnId,
        rawTraceIds: traces.map((trace) => trace.id),
      });
    } finally {
      remove();
    }
  });

  it('persists reasoning before separate ordinary assistant content with shared identity', () => {
    const { manager, remove } = makeManager();
    try {
      const turnId = manager.startTurn();
      manager.ingestAssistantResponse(
        new CompleteResponse({ content: 'Final answer', reasoning: 'Private analysis' }),
        turnId,
        'LlmPhaseInterruptedPartial',
      );

      const traces = manager.listTurnRawTracesOrdered();
      expect(traces.map((trace) => trace.traceType)).toEqual(['reasoning', 'assistant']);
      expect(traces.map((trace) => trace.content)).toEqual(['Private analysis', 'Final answer']);
      expect(traces.map((trace) => trace.seq)).toEqual([1, 2]);
      expect(new Set(traces.map((trace) => trace.id)).size).toBe(2);
      expect(traces.every((trace) => trace.turnId === turnId)).toBe(true);
      expect(traces.every((trace) => trace.sourceEvent === 'LlmPhaseInterruptedPartial')).toBe(true);

      const [message] = manager.getWorkingContextMessages();
      expect(message).toMatchObject({ content: 'Final answer', reasoning_content: 'Private analysis' });
      expect(getWorkingContextMessageProvenance(message!)).toEqual({
        kind: 'single',
        turnId,
        rawTraceIds: traces.map((trace) => trace.id),
      });
    } finally {
      remove();
    }
  });

  it('preserves reasoning, assistant, and tool-call order in one tool-response provenance record', () => {
    const { manager, remove } = makeManager();
    try {
      const turnId = manager.startTurn();
      manager.ingestAssistantToolResponse(
        new CompleteResponse({ content: 'I will search.', reasoning: 'Need current results.' }),
        [new ToolInvocation('search', { query: 'current' }, 'call-1', turnId)],
        turnId,
        'LLMCompleteResponseReceivedEvent',
      );

      const traces = manager.listTurnRawTracesOrdered();
      expect(traces.map((trace) => trace.traceType)).toEqual(['reasoning', 'assistant', 'tool_call']);
      expect(traces.map((trace) => trace.seq)).toEqual([1, 2, 3]);
      expect(traces.map((trace) => trace.content)).toEqual([
        'Need current results.',
        'I will search.',
        '',
      ]);
      expect(traces.map((trace) => trace.sourceEvent)).toEqual([
        'LLMCompleteResponseReceivedEvent',
        'LLMCompleteResponseReceivedEvent',
        'PendingToolInvocationEvent',
      ]);
      expect(traces.every((trace) => trace.turnId === turnId)).toBe(true);
      expect(new Set(traces.map((trace) => trace.id)).size).toBe(3);

      const [message] = manager.getWorkingContextMessages();
      expect(message).toMatchObject({
        role: MessageRole.ASSISTANT,
        content: 'I will search.',
        reasoning_content: 'Need current results.',
      });
      expect(message?.tool_payload).toBeInstanceOf(ToolCallPayload);
      expect(getWorkingContextMessageProvenance(message!)).toEqual({
        kind: 'single',
        turnId,
        rawTraceIds: traces.map((trace) => trace.id),
      });
    } finally {
      remove();
    }
  });
});
