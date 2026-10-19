/**
 * RunMemoryFileStore after an unclean shutdown, on synthesized run folders:
 * - AC-003: opening a log for use cuts its damaged end byte-exact and warns; an intact log is left alone.
 * - AC-004: an append never joins a damaged end, with or without a prior read; nothing appended is lost.
 * - AC-007: whole-file rewrites (rotation, archive segment and manifest, snapshot) sync before they rename.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryType, type MemoryItem } from '../../../src/memory/models/memory-types.js';
import { RawTraceItem } from '../../../src/memory/models/raw-trace-item.js';
import { RunMemoryFileStore } from '../../../src/memory/store/run-memory-file-store.js';
import { WorkingContextSnapshotStore } from '../../../src/memory/store/working-context-snapshot-store.js';

const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const runDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-memory-damaged-end-'));
  tempDirs.push(dir);
  return dir;
};

const trace = (id: string, ts: number, traceType: string, content: string) => new RawTraceItem({
  id, ts, turnId: 'turn-1', seq: ts, traceType, content, sourceEvent: 'test',
});

const episodic = (id: string): MemoryItem => ({
  memoryType: MemoryType.EPISODIC,
  toDict: () => ({ id, summary: `summary ${id}` }),
});

const silenceWarnings = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

/** A run log with two complete non-ASCII records, as a store wrote it before the shutdown. */
const writeIntactLog = (dir: string): Buffer => {
  const store = new RunMemoryFileStore(dir);
  store.appendRawTrace(trace('rt-1', 1, 'user', 'Bitte die Größe prüfen – 日本語'));
  store.appendRawTrace(trace('rt-2', 2, 'assistant', 'Erledigt ✓'));
  return fs.readFileSync(store.getRawTracesPath());
};

const damageEnd = (filePath: string, damage: Buffer | string) => fs.appendFileSync(filePath, damage);

const ids = (records: Record<string, unknown>[]) => records.map((record) => record.id);

describe('RunMemoryFileStore damaged end', () => {
  it.each([
    ['a zero-filled end', Buffer.alloc(1241, 0)],
    ['a torn last record', '{"id":"rt-3","trace_type":"tool_call","content":"Größ'],
  ])('cuts %s exactly when the log is opened for use and warns (AC-003)', (_label, damage) => {
    const warn = silenceWarnings();
    const dir = runDir();
    const prefix = writeIntactLog(dir);
    const store = new RunMemoryFileStore(dir);
    damageEnd(store.getRawTracesPath(), damage);

    expect(ids(new RunMemoryFileStore(dir).listRawTraceDicts())).toEqual(['rt-1', 'rt-2']);
    expect(fs.readFileSync(store.getRawTracesPath()).equals(prefix)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![1]).toMatchObject({
      filePath: store.getRawTracesPath(),
      bytesRemoved: Buffer.byteLength(damage),
    });
  });

  it('leaves an intact log unchanged and logs nothing (AC-003)', () => {
    const warn = silenceWarnings();
    const dir = runDir();
    const before = writeIntactLog(dir);
    const filePath = new RunMemoryFileStore(dir).getRawTracesPath();
    const mtime = fs.statSync(filePath).mtimeMs;

    expect(ids(new RunMemoryFileStore(dir).listRawTraceDicts())).toEqual(['rt-1', 'rt-2']);
    expect(fs.readFileSync(filePath).equals(before)).toBe(true);
    expect(fs.statSync(filePath).mtimeMs).toBe(mtime);
    expect(warn).not.toHaveBeenCalled();
  });

  it('keeps every record appended after a damaged end without any prior read (AC-004)', () => {
    silenceWarnings();
    const dir = runDir();
    writeIntactLog(dir);
    const writer = new RunMemoryFileStore(dir);
    damageEnd(writer.getRawTracesPath(), Buffer.alloc(600, 0));

    writer.appendRawTrace(trace('rt-3', 3, 'user', 'weiter'));
    writer.appendRawTrace(trace('rt-4', 4, 'assistant', 'Gerne – weiter geht es'));
    writer.appendRawTrace(trace('rt-5', 5, 'tool_call', 'call'));

    expect(ids(new RunMemoryFileStore(dir).listRawTraceDicts())).toEqual(['rt-1', 'rt-2', 'rt-3', 'rt-4', 'rt-5']);
    expect(fs.readFileSync(writer.getRawTracesPath()).includes(0)).toBe(false);
  });

  it('keeps an append after a torn last record that did get its newline (AC-004)', () => {
    silenceWarnings();
    const dir = runDir();
    writeIntactLog(dir);
    const writer = new RunMemoryFileStore(dir);
    damageEnd(writer.getRawTracesPath(), '{"id":"rt-x","trace_type":"tool_res\n');

    writer.appendRawTrace(trace('rt-3', 3, 'user', 'weiter'));

    expect(ids(new RunMemoryFileStore(dir).listRawTraceDicts())).toEqual(['rt-1', 'rt-2', 'rt-3']);
  });

  it('starts an append on its own line after a complete record whose newline never landed (AC-004)', () => {
    silenceWarnings();
    const dir = runDir();
    writeIntactLog(dir);
    const writer = new RunMemoryFileStore(dir);
    damageEnd(writer.getRawTracesPath(), `${JSON.stringify(trace('rt-3', 3, 'assistant', 'kein Zeilenende').toDict())}`);

    writer.appendRawTrace(trace('rt-4', 4, 'user', 'weiter'));

    expect(ids(new RunMemoryFileStore(dir).listRawTraceDicts())).toEqual(['rt-1', 'rt-2', 'rt-3', 'rt-4']);
  });

  it('checks each memory file of the store separately (AC-004)', () => {
    silenceWarnings();
    const dir = runDir();
    writeIntactLog(dir);
    const writer = new RunMemoryFileStore(dir);
    writer.add([episodic('ep-1')]);
    damageEnd(writer.getFilePath(MemoryType.EPISODIC), Buffer.alloc(50, 0));
    const second = new RunMemoryFileStore(dir);
    second.appendRawTrace(trace('rt-3', 3, 'user', 'weiter'));
    second.add([episodic('ep-2')]);

    const reader = new RunMemoryFileStore(dir);
    expect(ids(reader.readMemoryDicts(MemoryType.EPISODIC))).toEqual(['ep-1', 'ep-2']);
    expect(ids(reader.listRawTraceDicts())).toEqual(['rt-1', 'rt-2', 'rt-3']);
  });

  it('keeps a system-instruction record appended after a damaged end (AC-004)', () => {
    silenceWarnings();
    const dir = runDir();
    writeIntactLog(dir);
    const store = new RunMemoryFileStore(dir);
    damageEnd(store.getRawTracesPath(), Buffer.alloc(30, 0));

    const result = store.recordSystemInstructionSupply('You are helpful.', 10);
    store.appendRawTrace(trace('rt-3', 11, 'user', 'weiter'));

    expect(result.created).toBe(true);
    expect(ids(new RunMemoryFileStore(dir).listRawTraceDicts())).toEqual(['rt-1', 'rt-2', result.trace.id, 'rt-3']);
  });

  it('refuses to append onto mid-file damage, leaves the file unchanged, and checks again next time', () => {
    const dir = runDir();
    writeIntactLog(dir);
    const store = new RunMemoryFileStore(dir);
    fs.writeFileSync(store.getRawTracesPath(), Buffer.concat([
      fs.readFileSync(store.getRawTracesPath()), Buffer.from('{broken\n'), Buffer.from('{"id":"rt-x"}\n'), Buffer.alloc(8, 0),
    ]));
    const before = fs.readFileSync(store.getRawTracesPath());

    expect(() => store.appendRawTrace(trace('rt-3', 3, 'user', 'weiter'))).toThrow('line 3 of raw_traces_active.jsonl is damaged');
    expect(() => store.appendRawTrace(trace('rt-3', 3, 'user', 'weiter'))).toThrow('line 3 of raw_traces_active.jsonl is damaged');
    expect(fs.readFileSync(store.getRawTracesPath()).equals(before)).toBe(true);
  });
});

