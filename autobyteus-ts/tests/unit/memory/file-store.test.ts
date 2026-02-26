import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { EpisodicItem } from '../../../src/memory/models/episodic-item.js';
import { SemanticItem } from '../../../src/memory/models/semantic-item.js';
import { MemoryType } from '../../../src/memory/models/memory-types.js';

describe('FileMemoryStore', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-store-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('adds and lists raw traces', () => {
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
    const items = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
    expect(items).toHaveLength(1);
    expect(items[0].turnId).toBe('turn_0001');
    expect(items[0].content).toBe('hello');
  });

  it('adds and lists episodic items', () => {
    const store = new FileMemoryStore(tempDir, 'agent-episodic');
    const item = new EpisodicItem({
      id: 'ep_0001',
      ts: Date.now() / 1000,
      turnIds: ['turn_0001', 'turn_0002'],
      summary: 'We discussed refactoring.',
      tags: ['project'],
      salience: 0.7
    });

    store.add([item]);
    const episodicItems = store.list(MemoryType.EPISODIC) as EpisodicItem[];

    expect(episodicItems).toHaveLength(1);
    expect(episodicItems[0].summary).toBe('We discussed refactoring.');
  });

  it('adds and lists semantic items', () => {
    const store = new FileMemoryStore(tempDir, 'agent-semantic');
    const item = new SemanticItem({
      id: 'sem_0001',
      ts: Date.now() / 1000,
      fact: 'Use pnpm exec vitest.',
      tags: ['preference'],
      confidence: 0.9,
      salience: 0.8
    });

    store.add([item]);
    const semanticItems = store.list(MemoryType.SEMANTIC) as SemanticItem[];

    expect(semanticItems).toHaveLength(1);
    expect(semanticItems[0].fact).toBe('Use pnpm exec vitest.');
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

    const items = store.list(MemoryType.RAW_TRACE, 2) as RawTraceItem[];
    expect(items).toHaveLength(2);
    expect(items[0].seq).toBe(2);
    expect(items[1].seq).toBe(3);
  });

  it('prunes raw traces without archiving when disabled', () => {
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
    store.pruneRawTraces(new Set(['turn_0002']), false);

    const remaining = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].turnId).toBe('turn_0002');

    const archivePath = path.join(tempDir, 'agents', 'agent-no-archive', 'raw_traces_archive.jsonl');
    expect(fs.existsSync(archivePath)).toBe(false);
  });

  it('prunes raw traces and archives removed items', () => {
    const store = new FileMemoryStore(tempDir, 'agent-2');
    const trace1 = new RawTraceItem({
      id: 'rt-1',
      ts: Date.now() / 1000,
      turnId: 'turn_0001',
      seq: 1,
      traceType: 'user',
      content: 'keep',
      sourceEvent: 'test'
    });
    const trace2 = new RawTraceItem({
      id: 'rt-2',
      ts: Date.now() / 1000,
      turnId: 'turn_0002',
      seq: 1,
      traceType: 'assistant',
      content: 'drop',
      sourceEvent: 'test'
    });

    store.add([trace1, trace2]);
    store.pruneRawTraces(new Set(['turn_0001']), true);

    const remaining = store.list(MemoryType.RAW_TRACE) as RawTraceItem[];
    expect(remaining).toHaveLength(1);
    expect(remaining[0].turnId).toBe('turn_0001');

    const archivePath = path.join(tempDir, 'agents', 'agent-2', 'raw_traces_archive.jsonl');
    const archiveContent = fs.readFileSync(archivePath, 'utf-8');
    expect(archiveContent).toContain('"turn_id":"turn_0002"');
  });
});
