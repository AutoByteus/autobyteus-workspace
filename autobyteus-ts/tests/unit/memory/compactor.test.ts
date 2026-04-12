import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Compactor } from '../../../src/memory/compaction/compactor.js';
import { CompactionPlan } from '../../../src/memory/compaction/compaction-plan.js';
import { CompactionResult } from '../../../src/memory/compaction/compaction-result.js';
import { Summarizer } from '../../../src/memory/compaction/summarizer.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import type { InteractionBlock } from '../../../src/memory/compaction/interaction-block.js';

class NoopSummarizer extends Summarizer {
  async summarize(): Promise<CompactionResult> {
    return new CompactionResult('Summary', {
      durableFacts: [{ fact: 'Use vitest.' }],
    });
  }
}

class FailSummarizer extends Summarizer {
  async summarize(): Promise<CompactionResult> {
    throw new Error('summarizer failed');
  }
}

const makeTrace = (id: string, turnId: string, seq: number, traceType = 'user', content = '') =>
  new RawTraceItem({
    id,
    ts: Date.now() / 1000,
    turnId,
    seq,
    traceType,
    content: content || `${id}-content`,
    sourceEvent: 'test'
  });

const makeBlock = (blockId: string, traces: RawTraceItem[]): InteractionBlock => ({
  blockId,
  turnId: traces[0]?.turnId ?? null,
  traceIds: traces.map((trace) => trace.id),
  traces,
  openingTraceId: traces[0]?.id ?? null,
  closingTraceId: traces.at(-1)?.id ?? null,
  blockKind: 'user',
  hasAssistantTrace: traces.some((trace) => trace.traceType === 'assistant'),
  toolCallIds: [],
  matchedToolCallIds: [],
  hasMalformedToolTrace: false,
  isStructurallyComplete: true,
  toolResultDigests: [],
});

const makePlan = (): CompactionPlan => {
  const eligibleTraces = [
    makeTrace('rt_1', 'turn_0001', 1, 'user', 'older user'),
    makeTrace('rt_2', 'turn_0001', 2, 'assistant', 'older assistant'),
  ];
  const frontierTraces = [makeTrace('rt_3', 'turn_0002', 1, 'user', 'frontier user')];
  const eligibleBlock = makeBlock('block_0001', eligibleTraces);
  const frontierBlock = makeBlock('block_0002', frontierTraces);
  frontierBlock.isStructurallyComplete = false;

  return new CompactionPlan({
    blocks: [eligibleBlock, frontierBlock],
    eligibleBlocks: [eligibleBlock],
    frontierBlocks: [frontierBlock],
    eligibleTraceIds: eligibleBlock.traceIds,
    frontierTraceIds: frontierBlock.traceIds,
    frontierStartBlockIndex: 1,
    activeTurnId: 'turn_0002',
  });
};

describe('Compactor', () => {
  it('persists compacted memory and prunes archived raw traces by trace id', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compactor-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_1');
      const compactor = new Compactor(store, new NoopSummarizer());
      const plan = makePlan();

      store.add([...plan.eligibleBlocks[0].traces, ...plan.frontierBlocks[0].traces]);

      const outcome = await compactor.compact(plan);
      expect(outcome).toMatchObject({
        selectedBlockCount: 1,
        compactedBlockCount: 1,
        rawTraceCount: 2,
        semanticFactCount: 1,
      });
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(1);
      const semanticItems = store.list(MemoryType.SEMANTIC);
      expect(semanticItems).toHaveLength(1);
      expect((semanticItems[0] as any).category).toBe('durable_fact');
      expect((store.list(MemoryType.RAW_TRACE) as RawTraceItem[]).map((item) => item.id)).toEqual(['rt_3']);
      expect(store.readArchiveRawTraces().map((item) => item.id)).toEqual(['rt_1', 'rt_2']);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('does not prune on summarizer failure', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'compactor-fail-'));
    try {
      const store = new FileMemoryStore(tempDir, 'agent_fail');
      const compactor = new Compactor(store, new FailSummarizer());
      const plan = makePlan();
      store.add([...plan.eligibleBlocks[0].traces, ...plan.frontierBlocks[0].traces]);

      await expect(compactor.compact(plan)).rejects.toThrow(/summarizer failed/);
      expect(store.list(MemoryType.EPISODIC)).toHaveLength(0);
      expect((store.list(MemoryType.RAW_TRACE) as RawTraceItem[]).map((item) => item.id)).toEqual(['rt_1', 'rt_2', 'rt_3']);
      expect(store.readArchiveRawTraces()).toEqual([]);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
