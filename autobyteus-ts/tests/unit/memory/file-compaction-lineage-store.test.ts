import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  COMPACTION_LINEAGE_CURRENT_PROMPT_CONTRACT_VERSION,
  COMPACTION_LINEAGE_SUPPORTED_PROMPT_CONTRACT_VERSIONS,
  type CompactionLineageRecord,
} from '../../../src/memory/lineage/compaction-lineage-record.js';
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

  it('appends a linear immutable chain in the contracted current shape', () => {
    expect(store.readHead()).toBeNull();
    store.appendNext(null, record(1, null));
    store.appendNext('c-1', record(2, 'c-1'));

    expect(store.list().map(({ compactionId }) => compactionId)).toEqual(['c-1', 'c-2']);
    expect(store.readHead()?.compactionId).toBe('c-2');
    const persisted = fs.readFileSync(path.join(dir, 'compaction_lineage.jsonl'), 'utf-8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(persisted).toHaveLength(2);
    expect(persisted.every((row) => !Object.hasOwn(row, 'rawTraceArchiveFile'))).toBe(true);
  });

  it.each([
    ['duplicate ID', () => store.appendNext('c-1', record(1, 'c-1'))],
    ['stale expected head', () => store.appendNext(null, record(2, null))],
    ['record predecessor mismatch', () => store.appendNext('c-1', record(2, null))],
    ['scope mismatch', () => store.appendNext('c-1', record(2, 'c-1', {
      scope: { targetKind: 'agent_run', runId: 'other', memberId: null },
    }))],
  ])('rejects %s without changing the append-only file', (_label, operation) => {
    store.appendNext(null, record(1, null));
    const file = path.join(dir, 'compaction_lineage.jsonl');
    const before = fs.readFileSync(file, 'utf-8');

    expect(operation).toThrow();
    expect(fs.readFileSync(file, 'utf-8')).toBe(before);
    expect(store.readHead()?.compactionId).toBe('c-1');
  });

  it('directly reads an old schema-version-1 JSON superset without rewriting it', () => {
    const oldRow = {
      ...record(1, null),
      rawTraceArchiveFile: 'raw_traces_archive/raw_traces_000001.jsonl',
    };
    const file = path.join(dir, 'compaction_lineage.jsonl');
    const persisted = `${JSON.stringify(oldRow)}\n`;
    fs.writeFileSync(file, persisted, 'utf-8');

    expect(store.readHead()).toEqual(record(1, null));
    expect(store.readHead()).not.toHaveProperty('rawTraceArchiveFile');
    expect(fs.readFileSync(file, 'utf-8')).toBe(persisted);
  });

  it('directly reads a mixed audit 1 -> 2 -> 3 chain and projects the exact current head', () => {
    const memoryStore = new FileMemoryStore(dir, scope.runId, { agentRootSubdir: '' });
    const predecessorEpisode = new EpisodicItem({
      id: 'episode-v1',
      ts: 1,
      summary: 'Immutable fixed-contract predecessor.',
    });
    const predecessorSemantic = new SemanticItem({
      id: 'semantic-v1',
      ts: 1,
      category: 'durable_fact',
      fact: 'Prompt audit one remains directly usable.',
      salience: 200,
    });
    const headEpisodes = Array.from({ length: 4 }, (_, index) => new EpisodicItem({
      id: `episode-v2-${index + 1}`,
      ts: 2,
      summary: `Natural phase ${index + 1}`,
    }));
    const headSemantics = Array.from({ length: 25 }, (_, index) => new SemanticItem({
      id: `semantic-v2-${index + 1}`,
      ts: 2,
      category: 'durable_fact',
      fact: `Natural continuation fact ${index + 1}`,
      salience: Math.max(1, 200 - index),
    }));
    memoryStore.add([
      predecessorEpisode,
      predecessorSemantic,
      ...headEpisodes,
      ...headSemantics,
    ]);
    store.appendNext(null, record(1, null, {
      episodeIds: [predecessorEpisode.id],
      semanticIds: [predecessorSemantic.id],
      execution: {
        ...record(1, null).execution,
        promptContractVersion: 1,
      },
    }));
    store.appendNext('c-1', record(2, 'c-1', {
      episodeIds: headEpisodes.map(({ id }) => id),
      semanticIds: headSemantics.map(({ id }) => id),
      execution: {
        ...record(2, 'c-1').execution,
        promptContractVersion: 2,
      },
    }));
    store.appendNext('c-2', record(3, 'c-2', {
      episodeIds: headEpisodes.map(({ id }) => id),
      semanticIds: headSemantics.map(({ id }) => id),
      execution: {
        ...record(3, 'c-2').execution,
        promptContractVersion: 3,
      },
    }));

    expect(COMPACTION_LINEAGE_SUPPORTED_PROMPT_CONTRACT_VERSIONS).toEqual([1, 2, 3]);
    expect(COMPACTION_LINEAGE_CURRENT_PROMPT_CONTRACT_VERSION).toBe(3);
    expect(store.list().map(({ execution }) => execution.promptContractVersion))
      .toEqual([1, 2, 3]);
    expect(store.readHead()).toMatchObject({
      compactionId: 'c-3',
      previousCompactionId: 'c-2',
      episodeIds: headEpisodes.map(({ id }) => id),
      semanticIds: headSemantics.map(({ id }) => id),
      execution: { promptContractVersion: 3 },
    });
    const current = new CurrentCompactionOutputLoader(store, memoryStore).loadCurrent()!;
    expect(current.episodes).toHaveLength(4);
    expect(current.semantics).toHaveLength(25);
    const rendered = new CompactedMemoryContextProjector().project({
      systemPrompt: 'System',
      continuationMessages: [],
      bundle: current,
    }).buildMessages();
    expect(rendered[1]?.content).toContain('Natural phase 4');
    expect(rendered[1]?.content).toContain('Natural continuation fact 25');
    expect(rendered[1]?.content).not.toContain('Immutable fixed-contract predecessor');

    const file = path.join(dir, 'compaction_lineage.jsonl');
    const before = fs.readFileSync(file, 'utf-8');
    const unsupported = {
      ...record(4, 'c-3'),
      execution: {
        ...record(4, 'c-3').execution,
        promptContractVersion: 4,
      },
    } as unknown as CompactionLineageRecord;
    expect(() => store.appendNext('c-3', unsupported))
      .toThrow('Unsupported compaction selection or prompt contract version');
    expect(fs.readFileSync(file, 'utf-8')).toBe(before);
    expect(store.readHead()?.compactionId).toBe('c-3');
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
