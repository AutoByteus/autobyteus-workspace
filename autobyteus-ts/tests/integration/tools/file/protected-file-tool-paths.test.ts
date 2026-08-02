import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerEditFileTool } from '../../../../src/tools/file/edit-file.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';
import { configureFileToolDeniedPaths } from '../../../../src/tools/file/workspace-path-utils.js';

const context = { agentId: 'protected-path-test-agent', workspaceRootPath: '/tmp/unrelated-workspace' };
const protectedPath = (root: string) => path.join(root, 'secret.db');

describe('registered file tools protected-path boundary', () => {
  let protectedRoot: string;
  let secretFile: string;
  let symlinkPath: string;

  beforeEach(async () => {
    defaultToolRegistry.clear();
    registerReadFileTool();
    registerWriteFileTool();
    registerEditFileTool();

    protectedRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'autobyteus-protected-file-tools-'));
    secretFile = protectedPath(protectedRoot);
    symlinkPath = path.join(os.tmpdir(), `autobyteus-protected-link-${path.basename(protectedRoot)}`);
    await fs.writeFile(secretFile, 'DO_NOT_LEAK_THIS_SECRET\noriginal\n', 'utf-8');
    await fs.symlink(protectedRoot, symlinkPath);
    configureFileToolDeniedPaths([protectedRoot]);
  });

  afterEach(async () => {
    configureFileToolDeniedPaths([]);
    await fs.rm(symlinkPath, { recursive: true, force: true });
    await fs.rm(protectedRoot, { recursive: true, force: true });
  });

  const getTool = (name: string): BaseTool => defaultToolRegistry.createTool(name) as BaseTool;
  const expectProtectedDenial = async (name: string, args: Record<string, unknown>): Promise<void> => {
    const error = await getTool(name).execute(context, args).then(
      () => null,
      (value: unknown) => value as Error,
    );

    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toContain('FILE_TOOL_PATH_DENIED');
    expect(error?.message).not.toContain('DO_NOT_LEAK_THIS_SECRET');
  };

  it.each([
    ['read_file', (target: string) => ({ path: target })],
    ['write_file', (target: string) => ({ path: target, content: 'replacement' })],
    ['edit_file', (target: string) => ({
      path: target,
      patch: '@@\n DO_NOT_LEAK_THIS_SECRET\n-original\n+changed\n',
    })],
  ])('denies %s for a protected path', async (name, makeArgs) => {
    await expectProtectedDenial(name, makeArgs(secretFile));
    expect(await fs.readFile(secretFile, 'utf-8')).toBe('DO_NOT_LEAK_THIS_SECRET\noriginal\n');
  });

  it.each([
    ['read_file', (target: string) => ({ path: target })],
    ['write_file', (target: string) => ({ path: target, content: 'replacement' })],
    ['edit_file', (target: string) => ({
      path: target,
      patch: '@@\n DO_NOT_LEAK_THIS_SECRET\n-original\n+changed\n',
    })],
  ])('denies %s through a symlink to a protected path', async (name, makeArgs) => {
    await expectProtectedDenial(name, makeArgs(path.join(symlinkPath, 'secret.db')));
    expect(await fs.readFile(secretFile, 'utf-8')).toBe('DO_NOT_LEAK_THIS_SECRET\noriginal\n');
  });

  it('denies a write to a non-existent descendant of a protected root', async () => {
    const target = path.join(protectedRoot, 'new', 'generated.db');
    await expectProtectedDenial('write_file', { path: target, content: 'DO_NOT_WRITE' });
    await expect(fs.access(target)).rejects.toThrow();
  });
});
