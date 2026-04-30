import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { RunMemoryFileStore } from '../../../src/memory/store/run-memory-file-store.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import {
  RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME,
  RAW_TRACES_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from '../../../src/memory/store/memory-file-names.js';

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'run-memory-file-store-'));
  tempDirs.add(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe('RunMemoryFileStore', () => {
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

  it('archives pruned raw traces with the shared archive file name', async () => {
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
    const archive = await fs.readFile(path.join(memoryDir, RAW_TRACES_ARCHIVE_MEMORY_FILE_NAME), 'utf-8');
    expect(archive).toContain('rt-remove');
  });
});
