import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';

class ArchiveSummarizer extends Summarizer {
  summarize(): CompactionResult {
    return new CompactionResult('Archived summary', [
      { fact: 'Keep this', confidence: 0.8 }
    ]);
  }
}

const makeTrace = (turnId: string, seq: number) =>
  new RawTraceItem({
    id: `rt_${turnId}_${seq}`,
    ts: Date.now() / 1000,
    turnId,
    seq,
    traceType: 'user',
    content: `${turnId} message`,
    sourceEvent: 'LLMUserMessageReadyEvent'
  });

describe('Compaction archive flow', () => {
  it('archives pruned raw traces', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compaction-archive-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_archive');
      const policy = new CompactionPolicy({ rawTailTurns: 1 });
      const compactor = new Compactor(store, policy, new ArchiveSummarizer());

      store.add([makeTrace('turn_0001', 1), makeTrace('turn_0002', 1)]);

      const result = compactor.compact(['turn_0001']);
      expect(result).not.toBeNull();

      const remaining = store.listRawTraceDicts();
      expect(new Set(remaining.map((item) => item.turn_id))).toEqual(new Set(['turn_0002']));

      const archived = store.readArchiveRawTraces();
      expect(new Set(archived.map((item) => item.turn_id))).toEqual(new Set(['turn_0001']));

      const episodic = store.list(MemoryType.EPISODIC);
      const semantic = store.list(MemoryType.SEMANTIC);
      expect(episodic).toHaveLength(1);
      expect(semantic).toHaveLength(1);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
