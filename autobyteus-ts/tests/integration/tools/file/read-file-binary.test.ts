import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';

// read_file refuses non-media binary files (autobyteus-328 REQ-009, DEC-007): a file is binary when it contains a NUL
// byte AND is not valid UTF-8. Text with stray NUL bytes (build logs), files without NUL (Latin-1 included), UTF-16
// text that is valid UTF-8, non-ASCII UTF-8 and empty files read exactly as before this ticket. Synthesized files, plus
// one tracked Electron build log from this repository (AC-009).
const binaryMessage = (filePath: string) =>
  `The file '${filePath}' is a binary file and cannot be read as text. read_file reads text files and image, audio and video files.`;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const ELECTRON_BUILD_LOG = path.join(
  repoRoot,
  'autobyteus-server-ts/tickets/done/agent-runtime-default-core-tools/logs/delivery/electron-build-mac-20260814T174700Z.log',
);

const isValidUtf8 = (bytes: Uint8Array): boolean => {
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch {
    return false;
  }
};

/** read_file's result before this ticket: UTF-8 decode, then the line loop (the oracle for "read as before"). */
const readAsBefore = (bytes: Buffer, includeLineNumbers: boolean): string => {
  const lines = (bytes.toString('utf8').match(/.*(?:\n|$)/g) ?? []).filter((line) => line !== '');
  return lines
    .map((line, index) => {
      if (!includeLineNumbers) return line;
      const hasNewline = line.endsWith('\n');
      return `${index + 1}: ${hasNewline ? line.slice(0, -1) : line}${hasNewline ? '\n' : ''}`;
    })
    .join('');
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (bytes: Buffer): number => {
  let c = 0xffffffff;
  for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
/** A real one-entry ZIP archive with a deflated member, laid out as `zip` writes it. */
const zipOf = (name: string, data: Buffer): Buffer => {
  const compressed = zlib.deflateRawSync(data);
  const fileName = Buffer.from(name, 'utf8');
  const fields = (header: Buffer, offset: number) => {
    header.writeUInt16LE(20, offset); // version needed
    header.writeUInt16LE(0, offset + 2); // flags
    header.writeUInt16LE(8, offset + 4); // deflate
    header.writeUInt16LE(0x6000, offset + 6); // time 12:00
    header.writeUInt16LE(0x5b5d, offset + 8); // date 2025-10-29
    header.writeUInt32LE(crc32(data), offset + 10);
    header.writeUInt32LE(compressed.length, offset + 14);
    header.writeUInt32LE(data.length, offset + 18);
    header.writeUInt16LE(fileName.length, offset + 22);
  };
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  fields(local, 4);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  fields(central, 6);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + fileName.length, 12);
  end.writeUInt32LE(local.length + fileName.length + compressed.length, 16);
  return Buffer.concat([local, fileName, compressed, central, fileName, end]);
};

// A minimal PDF-like file: a text header, then a binary stream with a NUL byte, as real PDFs carry.
const PDF_LIKE = Buffer.concat([
  Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj\n<< /Length 4 >>\nstream\n', 'latin1'),
  Buffer.from([0x78, 0x9c, 0x00, 0x01]),
  Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
]);
// A PDF-like file whose first NUL byte comes after 30 KB of text-like objects, as in 77 of 400 sampled OS PDFs (API-05).
const PDF_LATE_NUL = Buffer.concat([
  Buffer.from('%PDF-1.4\n', 'latin1'),
  Buffer.from('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'.repeat(700), 'latin1'),
  Buffer.from('3 0 obj\n<< /Length 4 >>\nstream\n', 'latin1'),
  Buffer.from([0x78, 0x9c, 0x00, 0x01]),
  Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
]);
const ZIP = zipOf('notes.txt', Buffer.from('Quarterly notes: revenue up, costs flat.\n'.repeat(40)));
const GZIP = zlib.gzipSync(Buffer.from('Quarterly notes: revenue up, costs flat.\n'.repeat(40)));
// An ELF header for a 64-bit little-endian aarch64 executable (e_machine 0xB7).
const ELF = Buffer.concat([
  Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00]),
  Buffer.alloc(8),
  Buffer.from([0x02, 0x00, 0xb7, 0x00, 0x01, 0x00, 0x00, 0x00]),
]);
// Random bytes with a NUL byte (fixed seed, so the test is repeatable).
const randomBytes = (length: number): Buffer => {
  const bytes = Buffer.alloc(length);
  let seed = 0x2f6b9d3;
  for (let i = 0; i < length; i += 1) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    bytes[i] = seed & 0xff;
  }
  bytes[4321] = 0;
  return bytes;
};

