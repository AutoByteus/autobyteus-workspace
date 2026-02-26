import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

class TestSummarizer extends Summarizer {
  summarize(): CompactionResult {
    return new CompactionResult('Summary', [{ fact: 'tool flow preserved', confidence: 0.9 }]);
  }
}

const makeTrace = (options: {
  turnId: string;
  seq: number;
  traceType: string;
  content?: string;
  toolName?: string;
  toolCallId?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
}) =>
  new RawTraceItem({
    id: `rt_${options.turnId}_${options.seq}`,
    ts: Date.now() / 1000,
    turnId: options.turnId,
    seq: options.seq,
    traceType: options.traceType,
    content: options.content ?? '',
    sourceEvent: 'TestEvent',
    toolName: options.toolName ?? null,
    toolCallId: options.toolCallId ?? null,
    toolArgs: options.toolArgs ?? null,
    toolResult: options.toolResult ?? null
  });

describe('Memory compaction tool tail integration', () => {
  it('includes tool tail in snapshot', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-tail-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_compact_tool_tail');
      const policy = new CompactionPolicy({ rawTailTurns: 2, triggerRatio: 0.1 });
      const compactor = new Compactor(store, policy, new TestSummarizer());
      const memoryManager = new MemoryManager({ store, compactionPolicy: policy, compactor });

      const oldTurn = memoryManager.startTurn();
      store.add([
        makeTrace({ turnId: oldTurn, seq: 1, traceType: 'user', content: 'old user' }),
        makeTrace({ turnId: oldTurn, seq: 2, traceType: 'assistant', content: 'old assistant' })
      ]);

      const tailTurn = memoryManager.startTurn();
      store.add([
        makeTrace({ turnId: tailTurn, seq: 1, traceType: 'user', content: 'tail user' }),
        makeTrace({
          turnId: tailTurn,
          seq: 2,
          traceType: 'tool_call',
          toolName: 'write_file',
          toolCallId: 'call_1',
          toolArgs: { path: 'x.txt' }
        }),
        makeTrace({
          turnId: tailTurn,
          seq: 3,
          traceType: 'tool_result',
          toolName: 'write_file',
          toolCallId: 'call_1',
          toolResult: 'ok'
        }),
        makeTrace({ turnId: tailTurn, seq: 4, traceType: 'assistant', content: 'tail assistant' })
      ]);

      const currentTurn = memoryManager.startTurn();
      const currentUser = new LLMUserMessage({ content: 'Please respond with pong.' });
      memoryManager.ingestUserMessage(currentUser, currentTurn, 'LLMUserMessageReadyEvent');

      const assembler = new LLMRequestAssembler(memoryManager, new OpenAIChatRenderer());
      memoryManager.requestCompaction();

      const request = await assembler.prepareRequest(currentUser, currentTurn, 'System prompt');

      expect(request.didCompact).toBe(true);
      const snapshot = request.messages[1].content ?? '';
      expect(snapshot).toContain('[RECENT TURNS]');
      expect(snapshot).toContain('TOOL:');
      expect(snapshot).toContain('write_file');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
