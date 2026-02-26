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

class NoopSummarizer extends Summarizer {
  summarize(): CompactionResult {
    return new CompactionResult('', []);
  }
}

class FailSummarizer extends Summarizer {
  summarize(): CompactionResult {
    throw new Error('summarizer failed');
  }
}

describe('Compactor', () => {
  it('selects window excluding raw tail', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compactor-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_1');
      const policy = new CompactionPolicy({ rawTailTurns: 1 });
      const compactor = new Compactor(store, policy, new NoopSummarizer());

      for (const turnId of ['turn_0001', 'turn_0002', 'turn_0003']) {
        store.add([
          new RawTraceItem({
            id: `rt_${turnId}`,
            ts: Date.now() / 1000,
            turnId,
            seq: 1,
            traceType: 'user',
            content: 'hi',
            sourceEvent: 'LLMUserMessageReadyEvent'
          })
        ]);
      }

      const window = compactor.selectCompactionWindow();
      expect(window).toEqual(['turn_0001', 'turn_0002']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('filters traces by turn id', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compactor-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_1');
      const policy = new CompactionPolicy({ rawTailTurns: 1 });
      const compactor = new Compactor(store, policy, new NoopSummarizer());

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
          content: 'hello',
          sourceEvent: 'LLMUserMessageReadyEvent'
        })
      ]);

      const traces = compactor.getTracesForTurns(['turn_0002']);
      expect(traces).toHaveLength(1);
      expect(traces[0].turnId).toBe('turn_0002');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not prune on summarizer failure', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compactor-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_fail');
      const policy = new CompactionPolicy({ rawTailTurns: 1 });
      const compactor = new Compactor(store, policy, new FailSummarizer());

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
          content: 'hello',
          sourceEvent: 'LLMUserMessageReadyEvent'
        })
      ]);

      expect(() => compactor.compact(['turn_0001'])).toThrow(/summarizer failed/);

      const remaining = store.listRawTraceDicts();
      expect(new Set(remaining.map((item) => item.turn_id))).toEqual(new Set(['turn_0001', 'turn_0002']));

      const archive = store.readArchiveRawTraces();
      expect(archive).toEqual([]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
