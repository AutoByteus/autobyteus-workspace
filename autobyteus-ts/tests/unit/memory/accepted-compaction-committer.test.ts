import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeHarness } from './direct-compaction-harness.js';
import { RunMemoryFileStore } from '../../../src/memory/store/run-memory-file-store.js';
const harnesses: ReturnType<typeof makeHarness>[] = [];
const setup = () => { const h = makeHarness(); harnesses.push(h); return h; };
afterEach(() => { harnesses.splice(0).forEach((h) => h.dispose()); vi.restoreAllMocks(); });
describe('compaction durable commit boundary', () => {
  it.each(['archive', 'snapshot'] as const)('keeps old snapshot and active evidence on %s failure', async (fault) => {
    const h = setup(); const before = h.snapshotStore.read('agent'); const context = h.manager.getWorkingContext();
    const spy = fault === 'archive' ? vi.spyOn(h.store, 'prepareCompactionArchive') : vi.spyOn(h.snapshotStore, 'write');
    spy.mockImplementationOnce(() => { throw new Error(fault); });
    await expect(h.executor.executeIfAuthorized(h.input)).rejects.toThrow(fault);
    expect(h.snapshotStore.read('agent')).toEqual(before); expect(h.manager.getWorkingContext()).toEqual(context);
    expect(h.store.listTurnRawTracesOrdered()).toHaveLength(12);
    expect(h.emitStatus.mock.calls.at(-1)?.[0].phase).toBe('failed');
  });
  it('reuses a completed evidence copy after snapshot failure; prune protects committed retained evidence', async () => {
    const h = setup(); const files = new RunMemoryFileStore(h.store.agentDir);
    vi.spyOn(h.snapshotStore, 'write').mockImplementationOnce(() => { throw new Error('snapshot'); });
    await expect(h.executor.executeIfAuthorized(h.input)).rejects.toThrow();
    expect(files.readRawTraceArchiveManifest().segments).toHaveLength(1);
    expect(h.store.listTurnRawTracesOrdered()).toHaveLength(12);
    h.manager.authorizeCompactionRetry({ block: h.manager.getCompactionRecovery()!, userAdmissionId: 'fresh-B' });
    await h.executor.executeIfAuthorized(h.input);
    expect(files.readRawTraceArchiveManifest().segments).toHaveLength(1);
    expect(h.store.listTurnRawTraceCorpusOrdered()).toHaveLength(12);
    expect(h.store.listTurnRawTracesOrdered().at(-1)?.id).toBe('raw-11');
  });
  it('checks abort immediately before snapshot commit even after archive preparation', async () => {
    const h = setup(); const before = h.snapshotStore.read('agent');
    const prepare = h.store.prepareCompactionArchive.bind(h.store);
    vi.spyOn(h.store, 'prepareCompactionArchive').mockImplementation((ids) => { const archive = prepare(ids); h.controller.abort(); return archive; });
    await expect(h.executor.executeIfAuthorized(h.input)).rejects.toThrow();
    expect(h.snapshotStore.read('agent')).toEqual(before); expect(h.store.listTurnRawTracesOrdered()).toHaveLength(12);
  });
  it('does not trust boundary identity when an existing completed archive lacks selected evidence', async () => {
    const h = setup(); const files = new RunMemoryFileStore(h.store.agentDir);
    vi.spyOn(h.snapshotStore, 'write').mockImplementationOnce(() => { throw new Error('snapshot'); });
    await expect(h.executor.executeIfAuthorized(h.input)).rejects.toThrow();
    const segment = files.readRawTraceArchiveManifest().segments[0]!;
    const segmentPath = files.getCompleteRawTraceArchiveSegmentPathByFileName(segment.file_name)!;
    fs.writeFileSync(segmentPath, '');
    const before = h.snapshotStore.read('agent');
    h.manager.authorizeCompactionRetry({ block: h.manager.getCompactionRecovery()!, userAdmissionId: 'fresh-B' });
    await expect(h.executor.executeIfAuthorized(h.input)).rejects.toThrow('every selected trace');
    expect(h.snapshotStore.read('agent')).toEqual(before);
    expect(h.store.listTurnRawTracesOrdered()).toHaveLength(12);
  });

});
