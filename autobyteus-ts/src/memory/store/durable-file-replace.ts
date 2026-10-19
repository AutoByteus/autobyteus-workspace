import fs from 'node:fs';
import path from 'node:path';

/**
 * Folder sync is unsupported on Windows (`EPERM`/`EISDIR`) and on some file systems (`EINVAL`);
 * the rename itself still stands there.
 */
const UNSUPPORTED_DIRECTORY_SYNC_CODES = new Set(['EPERM', 'EISDIR', 'EINVAL']);

const syncDirectory = (dirPath: string): void => {
  let fd: number | null = null;
  try {
    fd = fs.openSync(dirPath, 'r');
    fs.fsyncSync(fd);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (!code || !UNSUPPORTED_DIRECTORY_SYNC_CODES.has(code)) throw error;
  } finally {
    if (fd !== null) fs.closeSync(fd);
  }
};

/**
 * Replaces a whole file so that a power loss leaves either the old or the new complete file:
 * write `<file>.tmp`, sync it, rename it over the file, sync the folder.
 */
export const replaceFileDurably = (filePath: string, text: string): void => {
  const dirPath = path.dirname(filePath);
  const tmpPath = `${filePath}.tmp`;
  fs.mkdirSync(dirPath, { recursive: true });
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeFileSync(fd, text, 'utf-8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, filePath);
  syncDirectory(dirPath);
};
