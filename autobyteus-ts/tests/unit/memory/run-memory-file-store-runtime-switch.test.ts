/**
 * The raw-trace operations of an agent runtime switch on synthesized run folders: the archive step with its watermark
 * (first attempt, repeated call, failed commit then retry, interrupted rewrite), the removal of what a failed attempt wrote,
 * and the two bounded read-only reads. All data is made by the test.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { RunMemoryFileStore } from '../../../src/memory/store/run-memory-file-store.js';

const KEY = 'runtime_switch:run-1:switch-a';
const tempDirs: string[] = [];

const runDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-switch-store-'));
  tempDirs.push(dir);
  return dir;
};
afterEach(() => { for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

let clock = 1;
const trace = (id: string, extra: Partial<ConstructorParameters<typeof RawTraceItem>[0]> = {}) => new RawTraceItem({
  id, ts: clock++, turnId: 'turn_0001', seq: clock, traceType: 'assistant', content: id, sourceEvent: 'test', ...extra,
});
const marker = (key = KEY, id = 'marker-a') => trace(id, {
  traceType: 'system_task_notification', turnId: 'runtime_switch', senderId: 'system.runtime_handover', correlationId: key, content: 'switched',
}).toDict();
const boundary = (key = KEY) => ({ boundaryType: 'runtime_switch' as const, boundaryKey: key, runtimeKind: 'claude_agent_sdk', sourceEvent: 'runtime_switch' });
const ids = (store: RunMemoryFileStore) => store.listRawTraceDicts().map((item) => item.id);
const seed = (store: RunMemoryFileStore, ...names: string[]) => names.forEach((name) => store.appendRawTrace(trace(name)));

describe('rotateActiveRawTracesForRuntimeSwitch', () => {
  it('archives the records through the watermark and starts the active file with the marker, keeping the candidate\'s records', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'r1', 'r2');
    const watermark = store.readLastActiveRawTraceId();
    seed(store, 'S');
    const segment = store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: watermark });
    expect(ids(store)).toEqual(['marker-a', 'S']);
    expect(store.readCompleteArchiveRawTraceDicts().map((item) => item.id)).toEqual(['r1', 'r2']);
    expect(segment).toMatchObject({ boundary_type: 'runtime_switch', boundary_key: KEY, boundary_trace_id: 'marker-a', runtime_kind: 'claude_agent_sdk', record_count: 2, status: 'complete' });
  });

  it('is idempotent: a repeated call, and a call after the commit failed, change nothing', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'r1');
    const watermark = store.readLastActiveRawTraceId();
    seed(store, 'S');
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: watermark });
    seed(store, 'T');
    // the retry takes a new watermark (the last record now), which is ignored because the segment exists
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: store.readLastActiveRawTraceId() });
    expect(ids(store)).toEqual(['marker-a', 'S', 'T']);
    expect(store.readRawTraceArchiveManifest().segments).toHaveLength(1);
    expect(store.readCompleteArchiveRawTraceDicts().map((item) => item.id)).toEqual(['r1']);
  });

  it('completes an interrupted rewrite: the segment exists, the active file still holds the archived records', () => {
    const dir = runDir();
    const store = new RunMemoryFileStore(dir);
    seed(store, 'r1', 'r2');
    const watermark = store.readLastActiveRawTraceId();
    seed(store, 'S');
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: watermark });
    // the process ended after the archive and before the rewrite: put the pre-rewrite active file back
    fs.writeFileSync(store.getRawTracesPath(), ['r1', 'r2', 'S'].map((id) => JSON.stringify(trace(id).toDict())).join('\n') + '\n');
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: watermark });
    expect(ids(store)).toEqual(['marker-a', 'S']);
    expect(store.readRawTraceArchiveManifest().segments).toHaveLength(1);
  });

  it('makes no segment when the previous era is empty, and the retry keeps the marker first', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'S');
    expect(store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: null })).toBeNull();
    expect(ids(store)).toEqual(['marker-a', 'S']);
    expect(store.readRawTraceArchiveManifest().segments).toHaveLength(0);
    seed(store, 'T');
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: store.readLastActiveRawTraceId() });
    expect(ids(store)).toEqual(['marker-a', 'S', 'T']);
  });

  it('archives only the previous agent\'s records on a second switch (the first marker is among them)', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'a1');
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: store.readLastActiveRawTraceId() });
    seed(store, 'b1');
    const second = 'runtime_switch:run-1:switch-b';
    const watermark = store.readLastActiveRawTraceId();
    seed(store, 'S2');
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(second), marker: marker(second, 'marker-b'), throughTraceId: watermark });
    expect(ids(store)).toEqual(['marker-b', 'S2']);
    expect(store.readCompleteArchiveRawTraceDicts().map((item) => item.id)).toEqual(['a1', 'marker-a', 'b1']);
  });

  it('refuses a watermark that is not in the active file and changes nothing', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'r1');
    expect(() => store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: 'unknown' })).toThrow(/watermark/);
    expect(ids(store)).toEqual(['r1']);
    expect(store.readRawTraceArchiveManifest().segments).toHaveLength(0);
  });

  it('refuses a marker that does not carry the boundary key', () => {
    const store = new RunMemoryFileStore(runDir());
    expect(() => store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker('other'), throughTraceId: null })).toThrow(/correlation/);
  });
});

describe('removeActiveRawTracesAfter', () => {
  it('removes what a failed attempt wrote after the watermark', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'r1', 'r2');
    const watermark = store.readLastActiveRawTraceId();
    seed(store, 'S', 'S2');
    expect(store.removeActiveRawTracesAfter(watermark, { unlessCorrelationId: KEY })).toBe(2);
    expect(ids(store)).toEqual(['r1', 'r2']);
  });

  it('removes everything for a null watermark (the file was empty when the attempt began)', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'S');
    expect(store.removeActiveRawTracesAfter(null, { unlessCorrelationId: KEY })).toBe(1);
    expect(ids(store)).toEqual([]);
  });

  it('does nothing once this switch\'s marker is in the file', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'r1');
    const watermark = store.readLastActiveRawTraceId();
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: watermark });
    seed(store, 'S');
    expect(store.removeActiveRawTracesAfter(watermark, { unlessCorrelationId: KEY })).toBe(0);
    expect(ids(store)).toEqual(['marker-a', 'S']);
  });

  it('still removes on a later switch, whose active file starts with an earlier switch\'s marker', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'a1');
    store.rotateActiveRawTracesForRuntimeSwitch({ boundary: boundary(), marker: marker(), throughTraceId: store.readLastActiveRawTraceId() });
    seed(store, 'b1');
    const watermark = store.readLastActiveRawTraceId();
    seed(store, 'S2');
    expect(store.removeActiveRawTracesAfter(watermark, { unlessCorrelationId: 'runtime_switch:run-1:switch-b' })).toBe(1);
    expect(ids(store)).toEqual(['marker-a', 'b1']);
  });

  it('removes nothing when a non-null watermark is not in the file', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'r1', 'S');
    expect(store.removeActiveRawTracesAfter('unknown', { unlessCorrelationId: KEY })).toBe(0);
    expect(ids(store)).toEqual(['r1', 'S']);
  });
});

describe('the bounded read-only reads', () => {
  it('readLastActiveRawTraceId reads a missing, an empty and a long file, and skips a damaged end without cutting it', () => {
    const store = new RunMemoryFileStore(runDir());
    expect(store.readLastActiveRawTraceId()).toBeNull();
    fs.writeFileSync(store.getRawTracesPath(), '');
    expect(store.readLastActiveRawTraceId()).toBeNull();
    for (let index = 0; index < 400; index += 1) store.appendRawTrace(trace(`r${index}`, { content: 'x'.repeat(1000) }));
    expect(store.readLastActiveRawTraceId()).toBe('r399');
    const size = fs.statSync(store.getRawTracesPath()).size;
    fs.appendFileSync(store.getRawTracesPath(), '{"id":"cut","trace_ty');
    expect(store.readLastActiveRawTraceId()).toBe('r399');
    expect(fs.statSync(store.getRawTracesPath()).size).toBeGreaterThan(size);
  });

  it('readLastActiveRawTraceId finds a last record larger than the first window', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'small');
    store.appendRawTrace(trace('big', { content: 'y'.repeat(200 * 1024) }));
    expect(store.readLastActiveRawTraceId()).toBe('big');
  });

  it('scanActiveRawTraces stops when the visitor says so and never writes', () => {
    const store = new RunMemoryFileStore(runDir());
    seed(store, 'r1', 'r2', 'r3');
    fs.appendFileSync(store.getRawTracesPath(), '{"id":"cut"');
    const before = fs.readFileSync(store.getRawTracesPath());
    const seen: string[] = [];
    store.scanActiveRawTraces((record) => { seen.push(String(record.id)); return record.id !== 'r2'; });
    expect(seen).toEqual(['r1', 'r2']);
    store.scanActiveRawTraces((record) => { seen.push(String(record.id)); return true; });
    expect(seen.slice(2)).toEqual(['r1', 'r2', 'r3']);
    expect(fs.readFileSync(store.getRawTracesPath()).equals(before)).toBe(true);
  });
});
