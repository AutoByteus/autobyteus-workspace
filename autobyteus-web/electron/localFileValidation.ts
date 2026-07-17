import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';

export type LocalFileValidationResult =
  | { ok: true; filePath: string }
  | { ok: false; code: LocalFileValidationCode };

export type LocalFileValidationCode =
  | 'invalid-path'
  | 'unavailable'
  | 'not-regular-file'
  | 'unreadable';

const WINDOWS_ABSOLUTE_PATH = /^[A-Za-z]:[\\/]/;

export function isTrustedAbsoluteFilePath(filePath: string): boolean {
  return path.isAbsolute(filePath)
    || (process.platform === 'win32' && WINDOWS_ABSOLUTE_PATH.test(filePath));
}

export async function validateReadableRegularFile(filePath: string): Promise<LocalFileValidationResult> {
  if (typeof filePath !== 'string' || !isTrustedAbsoluteFilePath(filePath) || filePath.includes('\0')) {
    return { ok: false, code: 'invalid-path' };
  }

  const normalizedPath = path.normalize(filePath);
  try {
    const stats = await fs.stat(normalizedPath);
    if (!stats.isFile()) {
      return { ok: false, code: 'not-regular-file' };
    }
    await fs.access(normalizedPath, fsSync.constants.R_OK);
    return { ok: true, filePath: normalizedPath };
  } catch (error) {
    const systemCode = error && typeof error === 'object' && 'code' in error
      ? (error as { code?: string }).code
      : null;
    return { ok: false, code: systemCode === 'EACCES' || systemCode === 'EPERM' ? 'unreadable' : 'unavailable' };
  }
}
