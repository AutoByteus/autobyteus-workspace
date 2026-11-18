/**
 * The memory JSONL line rule (jsonl-log-file.ts) on synthesized files: zero bytes on line edges and whole zero lines
 * are absent, a line with interior zeros is never a complete record, the damaged end is cut byte-exact, and other
 * damage is reported with its line number. All data is made by the test.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  JsonlLogDamagedError,
  jsonlLogEndsCleanly,
  readJsonlRecords,
  readLastJsonlRecord,
  repairJsonlDamagedEnd,
  scanJsonlRecordsFromStart,
  serializeJsonlRecords,
} from '../../../src/memory/store/jsonl-log-file.js';

const tempDirs: string[] = [];
const zeros = (count: number) => Buffer.alloc(count, 0);
const line = (record: Record<string, unknown>) => Buffer.from(`${JSON.stringify(record)}\n`, 'utf8');
const A = { id: 'a', trace_type: 'user', content: 'Größe – 日本語 ✓' };
const B = { id: 'b', trace_type: 'assistant', content: 'ünïcødé answer' };

const fileWith = (...parts: (Buffer | string)[]): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jsonl-log-file-'));
  tempDirs.push(dir);
  const filePath = path.join(dir, 'raw_traces_active.jsonl');
  fs.writeFileSync(filePath, Buffer.concat(parts.map((part) => typeof part === 'string' ? Buffer.from(part, 'utf8') : part)));
  return filePath;
};

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('readJsonlRecords', () => {
  it('reads an intact file completely', () => {
    const filePath = fileWith(line(A), line(B));
    expect(readJsonlRecords(filePath)).toEqual({
      records: [A, B],
      completeByteLength: fs.statSync(filePath).size,
      damagedEndByteLength: 0,
      endsWithNewline: true,
    });
  });

  it('reads a missing file and an empty file as empty', () => {
    const empty = { records: [], completeByteLength: 0, damagedEndByteLength: 0, endsWithNewline: true };
    expect(readJsonlRecords(path.join(os.tmpdir(), 'jsonl-log-file-missing', 'none.jsonl'))).toEqual(empty);
    expect(readJsonlRecords(fileWith(''))).toEqual(empty);
  });

  it('treats a zero-filled end after non-ASCII records as the damaged end, measured in bytes', () => {
    const prefix = Buffer.concat([line(A), line(B)]);
    const result = readJsonlRecords(fileWith(prefix, zeros(1241)));
    expect(result.records).toEqual([A, B]);
    expect(result.completeByteLength).toBe(prefix.length);
    expect(result.damagedEndByteLength).toBe(1241);
    expect(result.endsWithNewline).toBe(true);
  });

  it.each([
    ['without a newline', '{"id":"c","trace_type":"assist'],
    ['with a newline', '{"id":"c","trace_type":"assist\n'],
  ])('treats a torn last record %s as the damaged end', (_label, torn) => {
    const prefix = Buffer.concat([line(A), line(B)]);
    const result = readJsonlRecords(fileWith(prefix, torn));
    expect(result.records).toEqual([A, B]);
    expect(result.completeByteLength).toBe(prefix.length);
    expect(result.damagedEndByteLength).toBe(Buffer.byteLength(torn));
  });

  it('keeps records whose edges carry zeros, and zero-only lines between records', () => {
    const result = readJsonlRecords(fileWith(zeros(3), line(A), zeros(5), '\n', ' ', zeros(2), line(B)));
    expect(result.records).toEqual([A, B]);
    expect(result.damagedEndByteLength).toBe(0);
  });

  it('cuts trailing empty, whitespace-only and zero-only lines with the damaged end', () => {
    const prefix = Buffer.concat([line(A), line(B)]);
    const result = readJsonlRecords(fileWith(prefix, '\n  \n', zeros(4), '\n', zeros(2)));
    expect(result.records).toEqual([A, B]);
    expect(result.completeByteLength).toBe(prefix.length);
    expect(result.damagedEndByteLength).toBe(3 + 1 + 4 + 1 + 2);
  });

  it('accepts a complete last record whose newline never landed', () => {
    const lastRecord = JSON.stringify(B);
    const result = readJsonlRecords(fileWith(line(A), lastRecord, zeros(7)));
    expect(result.records).toEqual([A, B]);
    expect(result.completeByteLength).toBe(line(A).length + Buffer.byteLength(lastRecord));
    expect(result.damagedEndByteLength).toBe(7);
    expect(result.endsWithNewline).toBe(false);
  });

  it('reports a damaged line before the last non-empty line with its file and line number', () => {
    const filePath = fileWith(line(A), '{not json}\n', line(B));
    expect(() => readJsonlRecords(filePath)).toThrow(JsonlLogDamagedError);
    try {
      readJsonlRecords(filePath);
    } catch (error) {
      expect(error).toMatchObject({ filePath, lineNumber: 2, message: 'line 2 of raw_traces_active.jsonl is damaged' });
    }
  });

  it('reports a JSON line that is not an object as damage', () => {
    expect(() => readJsonlRecords(fileWith('[1,2]\n', line(B)))).toThrow('line 1 of raw_traces_active.jsonl is damaged');
  });

  it('never accepts a record with interior zeros: mid-file it is damage, as the last line it is the damaged end', () => {
    const shortened = Buffer.concat([Buffer.from('{"id":"a","content":"ab'), zeros(3), Buffer.from('cd"}\n')]);
    expect(() => readJsonlRecords(fileWith(shortened, line(B)))).toThrow('line 1 of raw_traces_active.jsonl is damaged');

    const last = readJsonlRecords(fileWith(line(B), shortened));
    expect(last.records).toEqual([B]);
    expect(last.damagedEndByteLength).toBe(shortened.length);
  });

  it('never accepts a zero run joining two records: mid-file it is damage, as the last line it is the damaged end', () => {
    const spliced = Buffer.concat([Buffer.from('{"id":"a","c":"x'), zeros(4), Buffer.from('y","ts":2}\n')]);
    expect(() => readJsonlRecords(fileWith(line(A), spliced, line(B)))).toThrow('line 2 of raw_traces_active.jsonl is damaged');

    const last = readJsonlRecords(fileWith(line(A), spliced));
    expect(last.records).toEqual([A]);
    expect(last.completeByteLength).toBe(line(A).length);
  });

  it('never changes the file', () => {
    const filePath = fileWith(line(A), zeros(100));
    const before = fs.readFileSync(filePath);
    readJsonlRecords(filePath);
    expect(fs.readFileSync(filePath).equals(before)).toBe(true);
  });
});

describe('repairJsonlDamagedEnd', () => {
  it('cuts the damaged end byte-exact and warns once with the file and bytes removed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const prefix = Buffer.concat([line(A), line(B)]);
    const filePath = fileWith(prefix, zeros(1241));

    expect(repairJsonlDamagedEnd(filePath)).toEqual([A, B]);
    expect(fs.readFileSync(filePath).equals(prefix)).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![1]).toEqual({ filePath, bytesRemoved: 1241, recordsKept: 2 });
  });

  it('cuts a torn record after non-ASCII content without leaving any of it', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const prefix = Buffer.concat([line(A), line(B)]);
    const filePath = fileWith(prefix, '{"id":"c","trace_type":"assist');
    repairJsonlDamagedEnd(filePath);
    expect(fs.readFileSync(filePath).equals(prefix)).toBe(true);
  });

  it('adds the newline a complete last record lacks', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const filePath = fileWith(line(A), JSON.stringify(B), zeros(3));
    expect(repairJsonlDamagedEnd(filePath)).toEqual([A, B]);
    expect(fs.readFileSync(filePath).equals(Buffer.concat([line(A), line(B)]))).toBe(true);
  });

  it('leaves an intact file alone without a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const filePath = fileWith(line(A), line(B));
    const before = fs.statSync(filePath);
    expect(repairJsonlDamagedEnd(filePath)).toEqual([A, B]);
    expect(fs.statSync(filePath).mtimeMs).toBe(before.mtimeMs);
    expect(warn).not.toHaveBeenCalled();
  });

  it('leaves mid-file damage untouched and reports it', () => {
    const filePath = fileWith(line(A), '{broken\n', line(B), zeros(10));
    const before = fs.readFileSync(filePath);
    expect(() => repairJsonlDamagedEnd(filePath)).toThrow(JsonlLogDamagedError);
    expect(fs.readFileSync(filePath).equals(before)).toBe(true);
  });
});

describe('jsonlLogEndsCleanly', () => {
  it('is true for a missing, empty or intact file', () => {
    expect(jsonlLogEndsCleanly(path.join(os.tmpdir(), 'jsonl-log-file-missing', 'none.jsonl'))).toBe(true);
    expect(jsonlLogEndsCleanly(fileWith(''))).toBe(true);
    expect(jsonlLogEndsCleanly(fileWith(line(A), line(B)))).toBe(true);
  });

  it('is true when the last record is longer than the checked tail but the file is intact', () => {
    const big = { id: 'big', trace_type: 'tool_result', content: 'x'.repeat(70 * 1024) };
    expect(jsonlLogEndsCleanly(fileWith(line(A), line(big), line(B)))).toBe(true);
    // A last line longer than the tail cannot be proven clean from the tail: the caller reads the whole file.
    expect(jsonlLogEndsCleanly(fileWith(line(A), line(big)))).toBe(false);
  });

  it.each([
    ['a zero-filled end', [line(A), zeros(20)]],
    ['a torn record without newline', [line(A), '{"id":"b"']],
    ['a torn record with newline', [line(A), '{"id":"b",\n']],
    ['a last record with interior zeros and a newline', [line(A), Buffer.from('{"id":"b","c":"x'), zeros(4), Buffer.from('y"}\n')]],
    ['a complete record without newline', [line(A), JSON.stringify(B)]],
  ] as const)('is false for %s', (_label, parts) => {
    expect(jsonlLogEndsCleanly(fileWith(...parts))).toBe(false);
  });
});

describe('serializeJsonlRecords', () => {
  it('writes one newline-terminated line per record and nothing for no records', () => {
    expect(serializeJsonlRecords([A, B])).toBe(`${JSON.stringify(A)}\n${JSON.stringify(B)}\n`);
    expect(serializeJsonlRecords([])).toBe('');
  });
});

describe('scanJsonlRecordsFromStart and readLastJsonlRecord (bounded, read-only)', () => {
  const big = (id: string) => ({ id, content: 'ü日本語✓'.repeat(9000) });

  it('visit records across chunk boundaries in order and stop when told to', () => {
    const records = [big('a'), { id: 'b' }, big('c'), big('d')];
    const filePath = fileWith(...records.map(line));
    const seen: string[] = [];
    scanJsonlRecordsFromStart(filePath, (record) => { seen.push(String(record.id)); return record.id !== 'c'; });
    expect(seen).toEqual(['a', 'b', 'c']);
    const all: unknown[] = [];
    scanJsonlRecordsFromStart(filePath, (record) => { all.push(record); return true; });
    expect(all).toEqual(records);
  });

  it('count a last record whose newline never landed, stop at a damaged line and leave the file untouched', () => {
    const noNewline = fileWith(line(A), JSON.stringify(B));
    const seen: unknown[] = [];
    scanJsonlRecordsFromStart(noNewline, (record) => { seen.push(record); return true; });
    expect(seen).toEqual([A, B]);
    const damaged = fileWith(line(A), '{"id":"cu');
    const before = fs.readFileSync(damaged);
    const visited: unknown[] = [];
    scanJsonlRecordsFromStart(damaged, (record) => { visited.push(record); return true; });
    expect(visited).toEqual([A]);
    expect(fs.readFileSync(damaged).equals(before)).toBe(true);
    expect(() => scanJsonlRecordsFromStart(path.join(os.tmpdir(), 'no-such-jsonl-file'), () => true)).not.toThrow();
  });

  it('read the last complete record, skipping zero bytes and a damaged end, growing the window for a long record', () => {
    expect(readLastJsonlRecord(fileWith(line(A), line(B)))).toEqual(B);
    expect(readLastJsonlRecord(fileWith(line(A), line(B), zeros(40)))).toEqual(B);
    expect(readLastJsonlRecord(fileWith(line(A), line(B), '{"id":"cu'))).toEqual(B);
    expect(readLastJsonlRecord(fileWith(line(A), line(big('long'))))).toEqual(big('long'));
    expect(readLastJsonlRecord(fileWith(''))).toBeNull();
    expect(readLastJsonlRecord(path.join(os.tmpdir(), 'no-such-jsonl-file'))).toBeNull();
  });
});
