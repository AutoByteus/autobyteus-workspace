import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  configureFileToolDeniedPaths,
  resolveFileToolPath,
} from '../../../../src/tools/file/workspace-path-utils.js';

const roots = new Set<string>();
const createRoot = async (prefix: string) => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  roots.add(root);
  return root;
};

afterEach(async () => {
  configureFileToolDeniedPaths([]);
  await Promise.all([...roots].map((root) => fs.rm(root, { recursive: true, force: true })));
  roots.clear();
});

describe('trusted-local file path resolution', () => {
  it('accepts an absolute path outside the configured workspace', async () => {
    const workspace = await createRoot('autobyteus-workspace-');
    const outside = await createRoot('autobyteus-outside-');
    const absolutePath = path.join(outside, 'file.txt');

    expect(resolveFileToolPath(
      { agentId: 'agent-test', workspaceRootPath: workspace },
      absolutePath,
    )).toBe(absolutePath);
  });

  it('resolves a relative path only under an explicit absolute base directory', async () => {
    const workspace = await createRoot('autobyteus-workspace-');
    const externalBase = await createRoot('autobyteus-external-');

    expect(resolveFileToolPath(
      { agentId: 'agent-test', workspaceRootPath: workspace },
      'nested/file.txt',
      externalBase,
    )).toBe(path.join(externalBase, 'nested', 'file.txt'));
  });

  it('rejects a relative path without base_dir even when a workspace is configured', async () => {
    const workspace = await createRoot('autobyteus-workspace-');

    expect(() => resolveFileToolPath(
      { agentId: 'agent-test', workspaceRootPath: workspace },
      'nested/file.txt',
    )).toThrow('Provide an absolute path or an absolute base_dir');
  });

  it('rejects a relative base_dir for a relative path', async () => {
    expect(() => resolveFileToolPath(
      { agentId: 'agent-test' },
      'file.txt',
      'relative-base',
    )).toThrow("Parameter 'base_dir' must be an absolute directory");
  });

  it('uses an absolute path when both path and base_dir are supplied', () => {
    const absolutePath = path.join(os.tmpdir(), 'absolute-file.txt');

    expect(resolveFileToolPath(
      { agentId: 'agent-test' },
      absolutePath,
      'relative-base',
    )).toBe(absolutePath);
  });

  it('accepts symlink traversal outside the workspace for an absolute input', async () => {
    const workspace = await createRoot('autobyteus-workspace-');
    const outside = await createRoot('autobyteus-outside-');
    await fs.symlink(outside, path.join(workspace, 'escape'));

    expect(resolveFileToolPath(
      { agentId: 'agent-test', workspaceRootPath: workspace },
      path.join(workspace, 'escape', 'value.txt'),
    )).toBe(path.join(workspace, 'escape', 'value.txt'));
  });

  it('rejects a configured protected path after physical resolution', async () => {
    const workspace = await createRoot('autobyteus-workspace-');
    const storeRoot = path.join(workspace, 'secret-store');
    await fs.mkdir(storeRoot);
    configureFileToolDeniedPaths([storeRoot]);

    expect(() => resolveFileToolPath(
      { agentId: 'agent-test', workspaceRootPath: workspace },
      path.join(storeRoot, 'secret-store.db'),
    )).toThrow('FILE_TOOL_PATH_DENIED');
  });

  it('rejects a protected path reached through a symlink', async () => {
    const workspace = await createRoot('autobyteus-workspace-');
    const protectedRoot = await createRoot('autobyteus-protected-');
    await fs.writeFile(path.join(protectedRoot, 'secret.db'), 'secret');
    await fs.symlink(protectedRoot, path.join(workspace, 'protected-link'));
    configureFileToolDeniedPaths([protectedRoot]);

    expect(() => resolveFileToolPath(
      { agentId: 'agent-test', workspaceRootPath: workspace },
      path.join(workspace, 'protected-link', 'secret.db'),
    )).toThrow('FILE_TOOL_PATH_DENIED');
  });
});
