import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { RunMemoryFileStore } from '../../../src/memory/store/run-memory-file-store.js';
import { parseSystemInstructionTraceRecord } from '../../../src/memory/models/system-instruction-trace.js';

const tempDirs = new Set<string>();

const createStore = async (): Promise<RunMemoryFileStore> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'system-instruction-trace-'));
  tempDirs.add(dir);
  return new RunMemoryFileStore(dir);
};

afterEach(async () => {
  await Promise.all([...tempDirs].map((dir) => fs.rm(dir, { recursive: true, force: true })));
  tempDirs.clear();
});

describe('system instruction trace persistence', () => {
  it('writes exactly five keys and folds only consecutive active content', async () => {
    const store = await createStore();
    const first = store.recordSystemInstructionSupply('same\n  spacing', 10.5);
    const folded = store.recordSystemInstructionSupply('same\n  spacing', 11.5);
    const changed = store.recordSystemInstructionSupply('different', 12.5);
    const reverted = store.recordSystemInstructionSupply('same\n  spacing', 13.5);

    expect(first.created).toBe(true);
    expect(first.trace.id).toMatch(/^rt_10500_[0-9a-f-]{36}$/);
    expect(folded).toEqual({ trace: first.trace, created: false });
    expect(changed.created).toBe(true);
    expect(reverted.created).toBe(true);

    const rows = store.listRawTraceDicts();
    expect(rows).toHaveLength(3);
    expect(Object.keys(rows[0]!).sort()).toEqual(['content', 'id', 'source_event', 'trace_type', 'ts']);
    expect(rows[0]).toEqual({
      id: first.trace.id,
      ts: 10.5,
      trace_type: 'system_instruction',
      content: 'same\n  spacing',
      source_event: 'SYSTEM_INSTRUCTIONS_SUPPLIED',
    });
    expect(store.listTurnRawTracesOrdered()).toEqual([]);
    expect(() => store.recordSystemInstructionSupply('prompt', 0)).toThrow('positive finite');
    expect(parseSystemInstructionTraceRecord({ ...rows[0]!, extra: true })).toBeNull();
    expect(parseSystemInstructionTraceRecord({ ...rows[0]!, id: '   ' })).toBeNull();
  });

  it('archives physical system rows through the selected turn boundary and folds active-only', async () => {
    const store = await createStore();
    const first = store.recordSystemInstructionSupply('prompt', 1);
    store.appendRawTrace(new RawTraceItem({
      id: 'selected-turn-trace', ts: 2, turnId: 'turn-1', seq: 1,
      traceType: 'user', content: 'hello', sourceEvent: 'test',
    }));
    store.appendRawTrace(new RawTraceItem({
      id: 'kept-turn-trace', ts: 3, turnId: 'turn-2', seq: 1,
      traceType: 'user', content: 'later', sourceEvent: 'test',
    }));

    store.archiveCompactedRawTraces(['selected-turn-trace']);

    expect(store.listRawTraceDicts().map((row) => row.id)).toEqual(['kept-turn-trace']);
    expect(store.readCompleteArchiveRawTraceDicts().map((row) => row.id)).toEqual([
      first.trace.id,
      'selected-turn-trace',
    ]);
    const afterArchive = store.recordSystemInstructionSupply('prompt', 4);
    expect(afterArchive.created).toBe(true);
    expect(afterArchive.trace.id).not.toBe(first.trace.id);
  });
});
