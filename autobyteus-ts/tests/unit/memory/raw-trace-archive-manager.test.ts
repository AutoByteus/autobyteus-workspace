import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RawTraceArchiveManager } from '../../../src/memory/store/raw-trace-archive-manager.js';

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'raw-trace-archive-manager-'));
  tempDirs.add(dir);
  return dir;
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe('RawTraceArchiveManager', () => {
  it('ignores pending archive manifest segments during complete archive reads', async () => {
    const memoryDir = await mkTempDir();
    const manager = new RawTraceArchiveManager(memoryDir);
    await fs.mkdir(manager.getArchiveDirPath(), { recursive: true });
    await fs.writeFile(
      path.join(manager.getArchiveDirPath(), '000001_20260430T103015123Z_deadbeef.jsonl'),
      JSON.stringify({ id: 'rt-pending', ts: 1, turn_id: 'turn-1', seq: 1, trace_type: 'user', content: 'pending', source_event: 'test' }) + '\n',
      'utf-8',
    );
    await fs.writeFile(
      manager.getManifestPath(),
      JSON.stringify({
        schema_version: 1,
        next_segment_index: 2,
        segments: [{
          index: 1,
          file_name: '000001_20260430T103015123Z_deadbeef.jsonl',
          boundary_type: 'provider_compaction_boundary',
          boundary_key: 'pending',
          archived_at: 1,
          record_count: 1,
          status: 'pending',
        }],
      }),
      'utf-8',
    );

    expect(manager.readCompleteArchiveRawTraceDicts()).toEqual([]);
  });

  it('supersedes stale pending entries when retrying archive creation for the same boundary', async () => {
    const memoryDir = await mkTempDir();
    const manager = new RawTraceArchiveManager(memoryDir);
    await fs.mkdir(manager.getArchiveDirPath(), { recursive: true });
    await fs.writeFile(
      path.join(manager.getArchiveDirPath(), '000001_20260430T103015123Z_deadbeef.jsonl'),
      JSON.stringify({ id: 'rt-pending', ts: 1, turn_id: 'turn-1', seq: 1, trace_type: 'user', content: 'pending', source_event: 'test' }) + '\n',
      'utf-8',
    );
    await fs.writeFile(
      manager.getManifestPath(),
      JSON.stringify({
        schema_version: 1,
        next_segment_index: 2,
        segments: [{
          index: 1,
          file_name: '000001_20260430T103015123Z_deadbeef.jsonl',
          boundary_type: 'provider_compaction_boundary',
          boundary_key: 'boundary-1',
          archived_at: 1,
          record_count: 1,
          status: 'pending',
        }],
      }),
      'utf-8',
    );

    const result = manager.archiveRecords([
      { id: 'rt-settled', ts: 1, turn_id: 'turn-1', seq: 1, trace_type: 'assistant', content: 'settled', source_event: 'test' },
    ], {
      boundaryType: 'provider_compaction_boundary',
      boundaryKey: 'boundary-1',
      boundaryTraceId: 'rt-marker',
      runtimeKind: 'CODEX',
      sourceEvent: 'codex.thread_compacted',
    });

    expect(result?.created).toBe(true);
    const manifest = manager.readManifest();
    expect(manifest.segments).toHaveLength(1);
    expect(manifest.segments[0]).toMatchObject({
      boundary_key: 'boundary-1',
      status: 'complete',
      record_count: 1,
    });
    expect(manager.readCompleteArchiveRawTraceDicts().map((trace) => trace.id)).toEqual(['rt-settled']);
  });
});
