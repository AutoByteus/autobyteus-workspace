import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

class TestSummarizer extends Summarizer {
  summarize(): CompactionResult {
    return new CompactionResult('Summary', []);
  }
}

const makeTrace = (turnId: string, seq: number, traceType = 'user') =>
  new RawTraceItem({
    id: `rt_${turnId}_${seq}`,
    ts: Date.now() / 1000,
    turnId,
    seq,
    traceType,
    content: `${turnId}:${seq}`,
    sourceEvent: 'LLMUserMessageReadyEvent'
  });

describe('Raw trace rollover', () => {
  it('retains tail turn and appends new turn after compaction', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'raw-rollover-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_rollover');
      const policy = new CompactionPolicy({ rawTailTurns: 1 });
      const compactor = new Compactor(store, policy, new TestSummarizer());
      const manager = new MemoryManager({ store, compactionPolicy: policy, compactor });

      store.add([makeTrace('turn_0001', 1), makeTrace('turn_0002', 1), makeTrace('turn_0003', 1)]);

      const window = compactor.selectCompactionWindow();
      expect(window).toEqual(['turn_0001', 'turn_0002']);
      compactor.compact(window);

      const remaining = store.listRawTraceDicts();
      expect(new Set(remaining.map((item) => item.turn_id))).toEqual(new Set(['turn_0003']));

      const newTurn = manager.startTurn();
      expect(newTurn).not.toBe('turn_0003');
      manager.ingestUserMessage(
        { content: 'fresh', image_urls: [], audio_urls: [], video_urls: [] } as any,
        newTurn,
        'LLMUserMessageReadyEvent'
      );

      const updated = store.listRawTraceDicts();
      expect(new Set(updated.map((item) => item.turn_id))).toEqual(new Set(['turn_0003', newTurn]));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
