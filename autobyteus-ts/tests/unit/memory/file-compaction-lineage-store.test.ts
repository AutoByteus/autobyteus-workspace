import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { CompactionLineageRecord } from '../../../src/memory/lineage/compaction-lineage-record.js';
import type { CompactionLineageScope } from '../../../src/memory/lineage/compaction-lineage-scope.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { CompactedMemoryContextProjector } from '../../../src/memory/projection/compacted-memory-context-projector.js';
import { CurrentCompactionOutputLoader } from '../../../src/memory/projection/current-compaction-output-loader.js';
import { FileCompactionLineageStore } from '../../../src/memory/store/file-compaction-lineage-store.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

const scope: CompactionLineageScope = {
  targetKind: 'agent_run',
  runId: 'run-1',
  memberId: null,
};

const record = (
  index: number,
  previousCompactionId: string | null,
  overrides: Partial<CompactionLineageRecord> = {},
): CompactionLineageRecord => ({
  schemaVersion: 1,
  scope,
  compactionId: `c-${index}`,
  previousCompactionId,
  rawTraceArchiveFile: `raw_traces_archive/raw_traces_${String(index).padStart(6, '0')}.jsonl`,
  episodeIds: [`episode-${index}`],
  semanticIds: [`semantic-${index}`],
  derivedAt: '2026-07-30T12:00:00.000Z',
  execution: {
    runtimeKind: 'autobyteus',
    provider: 'openai',
    model: 'current-model',
    selectionPolicyVersion: 1,
    promptContractVersion: 1,
    renderedInputSha256: 'a'.repeat(64),
  },
  ...overrides,
});

describe('FileCompactionLineageStore', () => {
  let dir: string;
  let store: FileCompactionLineageStore;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lineage-store-'));
    store = new FileCompactionLineageStore(dir, scope);
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('appends a linear immutable chain and resolves typed producing records', () => {
    expect(store.readHead()).toBeNull();
    store.appendNext(null, record(1, null));
    store.appendNext('c-1', record(2, 'c-1'));

    expect(store.list().map(({ compactionId }) => compactionId)).toEqual(['c-1', 'c-2']);
    expect(store.readHead()?.compactionId).toBe('c-2');
    expect(store.getByCompactionId('c-1')?.previousCompactionId).toBeNull();
    expect(store.findProducingRecord({ kind: 'episode', id: 'episode-2' })?.compactionId)
      .toBe('c-2');
    expect(store.findProducingRecord({ kind: 'semantic', id: 'semantic-1' })?.compactionId)
      .toBe('c-1');
    expect(store.findProducingRecord({ kind: 'episode', id: 'missing' })).toBeNull();
  });

  it.each([
    ['duplicate ID', () => store.appendNext('c-1', record(1, 'c-1'))],
    ['stale expected head', () => store.appendNext(null, record(2, null))],
    ['record predecessor mismatch', () => store.appendNext('c-1', record(2, null))],
    ['scope mismatch', () => store.appendNext('c-1', record(2, 'c-1', {
      scope: { targetKind: 'agent_run', runId: 'other', memberId: null },
    }))],
    ['unsafe archive path', () => store.appendNext('c-1', record(2, 'c-1', {
      rawTraceArchiveFile: '../escape.jsonl',
    }))],
  ])('rejects %s without changing the append-only file', (_label, operation) => {
    store.appendNext(null, record(1, null));
    const file = path.join(dir, 'compaction_lineage.jsonl');
    const before = fs.readFileSync(file, 'utf-8');

    expect(operation).toThrow();
    expect(fs.readFileSync(file, 'utf-8')).toBe(before);
    expect(store.readHead()?.compactionId).toBe('c-1');
  });

  it('reads the exact tail after 1,000 recurrent appends without a mutable state pointer', () => {
    const memoryStore = new FileMemoryStore(dir, scope.runId, { agentRootSubdir: '' });
    let previous: string | null = null;
    for (let index = 1; index <= 1_000; index += 1) {
      memoryStore.add([
        new EpisodicItem({
          id: `episode-${index}`,
          ts: index,
          summary: `M${index} bounded episode`,
        }),
        new SemanticItem({
          id: `semantic-${index}`,
          ts: index,
          category: 'durable_fact',
          fact: `M${index} bounded fact`,
          salience: 200,
        }),
      ]);
      store.appendNext(previous, record(index, previous));
      previous = `c-${index}`;
    }

    expect(store.list()).toHaveLength(1_000);
    expect(store.readHead()).toMatchObject({
      compactionId: 'c-1000',
      previousCompactionId: 'c-999',
      episodeIds: ['episode-1000'],
      semanticIds: ['semantic-1000'],
    });
    expect(memoryStore.list(MemoryType.EPISODIC)).toHaveLength(1_000);
    expect(memoryStore.list(MemoryType.SEMANTIC)).toHaveLength(1_000);

    const current = new CurrentCompactionOutputLoader(store, memoryStore).loadCurrent()!;
    expect(current.episodes.map(({ summary }) => summary)).toEqual(['M1000 bounded episode']);
    expect(current.semantics.map(({ fact }) => fact)).toEqual(['M1000 bounded fact']);
    const rendered = new CompactedMemoryContextProjector().project({
      systemPrompt: 'System',
      continuationMessages: [],
      bundle: current,
    }).buildMessages();
    expect(rendered).toHaveLength(2);
    expect(rendered[1]?.content).toContain('M1000 bounded episode');
    expect(rendered[1]?.content).toContain('M1000 bounded fact');
    expect(rendered[1]?.content).not.toContain('M999 bounded episode');
    expect(JSON.stringify(rendered).length).toBeLessThan(2_000);
    expect(fs.existsSync(path.join(dir, 'compaction_state.json'))).toBe(false);
    expect(fs.existsSync(path.join(dir, 'compacted_memory_manifest.json'))).toBe(false);
  });

  it('rejects an externally corrupted non-linear file instead of selecting a plausible tail', () => {
    fs.writeFileSync(
      path.join(dir, 'compaction_lineage.jsonl'),
      `${JSON.stringify(record(1, null))}\n${JSON.stringify(record(2, null))}\n`,
      'utf-8',
    );

    expect(() => store.readHead()).toThrow(/does not continue/);
  });
});
