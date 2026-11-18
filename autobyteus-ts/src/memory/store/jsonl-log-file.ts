import fs from 'node:fs';
import path from 'node:path';

/**
 * The line rule of a run's memory JSONL logs (one JSON object per `\n`-terminated line).
 *
 * - Zero bytes (`0x00`) and whitespace at the start or end of a line, and lines made only of them, are absent:
 *   after a power loss a file can keep its new size without its data, and that removes nothing from any record.
 * - A line that still holds a zero byte between other bytes lost real bytes (or joins two records); it is never a
 *   complete record.
 * - The damaged end is everything after the last complete record's line when the last non-empty line is not a
 *   complete record (a record whose append never finished and/or zero bytes). Any other line that is not a
 *   complete record is damage that this rule never repairs: it is reported with its line number.
 *
 * All offsets are byte offsets into the file's `Buffer`; nothing is computed from decoded strings.
 */

const NEWLINE = 0x0a;
const TAIL_CHECK_BYTES = 64 * 1024;

const isAbsentByte = (byte: number): boolean =>
  byte === 0x00 || byte === 0x20 || byte === 0x09 || byte === 0x0d || byte === 0x0b || byte === 0x0c;

export class JsonlLogDamagedError extends Error {
  constructor(readonly filePath: string, readonly lineNumber: number) {
    super(`line ${lineNumber} of ${path.basename(filePath)} is damaged`);
    this.name = 'JsonlLogDamagedError';
  }
}

export type JsonlLogReadResult = {
  records: Record<string, unknown>[];
  /** Bytes to keep: up to and including the last complete record's line. */
  completeByteLength: number;
  /** Bytes after `completeByteLength` (the damaged end); 0 when the file ends cleanly. */
  damagedEndByteLength: number;
  /** Whether the kept prefix is empty or ends in `\n`, so the next append starts on a line of its own. */
  endsWithNewline: boolean;
};

const parseCompleteRecord = (line: Buffer): Record<string, unknown> | null => {
  if (line.includes(0x00)) return null;
  try {
    const parsed: unknown = JSON.parse(line.toString('utf8'));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
};

/** `trimmedEnd`: end of the line without its absent edge bytes; `end`: after its `\n` (or the end of the file). */
type ScannedLine = { trimmed: Buffer; trimmedEnd: number; end: number };

const splitLines = (bytes: Buffer): ScannedLine[] => {
  const lines: ScannedLine[] = [];
  let start = 0;
  while (start < bytes.length) {
    const newline = bytes.indexOf(NEWLINE, start);
    const end = newline === -1 ? bytes.length : newline + 1;
    let first = start;
    let last = newline === -1 ? bytes.length : newline;
    while (first < last && isAbsentByte(bytes[first]!)) first += 1;
    while (last > first && isAbsentByte(bytes[last - 1]!)) last -= 1;
    lines.push({ trimmed: bytes.subarray(first, last), trimmedEnd: last, end });
    start = end;
  }
  return lines;
};

const scanJsonlBytes = (bytes: Buffer, filePath: string): JsonlLogReadResult => {
  const lines = splitLines(bytes);
  let lastNonEmpty = -1;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index]!.trimmed.length > 0) {
      lastNonEmpty = index;
      break;
    }
  }
  const records: Record<string, unknown>[] = [];
  let completeByteLength = 0;
  for (let index = 0; index <= lastNonEmpty; index += 1) {
    const line = lines[index]!;
    if (line.trimmed.length === 0) continue;
    const record = parseCompleteRecord(line.trimmed);
    if (record) {
      records.push(record);
      // Keep the record's own `\n`; a record whose `\n` never landed ends right after the record.
      completeByteLength = bytes[line.end - 1] === NEWLINE ? line.end : line.trimmedEnd;
      continue;
    }
    if (index === lastNonEmpty) break;
    throw new JsonlLogDamagedError(filePath, index + 1);
  }
  return {
    records,
    completeByteLength,
    damagedEndByteLength: bytes.length - completeByteLength,
    endsWithNewline: completeByteLength === 0 || bytes[completeByteLength - 1] === NEWLINE,
  };
};

/** The whole-file form of records: one `\n`-terminated line each. */
export const serializeJsonlRecords = (records: readonly Record<string, unknown>[]): string =>
  records.map((record) => `${JSON.stringify(record)}\n`).join('');

/** Read-only. A missing file reads as empty; throws `JsonlLogDamagedError` for damage other than the damaged end. */
export const readJsonlRecords = (filePath: string): JsonlLogReadResult => {
  if (!fs.existsSync(filePath)) {
    return { records: [], completeByteLength: 0, damagedEndByteLength: 0, endsWithNewline: true };
  }
  return scanJsonlBytes(fs.readFileSync(filePath), filePath);
};

/**
 * Cuts the damaged end exactly after the last complete record (and adds the `\n` a last complete record lacks),
 * logging one warning with the file and the bytes removed. Returns the complete records. For the store only.
 */
