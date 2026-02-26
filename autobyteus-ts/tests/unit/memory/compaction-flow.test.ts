import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { CompactionPolicy } from '../../../src/memory/policies/compaction-policy.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';

class FakeSummarizer extends Summarizer {
  summarize(): CompactionResult {
    return new CompactionResult('Summary', [
      { fact: 'Fact A', tags: ['decision'], confidence: 0.9 },
      { fact: 'Fact B', tags: [], confidence: 0.5 }
    ]);
  }
}

describe('Compactor compaction flow', () => {
  it('stores episodic/semantic items and prunes raw traces', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compaction-flow-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_1');
      const policy = new CompactionPolicy({ rawTailTurns: 1 });
      const compactor = new Compactor(store, policy, new FakeSummarizer());

      store.add([
        new RawTraceItem({
          id: 'rt_1',
          ts: Date.now() / 1000,
          turnId: 'turn_0001',
          seq: 1,
          traceType: 'user',
          content: 'hi',
          sourceEvent: 'LLMUserMessageReadyEvent'
        }),
        new RawTraceItem({
          id: 'rt_2',
          ts: Date.now() / 1000,
          turnId: 'turn_0002',
          seq: 1,
          traceType: 'user',
          content: 'later',
          sourceEvent: 'LLMUserMessageReadyEvent'
        })
      ]);

      const result = compactor.compact(['turn_0001']);
      expect(result).not.toBeNull();

      const episodicItems = store.list(MemoryType.EPISODIC);
      const semanticItems = store.list(MemoryType.SEMANTIC);

      expect(episodicItems).toHaveLength(1);
      expect(episodicItems[0].summary).toBe('Summary');

      expect(semanticItems).toHaveLength(2);
      expect(semanticItems[0]).toBeInstanceOf(SemanticItem);
      expect(semanticItems[0].fact).toBe('Fact A');

      const remainingRaw = store.listRawTraceDicts();
      expect(remainingRaw).toHaveLength(1);
      expect(remainingRaw[0].turn_id).toBe('turn_0002');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('returns null when no turns provided', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compaction-flow-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_1');
      const policy = new CompactionPolicy({ rawTailTurns: 1 });
      const compactor = new Compactor(store, policy, new FakeSummarizer());

      const result = compactor.compact([]);
      expect(result).toBeNull();
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
