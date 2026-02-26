import { describe, it, expect } from 'vitest';
import { resolveSafePath, getDefaultDownloadFolder } from '../../../src/utils/file-utils.js';
import * as path from 'node:path';
import * as os from 'node:os';

describe('file_utils', () => {
  const workspaceRoot = path.resolve(os.homedir(), 'test_workspace');

  it('should return a valid downloads folder', () => {
    const downloads = getDefaultDownloadFolder();
    expect(downloads).toContain('Downloads');
  });

  it('should resolve relative paths within workspace', () => {
    const safe = resolveSafePath('doc.txt', workspaceRoot);
    expect(safe).toBe(path.join(workspaceRoot, 'doc.txt'));

    const nested = resolveSafePath('assets/doc.txt', workspaceRoot);
    expect(nested).toBe(path.join(workspaceRoot, 'assets', 'doc.txt'));
  });

  it('should allow absolute paths within workspace', () => {
    const absPath = path.join(workspaceRoot, 'subdir', 'doc.txt');
    const safe = resolveSafePath(absPath, workspaceRoot);
    expect(safe).toBe(absPath);
  });

  it('should allow paths in downloads', () => {
    const downloads = getDefaultDownloadFolder();
    const target = path.join(downloads, 'file.pdf');
    const safe = resolveSafePath(target, workspaceRoot);
    expect(safe).toBe(target);
  });

  it('should allow paths in temp dir', () => {
    const temp = os.tmpdir();
    const target = path.join(temp, 'tempjunk');
    const safe = resolveSafePath(target, workspaceRoot);
    expect(safe).toBe(path.resolve(target));
  });

  it('should reject traversal attacks outside workspace', () => {
    const outside = path.resolve(workspaceRoot, '../outside_secret.txt');
    expect(() => resolveSafePath('../outside_secret.txt', workspaceRoot)).toThrow(/Security Violation/);
    expect(() => resolveSafePath(outside, workspaceRoot)).toThrow(/Security Violation/);
  });

  it('should reject absolute paths outside allowed roots', () => {
    const forbidden = os.platform() === 'win32'
      ? path.resolve('C:\\Windows\\System32\\cmd.exe')
      : path.resolve('/bin/sh');
    expect(() => resolveSafePath(forbidden, workspaceRoot)).toThrow(/Security Violation/);
  });
});
