import { describe, it, expect, beforeEach } from 'vitest';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { PatchApplicationError, registerEditFileTool } from '../../../../src/tools/file/edit-file.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import fs from 'fs/promises';
import path from 'path';

const TOOL_NAME_EDIT_FILE = 'edit_file';

type MockContext = { agentId: string; workspaceRootPath: string | null };

describe('edit_file tool', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerEditFileTool();
    registerReadFileTool();
  });

  const getPatchTool = (): BaseTool => defaultToolRegistry.createTool(TOOL_NAME_EDIT_FILE) as BaseTool;
  const getReadTool = (): BaseTool => defaultToolRegistry.createTool('read_file') as BaseTool;

  it('registers definition with expected schema', () => {
    const definition = defaultToolRegistry.getToolDefinition(TOOL_NAME_EDIT_FILE);
    expect(definition).toBeInstanceOf(ToolDefinition);
    expect(definition?.name).toBe(TOOL_NAME_EDIT_FILE);
    expect(definition?.description).toContain('Applies a diff-style patch');

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.parameters.length).toBe(2);

    const pathParam = schema?.getParameter('path');
    expect(pathParam).toBeInstanceOf(ParameterDefinition);
    expect(pathParam?.type).toBe(ParameterType.STRING);
    expect(pathParam?.required).toBe(true);
    expect(pathParam?.description).toContain('absolute or relative to the configured workspace root');

    const patchParam = schema?.getParameter('patch');
    expect(patchParam).toBeInstanceOf(ParameterDefinition);
    expect(patchParam?.type).toBe(ParameterType.STRING);
    expect(patchParam?.required).toBe(true);
    expect(patchParam?.description).toContain('git diff or unified diff patch');
  });

  it('applies a unified diff patch in an existing file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');
    const patch = `@@ -1,3 +1,3 @@
 line1
-line2
+line2 updated
 line3
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: null };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('line1\nline2 updated\nline3\n');
  });

  it('applies a git diff style patch with file headers', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample_git_diff.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');

    const patch = `diff --git a/sample_git_diff.txt b/sample_git_diff.txt
index 1111111..2222222 100644
--- a/sample_git_diff.txt
+++ b/sample_git_diff.txt
@@ -1,3 +1,3 @@
 line1
-line2
+line2 updated
 line3
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: null };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('line1\nline2 updated\nline3\n');
  });

  it('raises PatchApplicationError when patch fails', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample_failure.txt');
    await fs.writeFile(filePath, 'alpha\nbeta\ngamma\n', 'utf-8');

    const patch = `@@ -1,3 +1,3 @@
 alpha
-delta
+theta
 gamma
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: null };

    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow(PatchApplicationError);
    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow('replace_in_file / insert_in_file');
  });

  it('retries with whitespace tolerance', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'whitespace_patch.txt');
    await fs.writeFile(filePath, 'alpha\n  beta\ngamma\n', 'utf-8');

    const patch = `@@ -1,3 +1,3 @@
 alpha
- beta
+ BETA
 gamma
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: null };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('alpha\n BETA\ngamma\n');
  });

  it('raises error when file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'nonexistent.txt');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: null };
    await expect(tool.execute(context, { path: filePath, patch: '@@ -1,1 +1,1 @@\n-line1\n+line1 updated\n' })).rejects.toThrow('does not exist');
  });

  it('resolves relative paths from the workspace root', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'rel_patch.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = {
      agentId: 'agent',
      workspaceRootPath: tmpDir 
    };

    const result = await tool.execute(context, {
      path: 'rel_patch.txt',
      patch: '@@ -1,2 +1,2 @@\n line1\n-line2\n+line2 updated\n'
    });
    expect(result).toBe(`File edited successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('line1\nline2 updated\n');
  });

  it('rejects relative paths when no workspace root is configured', async () => {
    const tool = getPatchTool();

    await expect(tool.execute(
      { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
      {
        path: 'rel_patch.txt',
        patch: '@@ -1,1 +1,1 @@\n-line1\n+line1 updated\n'
      }
    )).rejects.toThrow('but no workspace root is configured');
  });

  it('read then patch flow', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'flow_test.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const patchTool = getPatchTool();
    const readTool = getReadTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: null };

    const content = await readTool.execute(context, { path: filePath });
    expect(content).toBe('1: line1\n2: line2\n');

    const result = await patchTool.execute(context, {
      path: filePath,
      patch: '@@ -1,2 +1,2 @@\n line1\n-line2\n+line2 modified\n'
    });
    expect(result).toBe(`File edited successfully at ${filePath}`);
    const updated = await fs.readFile(filePath, 'utf-8');
    expect(updated).toBe('line1\nline2 modified\n');
  });
});
