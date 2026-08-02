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
    expect(definition?.description).toContain('Applies a context-located patch');

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.parameters.length).toBe(3);

    const pathParam = schema?.getParameter('path');
    expect(pathParam).toBeInstanceOf(ParameterDefinition);
    expect(pathParam?.type).toBe(ParameterType.STRING);
    expect(pathParam?.required).toBe(true);
    expect(pathParam?.description).toContain('If path is relative, you must provide an absolute base_dir');
    expect(schema?.getParameter('base_dir')?.required).toBe(false);

    const patchParam = schema?.getParameter('patch');
    expect(patchParam).toBeInstanceOf(ParameterDefinition);
    expect(patchParam?.type).toBe(ParameterType.STRING);
    expect(patchParam?.required).toBe(true);
    expect(patchParam?.description).toContain('bare @@ line');
    expect(patchParam?.description).toContain('Do not include line numbers');
  });

  it('applies a context-located patch in an existing file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');
    const patch = `@@
 line1
-line2
+line2 updated
 line3
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('line1\nline2 updated\nline3\n');
  });

  it('rejects git file headers because path is supplied separately', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample_git_diff.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');

    const patch = `diff --git a/sample_git_diff.txt b/sample_git_diff.txt
index 1111111..2222222 100644
--- a/sample_git_diff.txt
+++ b/sample_git_diff.txt
@@
 line1
-line2
+line2 updated
 line3
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await expect(tool.execute(context, { path: filePath, patch }))
      .rejects.toThrow(/unsupported patch header/i);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('line1\nline2\nline3\n');
  });

  it('raises PatchApplicationError when patch fails', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'sample_failure.txt');
    await fs.writeFile(filePath, 'alpha\nbeta\ngamma\n', 'utf-8');

    const patch = `@@
 alpha
-delta
+theta
 gamma
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };

    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow(PatchApplicationError);
    await expect(tool.execute(context, { path: filePath, patch }))
      .rejects.toThrow('canonical bare @@ patch and more unique unchanged/removal context');
  });

  it('rejects ambiguous context without writing the file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'ambiguous.txt');
    const original = 'status: draft\nseparator\nstatus: draft\n';
    await fs.writeFile(filePath, original, 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await expect(tool.execute(context, {
      path: filePath,
      patch: '@@\n-status: draft\n+status: ready\n'
    })).rejects.toThrow(/ambiguous/i);
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
  });

  it('does not write a partially applied multi-hunk patch', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'atomic.txt');
    const original = 'alpha: old\nmiddle\nomega: old\n';
    await fs.writeFile(filePath, original, 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const patch = `@@
-alpha: old
+alpha: new
@@
-missing: old
+missing: new
`;
    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow(/could not find/i);
    expect(await fs.readFile(filePath, 'utf-8')).toBe(original);
  });

  it('retries with whitespace tolerance', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'whitespace_patch.txt');
    await fs.writeFile(filePath, 'alpha\n  beta\ngamma\n', 'utf-8');

    const patch = `@@
 alpha
- beta
+ BETA
 gamma
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('alpha\n BETA\ngamma\n');
  });

  it('uses the unique exact match before considering whitespace-tolerant candidates', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'exact_first.txt');
    await fs.writeFile(filePath, 'key: old\n key: old\n', 'utf-8');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await tool.execute(context, {
      path: filePath,
      patch: '@@\n-key: old\n+key: new\n'
    });

    expect(await fs.readFile(filePath, 'utf-8')).toBe('key: new\n key: old\n');
  });

  it('raises error when file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'nonexistent.txt');

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };
    await expect(tool.execute(context, { path: filePath, patch: '@@\n-line1\n+line1 updated\n' })).rejects.toThrow('does not exist');
  });

  it('resolves relative paths from an explicit absolute base directory', async () => {
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
      base_dir: tmpDir,
      patch: '@@\n line1\n-line2\n+line2 updated\n'
    });
    expect(result).toBe(`File edited successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('line1\nline2 updated\n');
  });

  it('rejects relative paths without an explicit base directory', async () => {
    const tool = getPatchTool();

    await expect(tool.execute(
      { agentId: 'agent', workspaceRootPath: '/tmp' } satisfies MockContext,
      {
        path: 'rel_patch.txt',
        patch: '@@\n-line1\n+line1 updated\n'
      }
    )).rejects.toThrow('Provide an absolute path or an absolute base_dir');
  });

  it('read then patch flow', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'flow_test.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const patchTool = getPatchTool();
    const readTool = getReadTool();
    const context: MockContext = { agentId: 'agent', workspaceRootPath: tmpDir };

    const content = await readTool.execute(context, { path: filePath });
    expect(content).toBe('1: line1\n2: line2\n');

    const result = await patchTool.execute(context, {
      path: filePath,
      patch: '@@\n line1\n-line2\n+line2 modified\n'
    });
    expect(result).toBe(`File edited successfully at ${filePath}`);
    const updated = await fs.readFile(filePath, 'utf-8');
    expect(updated).toBe('line1\nline2 modified\n');
  });
});
