import { execFileSync } from 'node:child_process';
import fsp from 'node:fs/promises';
import os from 'node:os';
import { SecretStorageError } from '../../domain/secret-storage-types.js';
import { assertWindowsExclusiveAcl } from '../../windows-exclusive-acl.js';

const unavailable = (cause?: unknown): SecretStorageError =>
  new SecretStorageError('BACKEND_UNAVAILABLE', true, 'SECRET_BACKEND_UNAVAILABLE', { cause });

const hardenWindowsAcl = (filePath: string): void => {
  if (process.platform !== 'win32') return;
  try {
    const username = os.userInfo().username;
    execFileSync('icacls.exe', [filePath, '/inheritance:r', '/grant:r', `${username}:(F)`], {
      windowsHide: true,
      stdio: 'ignore',
    });
  } catch (cause) {
    throw unavailable(cause);
  }
};

const assertWindowsPrivateAcl = (filePath: string): void => {
  try {
    assertWindowsExclusiveAcl(filePath);
  } catch (cause) {
    throw unavailable(cause);
  }
};

export const assertPrivatePath = async (
  filePath: string,
  expectedType: 'file' | 'directory',
): Promise<void> => {
  const stat = await fsp.stat(filePath);
  if (process.platform === 'win32') {
    assertWindowsPrivateAcl(filePath);
    if (expectedType === 'file' && !stat.isFile()) throw unavailable();
    if (expectedType === 'directory' && !stat.isDirectory()) throw unavailable();
    return;
  }
  if (typeof process.getuid === 'function' && stat.uid !== process.getuid()) throw unavailable();
  if ((stat.mode & 0o077) !== 0) throw unavailable();
  if (expectedType === 'file' && !stat.isFile()) throw unavailable();
  if (expectedType === 'directory' && !stat.isDirectory()) throw unavailable();
};

export const ensurePrivateDirectory = async (directoryPath: string): Promise<void> => {
  await fsp.mkdir(directoryPath, { recursive: true, mode: 0o700 });
  if (process.platform !== 'win32') await fsp.chmod(directoryPath, 0o700);
  else hardenWindowsAcl(directoryPath);
  await assertPrivatePath(directoryPath, 'directory');
};

export const hardenPrivateFile = async (filePath: string): Promise<void> => {
  if (process.platform !== 'win32') await fsp.chmod(filePath, 0o600);
  else hardenWindowsAcl(filePath);
};

export const fsyncFile = async (filePath: string): Promise<void> => {
  const handle = await fsp.open(filePath, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
};

export const fsyncDirectory = async (directoryPath: string): Promise<void> => {
  if (process.platform === 'win32') return;
  const handle = await fsp.open(directoryPath, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
};
