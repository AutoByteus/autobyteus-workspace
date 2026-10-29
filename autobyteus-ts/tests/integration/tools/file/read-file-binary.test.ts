import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';

// read_file refuses non-media binary files (autobyteus-328 REQ-009): a NUL byte in the first 8,000 bytes (git's
// heuristic) means binary; text, including non-ASCII UTF-8 and empty files, reads exactly as before. Synthesized files.
const binaryMessage = (filePath: string) =>
  `The file '${filePath}' is a binary file and cannot be read as text. read_file reads text files and image, audio and video files.`;

// A minimal PDF-like file: a text header, then a binary stream with a NUL byte, as real PDFs carry.
const PDF_LIKE = Buffer.concat([
  Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj\n<< /Length 4 >>\nstream\n', 'latin1'),
  Buffer.from([0x78, 0x9c, 0x00, 0x01]),
  Buffer.from('\nendstream\nendobj\n%%EOF\n', 'latin1'),
]);
// An empty ZIP archive with one stored entry header: local file header signature, version and zero fields (NUL bytes).
const ZIP = Buffer.from([
  0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0x00, 0x00, 0x00, 0x61, 0x2e, 0x74, 0x78, 0x74,
]);
// Random bytes with a NUL inside the first 8,000 bytes (fixed seed, so the test is repeatable).
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
    ['archive.zip', ZIP],
    ['blob.bin', randomBytes(9000)],
    ['program', Buffer.from([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01, 0x01, 0x00])],
  ])('refuses %s', async (name, bytes) => {
    const filePath = await write(name, bytes);

    await expect(read({ path: filePath })).rejects.toThrow(binaryMessage(filePath));
  });

  it('refuses a binary file whatever the line arguments', async () => {
    const filePath = await write('report.pdf', PDF_LIKE);

    await expect(read({ path: filePath, start_line: 1, end_line: 2, include_line_numbers: false }))
      .rejects.toThrow(binaryMessage(filePath));
  });

  it('reads a NUL byte after the first 8,000 bytes as text, as before', async () => {
    const content = `${'a'.repeat(8000)}\u0000tail`;
    const filePath = await write('late-nul.txt', content);

    await expect(read({ path: filePath, include_line_numbers: false })).resolves.toBe(content);
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