describe('RunMemoryFileStore whole-file rewrites (AC-007)', () => {
  const recordFsCalls = () => {
    const fsync = vi.spyOn(fs, 'fsyncSync');
    const rename = vi.spyOn(fs, 'renameSync');
    return () => {
      const events = [
        ...fsync.mock.invocationCallOrder.map((order) => ({ order, name: 'fsync' })),
        ...rename.mock.invocationCallOrder.map((order, index) => ({
          order, name: `rename:${path.basename(String(rename.mock.calls[index]![1]))}`,
        })),
      ].sort((a, b) => a.order - b.order);
      return events.map((event) => event.name);
    };
  };

  it('syncs the archive segment, manifest and rewritten active log before each rename', () => {
    const dir = runDir();
    const store = new RunMemoryFileStore(dir);
    store.appendRawTrace(trace('rt-1', 1, 'user', 'eins'));
    store.appendRawTrace(trace('rt-2', 2, 'assistant', 'zwei'));
    const events = recordFsCalls();

    expect(store.rotateActiveRawTracesBeforeBoundary({
      boundaryType: 'provider_compaction_boundary', boundaryKey: 'k', boundaryTraceId: 'rt-2',
    })).not.toBeNull();

    const renames = events().filter((name) => name.startsWith('rename:'));
    expect(renames).toEqual([
      'rename:raw_traces_manifest.json',
      expect.stringMatching(/^rename:raw_traces_\d{6}\.jsonl$/),
      'rename:raw_traces_manifest.json',
      'rename:raw_traces_active.jsonl',
    ]);
    // Every rename is preceded by the sync of its temporary file and followed by the folder sync.
    expect(events()).toEqual(renames.flatMap((name) => ['fsync', name, 'fsync']));
    expect(new RunMemoryFileStore(dir).readCompleteRawTraceCorpusDicts().map((record) => record.id)).toEqual(['rt-1', 'rt-2']);
  });

  it('syncs the working-context snapshot before it replaces the old one', () => {
    const dir = runDir();
    const events = recordFsCalls();
    new RunMemoryFileStore(dir).writeWorkingContextSnapshot({ messages: [] });
    new WorkingContextSnapshotStore(dir, 'agent-1').write('agent-1', { messages: [] });
    expect(events()).toEqual([
      'fsync', 'rename:working_context_snapshot.json', 'fsync',
      'fsync', 'rename:working_context_snapshot.json', 'fsync',
    ]);
  });
});
