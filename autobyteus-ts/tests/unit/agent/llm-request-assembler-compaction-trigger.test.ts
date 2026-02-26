import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LLMRequestAssembler } from '../../../src/agent/llm-request-assembler.js';
import { BasePromptRenderer } from '../../../src/llm/prompt-renderers/base-prompt-renderer.js';
import { MessageRole } from '../../../src/llm/utils/messages.js';
import { CompactionSnapshotBuilder } from '../../../src/memory/compaction-snapshot-builder.js';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

class TestRenderer extends BasePromptRenderer {
  async render(messages: any[]) {
    return messages.map((message) => ({ role: message.role, content: message.content }));
  }
}

class TestSummarizer {
  summarize() {
    return new CompactionResult('Summary', []);
  }
}

describe('LLMRequestAssembler compaction trigger', () => {
  it('compacts when requested and resets working context snapshot', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-assembler-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_trigger');
      const policy = new CompactionPolicy({ triggerRatio: 0.5, rawTailTurns: 1 });
      const manager = new MemoryManager({ store, compactionPolicy: policy });
      manager.compactor = new Compactor(store, policy, new TestSummarizer() as any);

      store.add([
        new RawTraceItem({
          id: 'rt_1',
          ts: Date.now() / 1000,
          turnId: 'turn_0001',
          seq: 1,
          traceType: 'user',
          content: 'old',
          sourceEvent: 'LLMUserMessageReadyEvent'
        }),
        new RawTraceItem({
          id: 'rt_2',
          ts: Date.now() / 1000,
          turnId: 'turn_0002',
          seq: 1,
          traceType: 'user',
          content: 'newer',
          sourceEvent: 'LLMUserMessageReadyEvent'
        })
      ]);

      const assembler = new LLMRequestAssembler(
        manager,
        new TestRenderer(),
        new CompactionSnapshotBuilder()
      );
      manager.requestCompaction();

      const request = await assembler.prepareRequest('current input', 'turn_0003', 'System prompt');

      expect(request.didCompact).toBe(true);
      expect(manager.workingContextSnapshot.epochId).toBe(2);
      expect(request.messages.slice(0, 2).map((message) => message.role)).toEqual([
        MessageRole.SYSTEM,
        MessageRole.USER
      ]);
      expect(request.messages[1].content).toContain('[MEMORY:EPISODIC]');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
