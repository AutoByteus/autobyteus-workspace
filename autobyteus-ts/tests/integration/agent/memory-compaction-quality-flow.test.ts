import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { OpenAIChatRenderer } from '../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import { LLMUserMessage } from '../../../src/llm/user-message.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { PendingCompactionExecutor } from '../../../src/memory/compaction/pending-compaction-executor.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';

class TestSummarizer extends Summarizer {
  async summarize(blocks: any[]): Promise<CompactionResult> {
    const traces = blocks.flatMap((block) => block.traces ?? []) as RawTraceItem[];
    const summary = traces.map((trace) => trace.content).filter(Boolean).join(' | ');
    return new CompactionResult(summary || 'summary', {
      userPreferences: [{ fact: 'user wants pong' }],
    });
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

describe('Memory compaction quality integration', () => {
  it('captures episodic, semantic, and recent turns', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mem-compact-quality-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_compact_quality');
      const policy = new CompactionPolicy({ triggerRatio: 0.1 });
      const compactor = new Compactor(store, new TestSummarizer());
      const memoryManager = new MemoryManager({ store, compactionPolicy: policy, compactor });

      const turn0 = memoryManager.startTurn();
      store.add([
        makeTrace({ turnId: turn0, seq: 1, traceType: 'user', content: 'turn 0 user' }),
        makeTrace({ turnId: turn0, seq: 2, traceType: 'assistant', content: 'turn 0 assistant' })
      ]);

      const turn1 = memoryManager.startTurn();
      store.add([
        makeTrace({ turnId: turn1, seq: 1, traceType: 'user', content: 'turn 1 user' }),
        makeTrace({
          turnId: turn1,
          seq: 2,
          traceType: 'tool_call',
          toolName: 'write_file',
          toolCallId: 'call_1',
          toolArgs: { path: 'hello.py' }
        }),
        makeTrace({
          turnId: turn1,
          seq: 3,
          traceType: 'tool_result',
          toolName: 'write_file',
          toolCallId: 'call_1',
          toolResult: 'ok'
        }),
        makeTrace({ turnId: turn1, seq: 4, traceType: 'assistant', content: 'turn 1 assistant' })
      ]);

      const currentTurn = memoryManager.startTurn();
      const currentUser = new LLMUserMessage({ content: 'Please respond with pong.' });
      memoryManager.ingestUserMessage(currentUser, currentTurn, 'LLMUserMessageReadyEvent');

      const assembler = new LLMRequestAssembler(
        memoryManager,
        new OpenAIChatRenderer(),
        new PendingCompactionExecutor(memoryManager)
      );
      memoryManager.requestCompaction();

      const request = await assembler.prepareRequest(currentUser, currentTurn, 'System prompt');

      expect(request.didCompact).toBe(true);

      const episodicItems = store.list(MemoryType.EPISODIC) as EpisodicItem[];
      const semanticItems = store.list(MemoryType.SEMANTIC) as SemanticItem[];
      expect(episodicItems).toHaveLength(1);
      expect(episodicItems[0].summary).toContain('turn 0 user');
      expect(semanticItems).toHaveLength(1);
      expect(semanticItems[0].fact).toBe('user wants pong');
      expect(semanticItems[0].category).toBe('user_preference');

      const snapshot = request.messages[1].content ?? '';
      expect(snapshot).toContain('[MEMORY:EPISODIC]');
      expect(snapshot).toContain('turn 0 assistant');
      expect(snapshot).toContain('[MEMORY:USER_PREFERENCES]');
      expect(snapshot).toContain('user wants pong');
      expect(snapshot).toContain('[RAW_FRONTIER]');
      expect(snapshot).toContain('Please respond with pong.');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