export const repairJsonlDamagedEnd = (filePath: string): Record<string, unknown>[] => {
  const result = readJsonlRecords(filePath);
  if (result.damagedEndByteLength === 0 && result.endsWithNewline) return result.records;
  if (result.damagedEndByteLength > 0) fs.truncateSync(filePath, result.completeByteLength);
  if (!result.endsWithNewline) fs.appendFileSync(filePath, '\n');
  console.warn('Removed the damaged end of a memory log.', {
    filePath,
    bytesRemoved: result.damagedEndByteLength,
    recordsKept: result.records.length,
  });
  return result.records;
};

/**
 * Whether the file ends cleanly: missing, empty, or its last non-empty line is a complete `\n`-terminated record.
 * Reads at most the file's last 64 KiB; `false` means "not proven clean" (the caller repairs, which reads it all).
 */
export const jsonlLogEndsCleanly = (filePath: string): boolean => {
  if (!fs.existsSync(filePath)) return true;
  const size = fs.statSync(filePath).size;
  if (size === 0) return true;
  const length = Math.min(size, TAIL_CHECK_BYTES);
  const tail = Buffer.alloc(length);
  const fd = fs.openSync(filePath, 'r');
  try {
    fs.readSync(fd, tail, 0, length, size - length);
  } finally {
    fs.closeSync(fd);
  }
  if (tail[length - 1] !== NEWLINE) return false;
  // Unless the tail is the whole file, its first line may be partial: start after its first newline.
  const firstLineStart = length === size ? 0 : tail.indexOf(NEWLINE) + 1;
  try {
    const scanned = scanJsonlBytes(tail.subarray(firstLineStart), filePath);
    return scanned.records.length > 0 && scanned.damagedEndByteLength === 0;
  } catch {
    return false;
  }
};

const SCAN_CHUNK_BYTES = 64 * 1024;

/**
 * Read-only and bounded by what `visit` asks for: visits the complete records from the start of the file in order, in
 * chunks, until `visit` returns `false` or the file ends. A line that is not a complete record (the damaged end, or damage
 * the line rule never repairs) ends the scan. Nothing is cut or rewritten; a missing file visits nothing.
 */
export const scanJsonlRecordsFromStart = (
  filePath: string,
  visit: (record: Record<string, unknown>) => boolean,
): void => {
  if (!fs.existsSync(filePath)) return;
  const fd = fs.openSync(filePath, 'r');
  try {
    const chunk = Buffer.alloc(SCAN_CHUNK_BYTES);
    let carry: Buffer = Buffer.alloc(0);
    let position = 0;
    for (;;) {
      const read = fs.readSync(fd, chunk, 0, SCAN_CHUNK_BYTES, position);
      const atEnd = read === 0;
      position += read;
      let bytes: Buffer = atEnd ? carry : Buffer.concat([carry, chunk.subarray(0, read)]);
      carry = Buffer.alloc(0);
      let start = 0;
      for (;;) {
        const newline = bytes.indexOf(NEWLINE, start);
        if (newline === -1) break;
        const [line] = splitLines(bytes.subarray(start, newline + 1));
        start = newline + 1;
        if (!line || line.trimmed.length === 0) continue;
        const record = parseCompleteRecord(line.trimmed);
        if (!record || !visit(record)) return;
      }
      bytes = bytes.subarray(start);
      if (atEnd) {
        // A last record whose `\n` never landed still counts when it is complete.
        const [line] = splitLines(bytes);
        const record = line && line.trimmed.length > 0 ? parseCompleteRecord(line.trimmed) : null;
        if (record) visit(record);
        return;
      }
      carry = Buffer.from(bytes);
    }
  } finally {
    fs.closeSync(fd);
  }
};

/**
 * Read-only: the last complete record of the file (null when there is none). It reads the end of the file in growing
 * windows, so a long log is not read whole; a damaged end is skipped, as the next append would cut it.
 */
export const readLastJsonlRecord = (filePath: string): Record<string, unknown> | null => {
  if (!fs.existsSync(filePath)) return null;
  const size = fs.statSync(filePath).size;
  if (size === 0) return null;
  const fd = fs.openSync(filePath, 'r');
  try {
    for (let window = Math.min(size, TAIL_CHECK_BYTES); ; window = Math.min(size, window * 2)) {
      const tail = Buffer.alloc(window);
      fs.readSync(fd, tail, 0, window, size - window);
      // Unless the window is the whole file, its first line may be partial.
      const firstLineStart = window === size ? 0 : tail.indexOf(NEWLINE) + 1;
      const lines = firstLineStart > 0 || window === size ? splitLines(tail.subarray(firstLineStart)) : [];
      for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index]!;
        if (line.trimmed.length === 0) continue;
        const record = parseCompleteRecord(line.trimmed);
        if (record) return record;
      }
      if (window === size) return null;
    }
  } finally {
    fs.closeSync(fd);
  }
};
