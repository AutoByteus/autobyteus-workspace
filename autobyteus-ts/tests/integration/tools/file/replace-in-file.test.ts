import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { registerReplaceInFileTool } from '../../../../src/tools/file/replace-in-file.js';

const TOOL_NAME = 'replace_in_file';

type MockContext = { agentId: string; workspaceRootPath: string | null };

describe('replace_in_file tool (integration)', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerReplaceInFileTool();
  });

  const getTool = (): BaseTool => defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;

  it('updates file content on disk', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-replace-in-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');

    const result = await getTool().execute(
      { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
      { path: filePath, old_text: 'line2\n', new_text: 'line2 updated\n' }
    );

    expect(result).toBe(`File updated successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('line1\nline2 updated\nline3\n');
  });

  it('resolves a relative path from an explicit absolute base directory', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-replace-in-file-'));
    const filePath = path.join(tmpDir, 'relative.txt');
    await fs.writeFile(filePath, 'before\n', 'utf-8');

    const result = await getTool().execute(
      { agentId: 'agent', workspaceRootPath: path.join(tmpDir, 'different-workspace') } satisfies MockContext,
      { path: 'relative.txt', base_dir: tmpDir, old_text: 'before\n', new_text: 'after\n' }
    );

    expect(result).toBe(`File updated successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('after\n');
  });

  it('rejects a relative path without base_dir', async () => {
    await expect(
      getTool().execute(
        { agentId: 'agent', workspaceRootPath: '/tmp' } satisfies MockContext,
        { path: 'relative.txt', old_text: 'before\n', new_text: 'after\n' }
      )
    ).rejects.toThrow('Provide an absolute path or an absolute base_dir');
  });
});
