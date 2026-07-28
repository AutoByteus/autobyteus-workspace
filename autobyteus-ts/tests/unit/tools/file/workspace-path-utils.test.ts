import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  configureFileToolDeniedPaths,
  resolveAbsolutePath,
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

describe('workspace path authorization', () => {
  it('accepts a physical path inside the configured workspace root', async () => {
    const workspace = await createRoot('autobyteus-workspace-');
    await fs.mkdir(path.join(workspace, 'nested'));
    expect(resolveAbsolutePath(
      { agentId: 'agent-test', workspaceRootPath: workspace },
      'nested/file.txt',
    )).toBe(path.join(await fs.realpath(workspace), 'nested', 'file.txt'));
  });

  it('rejects lexical traversal and symlink traversal outside the workspace', async () => {
    const workspace = await createRoot('autobyteus-workspace-');
    const outside = await createRoot('autobyteus-outside-');
    await fs.symlink(outside, path.join(workspace, 'escape'));
    const context = { agentId: 'agent-test', workspaceRootPath: workspace };
    expect(() => resolveAbsolutePath(context, '../outside.txt'))
      .toThrow('FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT');
    expect(() => resolveAbsolutePath(context, 'escape/value.txt'))
      .toThrow('FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT');
  });

  it('rejects the configured Store root even when it is inside the workspace', async () => {
    const workspace = await createRoot('autobyteus-workspace-');
    const storeRoot = path.join(workspace, 'secret-store');
    await fs.mkdir(storeRoot);
    configureFileToolDeniedPaths([storeRoot]);
    expect(() => resolveAbsolutePath(
      { agentId: 'agent-test', workspaceRootPath: workspace },
      'secret-store/secret-store.db',
    )).toThrow('FILE_TOOL_PATH_DENIED');
  });
});
