import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { RunMemoryFileStore } from '../../../src/memory/store/run-memory-file-store.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import {
  RAW_TRACES_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from '../../../src/memory/store/memory-file-names.js';

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'run-memory-file-store-'));
  tempDirs.add(dir);
  return dir;
};

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

const rawTrace = (input: {
  id: string;
  ts: number;
  seq: number;
  traceType: string;
  content: string;
  correlationId?: string;
}) => new RawTraceItem({
  id: input.id,
  ts: input.ts,
  turnId: 'turn-1',
  seq: input.seq,
  traceType: input.traceType,
  content: input.content,
  sourceEvent: 'test',
  correlationId: input.correlationId,
});

describe('RunMemoryFileStore', () => {
  it('does not create a missing run directory for read-only complete-corpus reads', async () => {
    const rootDir = await mkTempDir();
    const missingRunDir = path.join(rootDir, 'missing-run');
    const store = new RunMemoryFileStore(missingRunDir);

    expect(store.readCompleteRawTraceCorpusDicts()).toEqual([]);
    expect(store.getRawTraceArchiveRevisionInfo()).toBeNull();
    expect(await pathExists(missingRunDir)).toBe(false);
  });

  it('owns standard raw-trace and snapshot file IO for a direct memory directory', async () => {
    const memoryDir = await mkTempDir();
    const store = new RunMemoryFileStore(memoryDir);

    store.appendRawTrace(new RawTraceItem({
      id: 'rt-1',
      ts: 1,
      turnId: 'turn-1',
      seq: 1,
      traceType: 'user',
      content: 'hello',
      sourceEvent: 'test',
    }));
    store.writeWorkingContextSnapshotState(new WorkingContextSnapshot(), { agentId: 'agent-1' });

    expect(store.getRawTracesPath()).toBe(path.join(memoryDir, RAW_TRACES_MEMORY_FILE_NAME));
    expect(store.getWorkingContextSnapshotPath()).toBe(path.join(memoryDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME));
    expect(store.listRawTracesOrdered()).toEqual([
      expect.objectContaining({ id: 'rt-1', traceType: 'user', content: 'hello' }),
    ]);
    expect(store.readWorkingContextSnapshot()).toMatchObject({ agent_id: 'agent-1' });
    expect(store.readWorkingContextSnapshotState()?.snapshot.buildMessages()).toEqual([]);
  });

  it('archives pruned raw traces with the shared segmented archive manifest', async () => {
    const memoryDir = await mkTempDir();
    const store = new RunMemoryFileStore(memoryDir);
    store.appendRawTrace(new RawTraceItem({
      id: 'rt-remove',
      ts: 1,
      turnId: 'turn-1',
      seq: 1,
      traceType: 'user',
      content: 'remove',
      sourceEvent: 'test',
    }));
    store.appendRawTrace(new RawTraceItem({
      id: 'rt-keep',
      ts: 2,
      turnId: 'turn-1',
      seq: 2,
      traceType: 'assistant',
      content: 'keep',
      sourceEvent: 'test',
    }));

    store.pruneRawTracesById(['rt-remove']);

    expect(store.listRawTraceDicts().map((trace) => trace.id)).toEqual(['rt-keep']);
    expect(store.listArchiveRawTracesOrdered()).toEqual([
      expect.objectContaining({ id: 'rt-remove', traceType: 'user' }),
    ]);
    const manifest = store.readRawTraceArchiveManifest();
    expect(manifest.segments).toHaveLength(1);
    expect(manifest.segments[0]).toMatchObject({ boundary_type: 'native_compaction', status: 'complete', record_count: 1 });
    expect(store.readCompleteArchiveRawTraceDicts().map((trace) => trace.id)).toEqual(['rt-remove']);
  });

  it('rotates active traces before a provider boundary marker and keeps complete corpus ordered', async () => {
    const memoryDir = await mkTempDir();
    const store = new RunMemoryFileStore(memoryDir);
    store.appendRawTrace(new RawTraceItem({
      id: 'rt-before',
      ts: 1,
      turnId: 'turn-1',
      seq: 1,
      traceType: 'assistant',
      content: 'before',
      sourceEvent: 'test',
    }));
    store.appendRawTrace(new RawTraceItem({
      id: 'rt-marker',
      ts: 2,
      turnId: 'turn-1',
      seq: 2,
      traceType: 'provider_compaction_boundary',
      content: 'marker',
      sourceEvent: 'COMPACTION_STATUS',
    }));
    store.appendRawTrace(new RawTraceItem({
      id: 'rt-after',
      ts: 3,
      turnId: 'turn-1',
      seq: 3,
      traceType: 'assistant',
      content: 'after',
      sourceEvent: 'test',
    }));

    store.rotateActiveRawTracesBeforeBoundary({
      boundaryType: 'provider_compaction_boundary',
      boundaryKey: 'codex:thread:boundary',
      boundaryTraceId: 'rt-marker',
      runtimeKind: 'CODEX',
      sourceEvent: 'codex.thread_compacted',
    });

    expect(store.listRawTraceDicts().map((trace) => trace.id)).toEqual(['rt-marker', 'rt-after']);
    expect(store.readCompleteArchiveRawTraceDicts().map((trace) => trace.id)).toEqual(['rt-before']);
    expect(store.readCompleteRawTraceCorpusDicts().map((trace) => trace.id)).toEqual([
      'rt-before',
      'rt-marker',
      'rt-after',
    ]);
  });

  it('keeps active plus archive complete when the same boundary is replayed after post-boundary records', async () => {
    const memoryDir = await mkTempDir();
    const store = new RunMemoryFileStore(memoryDir);
    store.appendRawTrace(rawTrace({ id: 'rt-before', ts: 1, seq: 1, traceType: 'assistant', content: 'before' }));
    store.appendRawTrace(rawTrace({
      id: 'rt-marker-1',
      ts: 2,
      seq: 2,
      traceType: 'provider_compaction_boundary',
      content: 'marker 1',
      correlationId: 'codex:thread:boundary',
    }));

    store.rotateActiveRawTracesBeforeBoundary({
      boundaryType: 'provider_compaction_boundary',
      boundaryKey: 'codex:thread:boundary',
      boundaryTraceId: 'rt-marker-1',
      runtimeKind: 'CODEX',
      sourceEvent: 'codex.thread_compacted',
    });

    store.appendRawTrace(rawTrace({ id: 'rt-after', ts: 3, seq: 3, traceType: 'assistant', content: 'after' }));
    store.appendRawTrace(rawTrace({
      id: 'rt-marker-2',
      ts: 4,
      seq: 4,
      traceType: 'provider_compaction_boundary',
      content: 'marker 2',
      correlationId: 'codex:thread:boundary',
    }));

    store.rotateActiveRawTracesBeforeBoundary({
      boundaryType: 'provider_compaction_boundary',
      boundaryKey: 'codex:thread:boundary',
      boundaryTraceId: 'rt-marker-2',
      runtimeKind: 'CODEX',
      sourceEvent: 'codex.thread_compacted',
    });

    expect(store.readRawTraceArchiveManifest().segments).toHaveLength(1);
    expect(store.listRawTraceDicts().map((trace) => trace.id)).toEqual([
      'rt-marker-1',
      'rt-after',
      'rt-marker-2',
    ]);
    expect(store.readCompleteRawTraceCorpusDicts().map((trace) => trace.id)).toEqual([
      'rt-before',
      'rt-marker-1',
      'rt-after',
      'rt-marker-2',
    ]);
  });

});
