import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { registerEditFileTool } from '../../../../src/tools/file/edit-file.js';

const TOOL_NAME_EDIT_FILE = 'edit_file';

type MockContext = { agentId: string; workspaceRootPath: string | null };

describe('edit_file tool (integration)', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerEditFileTool();
  });

  const getPatchTool = (): BaseTool => defaultToolRegistry.createTool(TOOL_NAME_EDIT_FILE) as BaseTool;

  it('edits file content on disk', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');
    const patch = '@@ -1,3 +1,3 @@\n line1\n-line2\n+line2 updated\n line3\n';

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: null };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('line1\nline2 updated\nline3\n');
  });

  it('allows absolute paths outside the workspace root', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const workspaceDir = path.join(tmpDir, 'workspace');
    const outsidePath = path.join(tmpDir, 'sample.txt');
    await fs.mkdir(workspaceDir, { recursive: true });
    await fs.writeFile(outsidePath, 'line1\nline2\n', 'utf-8');
    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: workspaceDir };

    const result = await tool.execute(context, {
      path: outsidePath,
      patch: '@@ -1,2 +1,2 @@\n line1\n-line2\n+line2 updated\n'
    });
    expect(result).toBe(`File edited successfully at ${outsidePath}`);
    expect(await fs.readFile(outsidePath, 'utf-8')).toBe('line1\nline2 updated\n');
  });

  it('resolves relative edit paths from the workspace root', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');
    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };

    const result = await tool.execute(context, {
      path: 'sample.txt',
      patch: '@@ -1,2 +1,2 @@\n line1\n-line2\n+line2 updated\n'
    });
    expect(result).toBe(`File edited successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('line1\nline2 updated\n');
  });

  it('rejects relative edit paths when no workspace root is configured', async () => {
    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: null };

    await expect(
      tool.execute(context, { path: 'sample.txt', patch: '@@ -1,1 +1,1 @@\n-line1\n+line1 updated\n' })
    ).rejects.toThrow('but no workspace root is configured');
  });
});
