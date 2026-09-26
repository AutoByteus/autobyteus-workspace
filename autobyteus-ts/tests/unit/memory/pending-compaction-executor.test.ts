import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeHarness, summary, execution } from './direct-compaction-harness.js';
import { countCompactedMemoryRegions, collectMessageRawTraceIds } from '../../../src/memory/working-context-provenance.js';
import { WorkingContextSnapshotBootstrapper } from '../../../src/memory/restore/working-context-snapshot-bootstrapper.js';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
const harnesses: ReturnType<typeof makeHarness>[] = [];
const setup = () => { const h = makeHarness(); harnesses.push(h); return h; };
afterEach(() => { harnesses.splice(0).forEach((h) => h.dispose()); vi.restoreAllMocks(); });
describe('PendingCompactionExecutor direct path', () => {
  it('commits first/repeated summaries once, keeps the head/recent tail and creates no categories', async () => {
    const h = setup();
    await expect(h.executor.executeIfAuthorized(h.input)).resolves.toBe(true);
    expect(h.summarize).toHaveBeenCalledOnce();
    const first = h.manager.getWorkingContextMessages();
    expect(first[0].content).toBe('System'); expect(first.at(-1)?.content).toBe('ack-11');
    expect(countCompactedMemoryRegions(first)).toBe(1);
    expect(JSON.stringify(first)).not.toContain('request-0:');
    expect(h.manager.getPendingCompactionGate()).toEqual({ kind: 'none' });
    expect(h.emitStatus.mock.calls.at(-1)?.[0]).toMatchObject({ phase: 'completed', compaction_operation_id: h.operationId, summarizer_provider: 'fixture' });
    for (const file of ['episodic.jsonl', 'semantic.jsonl', 'compaction_lineage.jsonl']) expect(fs.existsSync(path.join(h.store.agentDir, file))).toBe(false);
    h.request();
    await h.executor.executeIfAuthorized({ ...h.input, turnId: 'execute-2' });
    expect(countCompactedMemoryRegions(h.manager.getWorkingContextMessages())).toBe(1);
    expect(h.summarize.mock.calls[1]?.[0].units.filter((u: any) => u.kind === 'compacted_memory')).toHaveLength(1);
    expect(h.store.listTurnRawTraceCorpusOrdered()).toHaveLength(12);
  });
  it('rejects generation failure without mutation and requires explicit distinct user retry', async () => {
    const h = setup(); const before = h.snapshotStore.read('agent');
    h.summarize.mockRejectedValueOnce(new Error('provider failed'));
    await expect(h.executor.executeIfAuthorized(h.input)).rejects.toThrow('provider failed');
    expect(h.snapshotStore.read('agent')).toEqual(before); expect(h.store.listTurnRawTracesOrdered()).toHaveLength(12);
    await expect(h.executor.executeIfAuthorized({ ...h.input, turnId: 'agent-retry', turnOrigin: 'agent' })).rejects.toThrow('user_retry_required');
    expect(h.summarize).toHaveBeenCalledOnce();
    await expect(h.executor.executeIfAuthorized({ ...h.input, turnId: 'user-retry' })).resolves.toBe(true);
  });
  it('cannot commit a late cancelled result', async () => {
    const h = setup(); const before = h.snapshotStore.read('agent');
    h.summarize.mockImplementationOnce(async () => { h.controller.abort(); return { summary, execution }; });
    await expect(h.executor.executeIfAuthorized(h.input)).rejects.toThrow();
    expect(h.snapshotStore.read('agent')).toEqual(before); expect(h.store.listTurnRawTracesOrdered()).toHaveLength(12);
  });
  it('treats postcommit prune/reporter failure as committed and restores from that same snapshot', async () => {
    const h = setup(); vi.spyOn(h.store, 'prunePreparedCompactionArchive').mockImplementation(() => { throw new Error('prune'); });
    h.emitStatus.mockImplementation(() => { throw new Error('report'); });
    await expect(h.executor.executeIfAuthorized(h.input)).resolves.toBe(true);
    expect(h.manager.hasPendingCompaction()).toBe(false); expect(h.store.listTurnRawTracesOrdered()).toHaveLength(12);
    const resumed = new MemoryManager({ store: h.store, workingContextSnapshotStore: h.snapshotStore, agentId: 'agent' });
    new WorkingContextSnapshotBootstrapper().bootstrap(resumed, '', { maxItemChars: null });
    expect(resumed.getWorkingContextMessages()).toEqual(h.manager.getWorkingContextMessages());
    expect(collectMessageRawTraceIds(resumed.getWorkingContextMessages()).length).toBeGreaterThan(0);
  });
});
