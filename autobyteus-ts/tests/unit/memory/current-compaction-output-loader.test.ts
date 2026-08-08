import { describe, expect, it, vi } from 'vitest';
import type { CompactionLineageRecord } from '../../../src/memory/lineage/compaction-lineage-record.js';
import type { CompactionLineageStore } from '../../../src/memory/lineage/compaction-lineage-store.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { CurrentCompactionOutputLoader } from '../../../src/memory/projection/current-compaction-output-loader.js';
import type { MemoryStore } from '../../../src/memory/store/base-store.js';

const head: CompactionLineageRecord = {
  schemaVersion: 1,
  scope: { targetKind: 'agent_run', runId: 'run-1', memberId: null },
  compactionId: 'compaction-1',
  previousCompactionId: null,
  episodeIds: ['episode-1', 'episode-2'],
  semanticIds: ['semantic-1', 'semantic-2'],
  derivedAt: '2026-08-08T00:00:00.000Z',
  execution: {
    runtimeKind: 'autobyteus',
    provider: 'openai',
    model: 'test-model',
    selectionPolicyVersion: 1,
    promptContractVersion: 2,
  },
};

const episodes = head.episodeIds.map((id, index) => new EpisodicItem({
  id,
  ts: index + 1,
  summary: `Episode ${index + 1}`,
}));

const semantics = head.semanticIds.map((id, index) => new SemanticItem({
  id,
  ts: index + 1,
  category: 'durable_fact',
  fact: `Fact ${index + 1}`,
  salience: 200 - index,
}));

const makeHarness = (input: {
  lineageHead?: CompactionLineageRecord | null;
  episodeRows?: EpisodicItem[];
  semanticRows?: SemanticItem[];
} = {}) => {
  const lineageStore = {
    appendNext: vi.fn(),
    list: vi.fn(),
    readHead: vi.fn(() => input.lineageHead === undefined ? head : input.lineageHead),
  } as unknown as CompactionLineageStore;
  const rawArchiveAccess = vi.fn(() => {
    throw new Error('Current output loading must not access raw archives.');
  });
  const memoryStore = {
    findEpisodicItemsByIds: vi.fn(() => input.episodeRows ?? episodes),
    findSemanticItemsByIds: vi.fn(() => input.semanticRows ?? semantics),
    readArchiveRawTraces: rawArchiveAccess,
    listRawTraceCorpusOrdered: rawArchiveAccess,
  } as unknown as MemoryStore;
  return {
    lineageStore,
    memoryStore,
    rawArchiveAccess,
    loader: new CurrentCompactionOutputLoader(lineageStore, memoryStore),
  };
};

describe('CurrentCompactionOutputLoader', () => {
  it('loads the exact lineage-tail output bundle without consulting raw archives', () => {
    const harness = makeHarness();

    expect(harness.loader.loadCurrent()).toEqual({
      lineageHead: head,
      episodes: episodes.map(({ id, ts, summary, salience }) => ({ id, ts, summary, salience })),
      semantics: semantics.map(({ id, ts, category, fact, salience }) => ({
        id,
        ts,
        category,
        fact,
        salience,
      })),
    });
    expect(harness.memoryStore.findEpisodicItemsByIds).toHaveBeenCalledWith(head.episodeIds);
    expect(harness.memoryStore.findSemanticItemsByIds).toHaveBeenCalledWith(head.semanticIds);
    expect(harness.rawArchiveAccess).not.toHaveBeenCalled();
  });

  it('returns null for an empty lineage without reading outputs or raw archives', () => {
    const harness = makeHarness({ lineageHead: null });

    expect(harness.loader.loadCurrent()).toBeNull();
    expect(harness.memoryStore.findEpisodicItemsByIds).not.toHaveBeenCalled();
    expect(harness.memoryStore.findSemanticItemsByIds).not.toHaveBeenCalled();
    expect(harness.rawArchiveAccess).not.toHaveBeenCalled();
  });

  it.each([
    ['missing episode', { episodeRows: episodes.slice(0, 1) }],
    ['misordered episodes', { episodeRows: [...episodes].reverse() }],
    ['missing semantic', { semanticRows: semantics.slice(0, 1) }],
    ['misordered semantics', { semanticRows: [...semantics].reverse() }],
  ] as const)('rejects %s output membership without raw archive access', (_label, input) => {
    const harness = makeHarness(input);

    expect(() => harness.loader.loadCurrent()).toThrow(
      "Current compaction 'compaction-1' output rows do not match lineage membership.",
    );
    expect(harness.rawArchiveAccess).not.toHaveBeenCalled();
  });
});
