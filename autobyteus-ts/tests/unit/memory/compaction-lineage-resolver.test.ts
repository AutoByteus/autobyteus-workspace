import { describe, expect, it } from 'vitest';
import type { CompactionLineageRecord } from '../../../src/memory/lineage/compaction-lineage-record.js';
import { CompactionLineageResolver } from '../../../src/memory/lineage/compaction-lineage-resolver.js';
import type { CompactionLineageScope } from '../../../src/memory/lineage/compaction-lineage-scope.js';
import type { CompactionLineageStore } from '../../../src/memory/lineage/compaction-lineage-store.js';
import { MemoryOriginIntegrityError } from '../../../src/memory/lineage/memory-origin-resolution.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import type { RawTraceArchiveSegmentEntry } from '../../../src/memory/store/raw-trace-archive-manifest.js';

const scope: CompactionLineageScope = {
  targetKind: 'team_member',
  runId: 'team-run',
  memberId: 'member-1',
};

const lineage = (
  id: string,
  previousCompactionId: string | null,
): CompactionLineageRecord => ({
  schemaVersion: 1,
  scope,
  compactionId: id,
  previousCompactionId,
  rawTraceArchiveFile: `raw_traces_archive/${id}.jsonl`,
  episodeIds: id === 'c2'
    ? Array.from({ length: 4 }, (_, index) =>
        `episode-${id}${index === 0 ? '' : `-${index + 1}`}`)
    : [`episode-${id}`],
  semanticIds: id === 'c2'
    ? Array.from({ length: 25 }, (_, index) =>
        `semantic-${id}${index === 0 ? '' : `-${index + 1}`}`)
    : [`semantic-${id}`],
  derivedAt: id === 'c1' ? '2026-07-30T10:00:00.000Z' : '2026-07-30T11:00:00.000Z',
  execution: {
    runtimeKind: 'autobyteus',
    provider: 'openai',
    model: 'current-model',
    selectionPolicyVersion: 1,
    promptContractVersion: id === 'c1' ? 1 : 2,
  },
});

const trace = (id: string, ts: number): RawTraceItem => new RawTraceItem({
  id,
  ts,
  turnId: `turn-${id}`,
  seq: 1,
  traceType: 'user',
  content: `source ${id}`,
  sourceEvent: 'UserMessageReceivedEvent',
});

const makeHarness = () => {
  const records = [lineage('c1', null), lineage('c2', 'c1')];
  const byFile = new Map([
    ['raw_traces_archive/c1.jsonl', [trace('raw-r1', 10)]],
    ['raw_traces_archive/c2.jsonl', [trace('raw-r2', 20)]],
  ]);
  const descriptors = new Map<string, RawTraceArchiveSegmentEntry>(
    [...byFile].map(([file, traces], index) => [file, {
      index: index + 1,
      file_name: file,
      boundary_type: 'native_compaction',
      boundary_key: records[index]!.compactionId,
      archived_at: 30,
      first_trace_id: traces[0]!.id,
      last_trace_id: traces.at(-1)!.id,
      first_ts: traces[0]!.ts,
      last_ts: traces.at(-1)!.ts,
      record_count: traces.length,
      status: 'complete',
    }]),
  );
  const episodes = records.flatMap((record) => record.episodeIds.map((id) => new EpisodicItem({
    id,
    ts: 30,
    summary: `episode ${id}`,
  })));
  const semantics = records.flatMap((record) => record.semanticIds.map((id) => new SemanticItem({
    id,
    ts: 30,
    category: 'durable_fact',
    fact: `fact ${id}`,
  })));
  const lineageStore: CompactionLineageStore = {
    appendNext: () => undefined,
    list: () => records,
    readHead: () => records.at(-1)!,
    getByCompactionId: (id) => records.find(({ compactionId }) => compactionId === id) ?? null,
    findProducingRecord: (artifact) => records.find((record) =>
      (artifact.kind === 'episode' ? record.episodeIds : record.semanticIds)
        .includes(artifact.id)) ?? null,
  };
  const archiveReader = {
    findCompleteSegmentByFileName: (file: string) => descriptors.get(file) ?? null,
    readCompleteSegmentRawTracesByFileName: (file: string) => byFile.get(file) ?? null,
  };
  const outputReader = {
    findEpisodicItemsByIds: (ids: readonly string[]) =>
      ids.flatMap((id) => episodes.filter((item) => item.id === id)),
    findSemanticItemsByIds: (ids: readonly string[]) =>
      ids.flatMap((id) => semantics.filter((item) => item.id === id)),
  };
  const resolver = new CompactionLineageResolver(
    scope,
    lineageStore,
    archiveReader,
    outputReader,
  );
  return {
    records,
    byFile,
    descriptors,
    episodes,
    semantics,
    lineageStore,
    archiveReader,
    outputReader,
    resolver,
  };
};