describe('read_file on non-media binary files', () => {
  let dir: string;

  beforeEach(async () => {
    defaultToolRegistry.clear();
    registerReadFileTool();
    dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'read-file-binary-')));
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  const read = (args: Record<string, unknown>) =>
    (defaultToolRegistry.createTool('read_file') as BaseTool).execute({ agentId: 'binary-agent', workspaceRootPath: null }, args);
  const write = async (name: string, bytes: Buffer | string): Promise<string> => {
    const filePath = path.join(dir, name);
    await fs.writeFile(filePath, bytes);
    return filePath;
  };

  it.each([
    ['report.pdf', PDF_LIKE],
    ['long-report.pdf', PDF_LATE_NUL],
    ['archive.zip', ZIP],
    ['notes.txt.gz', GZIP],
    ['blob.bin', randomBytes(9000)],
    ['program', ELF],
  ])('refuses %s', async (name, bytes) => {
    expect(bytes.includes(0) && !isValidUtf8(bytes)).toBe(true); // the sample is binary by DEC-007's definition
    const filePath = await write(name, bytes);

    await expect(read({ path: filePath })).rejects.toThrow(binaryMessage(filePath));
  });

  it('refuses a binary file whatever the line arguments', async () => {
    const filePath = await write('report.pdf', PDF_LIKE);

    await expect(read({ path: filePath, start_line: 1, end_line: 2, include_line_numbers: false }))
      .rejects.toThrow(binaryMessage(filePath));
  });

  it('reads the tracked Electron build log with stray NUL bytes exactly as before this ticket', async () => {
    const bytes = readFileSync(ELECTRON_BUILD_LOG);
    expect(bytes.indexOf(0)).toBeGreaterThan(-1);
    expect(isValidUtf8(bytes)).toBe(true);

    await expect(read({ path: ELECTRON_BUILD_LOG })).resolves.toBe(readAsBefore(bytes, true));
    await expect(read({ path: ELECTRON_BUILD_LOG, include_line_numbers: false })).resolves.toBe(bytes.toString('utf8'));
  });

  it('reads UTF-8 text with a stray NUL byte far past the first 8,000 bytes as before', async () => {
    const bytes = Buffer.from(`${'a'.repeat(100000)}\u0000tail\n`);
    const filePath = await write('late-nul.log', bytes);

    await expect(read({ path: filePath, include_line_numbers: false })).resolves.toBe(bytes.toString('utf8'));
  });

  it('reads Latin-1 text (no NUL byte) as before', async () => {
    const bytes = Buffer.from('Grüße aus Zürich\nçà et là\n', 'latin1');
    expect(isValidUtf8(bytes)).toBe(false);
    const filePath = await write('latin1.txt', bytes);

    await expect(read({ path: filePath })).resolves.toBe(readAsBefore(bytes, true));
  });

  it('reads UTF-16LE text without a byte-order mark (valid UTF-8 with NUL bytes) as before', async () => {
    const bytes = Buffer.from('Hello\nWorld\n', 'utf16le');
    expect(bytes.includes(0) && isValidUtf8(bytes)).toBe(true);
    const filePath = await write('utf16.txt', bytes);

    await expect(read({ path: filePath })).resolves.toBe(readAsBefore(bytes, true));
  });

  it('reads UTF-8 text with non-ASCII characters exactly as before', async () => {
    const content = 'Grüße aus Zürich\n日本語のテキスト\nemoji 🙂 and a tab\there\n';
    const filePath = await write('notes.md', content);

    await expect(read({ path: filePath })).resolves.toBe(
      '1: Grüße aus Zürich\n2: 日本語のテキスト\n3: emoji 🙂 and a tab\there\n');
    await expect(read({ path: filePath, include_line_numbers: false })).resolves.toBe(content);
  });

  it('reads an empty text file as an empty result, as before', async () => {
    const filePath = await write('empty.txt', '');

    await expect(read({ path: filePath })).resolves.toBe('');
  });
});
