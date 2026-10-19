/** replaceFileDurably: the temporary file is synced before it replaces the file, then the folder is synced (AC-007). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { replaceFileDurably } from '../../../src/memory/store/durable-file-replace.js';

const tempDirs: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'durable-file-replace-'));
  tempDirs.push(dir);
  return dir;
};

describe('replaceFileDurably', () => {
  it('syncs the temporary file before renaming it over the file, then syncs the folder', () => {
    const filePath = path.join(tempDir(), 'nested', 'manifest.json');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, 'old');
    const order: string[] = [];
    const fsync = vi.spyOn(fs, 'fsyncSync').mockImplementation(() => { order.push('fsync'); });
    const rename = vi.spyOn(fs, 'renameSync');
    rename.mockImplementation((from, to) => {
      order.push('rename');
      rename.mockRestore();
      fs.renameSync(from, to);
    });

    replaceFileDurably(filePath, 'new ✓');

    expect(order).toEqual(['fsync', 'rename', 'fsync']);
    expect(fsync).toHaveBeenCalledTimes(2);
    expect(fs.readFileSync(filePath, 'utf8')).toBe('new ✓');
    expect(fs.existsSync(`${filePath}.tmp`)).toBe(false);
  });

  it('creates the folder when it is missing', () => {
    const filePath = path.join(tempDir(), 'a', 'b', 'segment.jsonl');
    replaceFileDurably(filePath, 'x\n');
    expect(fs.readFileSync(filePath, 'utf8')).toBe('x\n');
  });

  it('ignores a folder sync the platform does not support', () => {
    const filePath = path.join(tempDir(), 'snapshot.json');
    let calls = 0;
    vi.spyOn(fs, 'fsyncSync').mockImplementation(() => {
      calls += 1;
      if (calls === 2) throw Object.assign(new Error('not supported'), { code: 'EPERM' });
    });
    replaceFileDurably(filePath, '{}');
    expect(fs.readFileSync(filePath, 'utf8')).toBe('{}');
  });
});