describe('CompactionLineageResolver', () => {
  it.each([
    ['episode', 'episode-c2-4'],
    ['semantic', 'semantic-c2-25'],
  ] as const)('resolves %s direct R2 sources and transitive R1/R2 roots', (kind, id) => {
    const { records, resolver } = makeHarness();

    const result = resolver.resolve({ kind, id });

    expect(result).toMatchObject({
      status: 'complete',
      scope,
      artifact: { kind, id },
      producingCompactionId: 'c2',
      direct: {
        rawTraceArchiveFile: 'raw_traces_archive/c2.jsonl',
        previousCompactionId: 'c1',
        rawSourceInterval: { firstObservedAt: 20, lastObservedAt: 20 },
      },
      rootSourceInterval: { firstObservedAt: 10, lastObservedAt: 20 },
      derivedAt: '2026-07-30T11:00:00.000Z',
    });
    if (result.status !== 'complete') throw new Error('expected complete');
    expect(result.direct.rawTraces.map(({ id: rawId }) => rawId)).toEqual(['raw-r2']);
    expect(result.roots.map(({ trace: root }) => root.id)).toEqual(['raw-r1', 'raw-r2']);
    expect(records.map(({ execution }) => execution.promptContractVersion)).toEqual([1, 2]);
  });

  it('returns a typed not_found result for unknown artifacts', () => {
    expect(makeHarness().resolver.resolve({ kind: 'semantic', id: 'missing' })).toEqual({
      status: 'not_found',
      scope,
      artifact: { kind: 'semantic', id: 'missing' },
    });
  });

  it.each([
    ['missing archive', (h: ReturnType<typeof makeHarness>) =>
      h.descriptors.delete('raw_traces_archive/c2.jsonl'), /missing or incomplete/],
    ['record-count mismatch', (h: ReturnType<typeof makeHarness>) => {
      h.descriptors.get('raw_traces_archive/c2.jsonl')!.record_count = 2;
    }, /record-count/],
    ['identity mismatch', (h: ReturnType<typeof makeHarness>) => {
      h.descriptors.get('raw_traces_archive/c2.jsonl')!.last_trace_id = 'wrong';
    }, /identity-bound/],
    ['missing output row', (h: ReturnType<typeof makeHarness>) =>
      h.episodes.splice(h.episodes.findIndex(({ id }) => id === 'episode-c2'), 1), /output rows/],
    ['missing predecessor', (h: ReturnType<typeof makeHarness>) =>
      h.records.splice(h.records.findIndex(({ compactionId }) => compactionId === 'c1'), 1), /missing previous/],
  ])('raises MemoryOriginIntegrityError for %s', (_label, mutate, message) => {
    const harness = makeHarness();
    mutate(harness);

    expect(() => harness.resolver.resolve({ kind: 'episode', id: 'episode-c2-4' }))
      .toThrow(MemoryOriginIntegrityError);
    expect(() => harness.resolver.resolve({ kind: 'episode', id: 'episode-c2-4' }))
      .toThrow(message);
  });

  it('detects a lineage cycle even when a backing adapter bypasses file-chain validation', () => {
    const harness = makeHarness();
    harness.records[0] = lineage('c1', 'c2');

    expect(() => harness.resolver.resolve({ kind: 'episode', id: 'episode-c2-4' }))
      .toThrow(/cycle detected/);
  });

  it('wraps backing lineage validation failures as integrity errors', () => {
    const harness = makeHarness();
    harness.lineageStore.findProducingRecord = () => {
      throw new Error('duplicate compaction IDs');
    };

    expect(() => harness.resolver.resolve({ kind: 'episode', id: 'episode-c2-4' }))
      .toThrow(MemoryOriginIntegrityError);
    expect(() => harness.resolver.resolve({ kind: 'episode', id: 'episode-c2-4' }))
      .toThrow(/failed validation.*duplicate/);
  });
});
