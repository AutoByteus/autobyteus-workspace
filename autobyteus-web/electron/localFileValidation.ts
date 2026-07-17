import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

export type LocalFileValidationResult =
  | { ok: true; filePath: string }
  | { ok: false; error: string };

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;

export function isTrustedAbsoluteFilePath(filePath: string): boolean {
  return path.isAbsolute(filePath)
    || (process.platform === 'win32' && WINDOWS_ABSOLUTE_PATH.test(filePath));
}

export async function validateReadableRegularFile(filePath: string): Promise<LocalFileValidationResult> {
  if (typeof filePath !== 'string' || !isTrustedAbsoluteFilePath(filePath) || filePath.includes('\0')) {
    return { ok: false, error: 'The file path must be an absolute path.' };
  }

  const normalizedPath = path.normalize(filePath);
  try {
    const stats = await fs.stat(normalizedPath);
    if (!stats.isFile()) {
      return { ok: false, error: 'The selected path is not a regular file.' };
    }
    await fs.access(normalizedPath, fsSync.constants.R_OK);
    return { ok: true, filePath: normalizedPath };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'The file is unavailable or unreadable.',
    };
  }
}
