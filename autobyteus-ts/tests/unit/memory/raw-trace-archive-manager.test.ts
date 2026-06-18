import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RawTraceArchiveManager } from '../../../src/memory/store/raw-trace-archive-manager.js';

const ROTATED_RAW_TRACE_FILE_NAME_PATTERN = /^raw_traces_\d{6}\.jsonl$/;

const tempDirs = new Set<string>();

const mkTempDir = async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'raw-trace-archive-manager-'));
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

describe('RawTraceArchiveManager', () => {
  it('creates direct rotated raw trace segment files and preserves manifest boundary authority', async () => {
    const memoryDir = await mkTempDir();
    const manager = new RawTraceArchiveManager(memoryDir);

    const result = manager.archiveRecords([
      { id: 'rt-1', ts: 1, turn_id: 'turn-1', seq: 1, trace_type: 'assistant', content: 'archived', source_event: 'test' },
    ], {
      boundaryType: 'provider_compaction_boundary',
      boundaryKey: 'codex:thread:boundary:full-key',
      boundaryTraceId: 'rt-marker',
      runtimeKind: 'CODEX',
      sourceEvent: 'codex.thread_compacted',
    });

    expect(result?.created).toBe(true);
    expect(result?.segment.file_name).toMatch(ROTATED_RAW_TRACE_FILE_NAME_PATTERN);
    expect(result?.segment.boundary_key).toBe('codex:thread:boundary:full-key');
    expect(await pathExists(path.join(memoryDir, result?.segment.file_name ?? ''))).toBe(true);
    expect(await pathExists(manager.getArchiveDirPath())).toBe(false);
    expect(await pathExists(manager.getManifestPath())).toBe(true);
    expect(await pathExists(manager.getOldArchiveManifestPath())).toBe(false);

    const manifest = manager.readManifest();
    expect(manifest.segments).toHaveLength(1);
    expect(manifest.segments[0]).toMatchObject({
      file_name: result?.segment.file_name,
      boundary_key: 'codex:thread:boundary:full-key',
      status: 'complete',
    });

    const replay = manager.archiveRecords([
      { id: 'rt-duplicate', ts: 2, turn_id: 'turn-1', seq: 2, trace_type: 'assistant', content: 'duplicate', source_event: 'test' },
    ], {
      boundaryType: 'provider_compaction_boundary',
      boundaryKey: 'codex:thread:boundary:full-key',
      boundaryTraceId: 'rt-marker',
      runtimeKind: 'CODEX',
      sourceEvent: 'codex.thread_compacted',
    });

    expect(replay?.created).toBe(false);
    expect(replay?.segment.file_name).toBe(result?.segment.file_name);
    expect(manager.readManifest().segments).toHaveLength(1);
  });

  it('reads old-layout complete archive segments through the old manifest fallback', async () => {
    const memoryDir = await mkTempDir();
    const manager = new RawTraceArchiveManager(memoryDir);
    await fs.mkdir(manager.getArchiveDirPath(), { recursive: true });
    await fs.writeFile(
      path.join(manager.getArchiveDirPath(), '000001_20260430T103015123Z_deadbeef.jsonl'),
      JSON.stringify({ id: 'rt-old', ts: 1, turn_id: 'turn-1', seq: 1, trace_type: 'user', content: 'old', source_event: 'test' }) + '\n',
      'utf-8',
    );
    await fs.writeFile(
      manager.getOldArchiveManifestPath(),
      JSON.stringify({
        schema_version: 1,
        next_segment_index: 2,
        segments: [{
          index: 1,
          file_name: '000001_20260430T103015123Z_deadbeef.jsonl',
          boundary_type: 'provider_compaction_boundary',
          boundary_key: 'old-boundary',
          archived_at: 1,
          record_count: 1,
          status: 'complete',
        }],
      }),
      'utf-8',
    );

    expect(manager.readCompleteArchiveRawTraceDicts().map((trace) => trace.id)).toEqual(['rt-old']);
  });

  it('ignores pending archive manifest segments during complete archive reads', async () => {
    const memoryDir = await mkTempDir();
    const manager = new RawTraceArchiveManager(memoryDir);
    await fs.writeFile(
      path.join(memoryDir, 'raw_traces_000001.jsonl'),
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
          file_name: 'raw_traces_000001.jsonl',
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
    await fs.writeFile(
      path.join(memoryDir, 'raw_traces_000001.jsonl'),
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
          file_name: 'raw_traces_000001.jsonl',
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
    expect(manifest.segments[0].file_name).toMatch(ROTATED_RAW_TRACE_FILE_NAME_PATTERN);
    expect(await pathExists(path.join(memoryDir, manifest.segments[0].file_name))).toBe(true);
    expect(manager.readCompleteArchiveRawTraceDicts().map((trace) => trace.id)).toEqual(['rt-settled']);
  });
});
