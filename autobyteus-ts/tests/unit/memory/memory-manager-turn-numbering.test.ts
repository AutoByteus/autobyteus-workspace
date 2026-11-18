/**
 * autobyteus-526 REQ-001 (AC-001): a native run's turn ids are unique across restores. A MemoryManager built over a run's
 * stored memory continues after the highest stored `turn_NNNN` (archived segments and the active file); a new run
 * starts at `turn_0001`. Ids that are not `turn_NNNN` (an explicit turn id) do not move the numbering.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryManager } from '../../../src/memory/memory-manager.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { FileMemoryStore } from '../../../src/memory/store/file-store.js';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true }); });

const memoryDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'memory-manager-turns-'));
  dirs.push(dir);
  return dir;
};
const trace = (turnId: string, seq: number) => new RawTraceItem({
  id: `rt_${turnId}_${seq}`, ts: seq, turnId, seq, traceType: 'user', content: `input of ${turnId}`, sourceEvent: 'test',
});
/** The run's memory store, as the agent factory builds it for an explicit memory folder. */
const storeOf = (dir: string) => new FileMemoryStore(dir, 'run-1', { agentRootSubdir: '' });
/** What a restore does: a new MemoryManager over the run's stored memory. */
const restore = (dir: string) => new MemoryManager({ store: storeOf(dir) });

describe('MemoryManager turn numbering across restores (autobyteus-526)', () => {
  it('a new run starts at turn_0001', () => {
    const manager = restore(memoryDir());
    expect(manager.startTurn()).toBe('turn_0001');
    expect(manager.startTurn()).toBe('turn_0002');
  });

  it('a restored run continues after its highest stored turn, archived segments included', () => {
    const dir = memoryDir();
    const store = storeOf(dir);
    store.add([trace('turn_0001', 1), trace('turn_0002', 2)]);
    store.pruneRawTracesById(['rt_turn_0002_2']); // turn_0002 now lives only in an archived segment
    store.add([trace('turn_0003', 3)]);
    expect(store.readArchiveRawTraces().map((record) => record.turn_id)).toEqual(['turn_0002']);
    expect(store.listTurnRawTracesOrdered().map((item) => item.turnId)).toEqual(['turn_0001', 'turn_0003']);

    expect(restore(dir).startTurn()).toBe('turn_0004');
  });

  it('a second restore continues again (turn_0004..turn_0005 stored → turn_0006)', () => {
    const dir = memoryDir();
    const first = restore(dir);
    for (let index = 0; index < 5; index += 1) first.store.add([trace(first.startTurn(), index + 1)]);
    expect(restore(dir).startTurn()).toBe('turn_0006');
  });

  it('the highest stored turn counts, not the last one; ids that are not turn_NNNN are ignored', () => {
    const dir = memoryDir();
    storeOf(dir).add([trace('turn_0012', 1), trace('turn_0003', 2), trace('explicit-turn-from-a-caller', 3), trace('turn_0099x', 4)]);
    expect(restore(dir).startTurn()).toBe('turn_0013');
  });
});
