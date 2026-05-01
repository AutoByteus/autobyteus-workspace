import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';
import { COMPACTED_MEMORY_SCHEMA_VERSION } from '../../../src/memory/store/compacted-memory-manifest.js';

describe('FileMemoryStore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-store-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('adds and lists raw traces in append order', () => {
    const store = new FileMemoryStore(tempDir, 'agent-1');
    const trace = new RawTraceItem({
      id: 'rt-1',
      ts: Date.now() / 1000,
      turnId: 'turn_0001',
      seq: 1,
      traceType: 'user',
      content: 'hello',
      sourceEvent: 'test'
    });

    store.add([trace]);
    const items = store.listRawTracesOrdered();
    expect(items).toHaveLength(1);
    expect(items[0].turnId).toBe('turn_0001');
    expect(items[0].content).toBe('hello');
    expect(Object.keys(items[0].toDict())).not.toContain('tags');
    expect(Object.keys(items[0].toDict())).not.toContain('tool_result_ref');
  });

  it('adds and lists episodic items', () => {
    const store = new FileMemoryStore(tempDir, 'agent-episodic');
    const item = new EpisodicItem({
      id: 'ep_0001',
      ts: Date.now() / 1000,
      turnIds: ['turn_0001', 'turn_0002'],
      summary: 'We discussed refactoring.',
      salience: 0.7
    });

    store.add([item]);
    const episodicItems = store.list(MemoryType.EPISODIC) as EpisodicItem[];

    expect(episodicItems).toHaveLength(1);
    expect(episodicItems[0].summary).toBe('We discussed refactoring.');
    expect(Object.keys(episodicItems[0].toDict())).not.toContain('tags');
  });

  it('adds and lists typed semantic items', () => {
    const store = new FileMemoryStore(tempDir, 'agent-semantic');
    const item = new SemanticItem({
      id: 'sem_0001',
      ts: Date.now() / 1000,
      category: 'user_preference',
      fact: 'Use pnpm exec vitest.',
      salience: 300
    });

    store.add([item]);
    const semanticItems = store.list(MemoryType.SEMANTIC) as SemanticItem[];

    expect(semanticItems).toHaveLength(1);
    expect(semanticItems[0].category).toBe('user_preference');
    expect(semanticItems[0].fact).toBe('Use pnpm exec vitest.');
  });

  it('replaces semantic items and persists the manifest', () => {
    const store = new FileMemoryStore(tempDir, 'agent-manifest');
    store.replaceSemanticItems([
      new SemanticItem({
        id: 'sem_1',
        ts: 100,
        category: 'critical_issue',
        fact: 'Critical bug remains open.',
        salience: 500,
      }),
      new SemanticItem({
        id: 'sem_2',
        ts: 101,
        category: 'important_artifact',
        fact: 'Implementation handoff saved at /tmp/implementation-handoff.md.',
        salience: 100,
      }),
    ]);
    store.writeCompactedMemoryManifest({
      schema_version: COMPACTED_MEMORY_SCHEMA_VERSION,
      last_reset_ts: 123,
    });

    const semanticItems = store.list(MemoryType.SEMANTIC) as SemanticItem[];
    expect(semanticItems).toHaveLength(2);
    expect(semanticItems[1].fact).toContain('/tmp/implementation-handoff.md');
    expect(Object.keys(semanticItems[1].toDict())).not.toContain('reference');
    expect(Object.keys(semanticItems[1].toDict())).not.toContain('tags');
    expect(store.readCompactedMemoryManifest()).toEqual({
      schema_version: COMPACTED_MEMORY_SCHEMA_VERSION,
      last_reset_ts: 123,
    });
  });

  it('respects list limits', () => {
    const store = new FileMemoryStore(tempDir, 'agent-limit');
    for (let i = 0; i < 3; i += 1) {
      const trace = new RawTraceItem({
        id: `rt_${i}`,
        ts: Date.now() / 1000,
        turnId: 'turn_0001',
        seq: i + 1,
        traceType: 'user',
        content: `msg ${i}`,
        sourceEvent: 'LLMUserMessageReadyEvent'
      });
      store.add([trace]);
    }

    const items = store.listRawTracesOrdered(2);
    expect(items).toHaveLength(2);
    expect(items[0].seq).toBe(2);
    expect(items[1].seq).toBe(3);
  });

  it('prunes raw traces by trace id without archiving when disabled', () => {
    const store = new FileMemoryStore(tempDir, 'agent-no-archive');
    const trace1 = new RawTraceItem({
      id: 'rt-1',
      ts: Date.now() / 1000,
      turnId: 'turn_0001',
      seq: 1,
      traceType: 'user',
      content: 'drop',
      sourceEvent: 'test'
    });
    const trace2 = new RawTraceItem({
      id: 'rt-2',
      ts: Date.now() / 1000,
      turnId: 'turn_0002',
      seq: 1,
      traceType: 'user',
      content: 'keep',
      sourceEvent: 'test'
    });

    store.add([trace1, trace2]);
    store.pruneRawTracesById(['rt-1'], false);

    const remaining = store.listRawTracesOrdered();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('rt-2');
    expect(store.readArchiveRawTraces()).toEqual([]);
  });

  it('prunes only the selected raw trace ids and archives removed items', () => {
    const store = new FileMemoryStore(tempDir, 'agent-2');
    const traces = [
      new RawTraceItem({
        id: 'rt-1',
        ts: Date.now() / 1000,
        turnId: 'turn_0001',
        seq: 1,
        traceType: 'user',
        content: 'keep same turn',
        sourceEvent: 'test'
      }),
      new RawTraceItem({
        id: 'rt-2',
        ts: Date.now() / 1000,
        turnId: 'turn_0001',
        seq: 2,
        traceType: 'assistant',
        content: 'drop same turn',
        sourceEvent: 'test'
      }),
      new RawTraceItem({
        id: 'rt-3',
        ts: Date.now() / 1000,
        turnId: 'turn_0002',
        seq: 1,
        traceType: 'assistant',
        content: 'keep other turn',
        sourceEvent: 'test'
      }),
    ];

    store.add(traces);
    store.pruneRawTracesById(['rt-2'], true);

    const remaining = store.listRawTracesOrdered().map((item) => item.id);
    expect(remaining).toEqual(['rt-1', 'rt-3']);

    const archive = store.readArchiveRawTraces();
    expect(archive.map((item) => item.id)).toEqual(['rt-2']);
  });

  it('supports flat team-member layout when agentRootSubdir is empty', () => {
    const teamMemberDir = path.join(tempDir, 'agent_teams', 'team_123', 'member_professor_abc');
    fs.mkdirSync(teamMemberDir, { recursive: true });

    const store = new FileMemoryStore(teamMemberDir, 'member_professor_abc', {
      agentRootSubdir: ''
    });
    const trace = new RawTraceItem({
      id: 'rt-flat-1',
      ts: Date.now() / 1000,
      turnId: 'turn_flat_0001',
      seq: 1,
      traceType: 'user',
      content: 'flat layout',
      sourceEvent: 'test'
    });

    store.add([trace]);

    expect(fs.existsSync(path.join(teamMemberDir, 'raw_traces.jsonl'))).toBe(true);
    expect(fs.existsSync(path.join(teamMemberDir, 'agents', 'member_professor_abc'))).toBe(false);
  });
});
