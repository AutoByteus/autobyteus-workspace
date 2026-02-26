import { describe, it, expect, beforeEach } from 'vitest';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { PatchApplicationError, registerEditFileTool } from '../../../../src/tools/file/edit-file.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import fs from 'fs/promises';
import path from 'path';

const TOOL_NAME_EDIT_FILE = 'edit_file';

type MockWorkspace = { getBasePath: () => string };
type MockContext = { agentId: string; workspace: MockWorkspace | null };

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
    expect(definition?.description).toContain('Applies a unified diff patch');

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.parameters.length).toBe(2);

    const pathParam = schema?.getParameter('path');
    expect(pathParam).toBeInstanceOf(ParameterDefinition);
    expect(pathParam?.type).toBe(ParameterType.STRING);
    expect(pathParam?.required).toBe(true);

    const patchParam = schema?.getParameter('patch');
    expect(patchParam).toBeInstanceOf(ParameterDefinition);
    expect(patchParam?.type).toBe(ParameterType.STRING);
    expect(patchParam?.required).toBe(true);
  });

  it('applies patch to existing file', async () => {
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
    const context: MockContext = { agentId: 'agent', workspace: null };
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
    const context: MockContext = { agentId: 'agent', workspace: null };

    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow(PatchApplicationError);
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
    const context: MockContext = { agentId: 'agent', workspace: null };
    const result = await tool.execute(context, { path: filePath, patch });

    expect(result).toBe(`File edited successfully at ${filePath}`);
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('alpha\n BETA\ngamma\n');
  });

  it('raises error when file is missing', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'nonexistent.txt');

    const patch = `@@ -0,0 +1,1 @@
+content
`;

    const tool = getPatchTool();
    const context: MockContext = { agentId: 'agent', workspace: null };
    await expect(tool.execute(context, { path: filePath, patch })).rejects.toThrow('does not exist');
  });

  it('returns relative path when workspace is used', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'rel_patch.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const patch = `@@ -1,2 +1,2 @@
 line1
-line2
+line2 updated
`;

    const tool = getPatchTool();
    const context: MockContext = {
      agentId: 'agent',
      workspace: { getBasePath: () => tmpDir }
    };

    const result = await tool.execute(context, { path: 'rel_patch.txt', patch });
    expect(result).toBe('File edited successfully at rel_patch.txt');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toBe('line1\nline2 updated\n');
  });

  it('read then patch flow', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'));
    const filePath = path.join(tmpDir, 'flow_test.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const patchTool = getPatchTool();
    const readTool = getReadTool();
    const context: MockContext = { agentId: 'agent', workspace: null };

    const content = await readTool.execute(context, { path: filePath });
    expect(content).toBe('1: line1\n2: line2\n');

    const patch = `@@ -1,2 +1,2 @@
 line1
-line2
+line2 modified
`;
    const result = await patchTool.execute(context, { path: filePath, patch });
    expect(result).toBe(`File edited successfully at ${filePath}`);
    const updated = await fs.readFile(filePath, 'utf-8');
    expect(updated).toBe('line1\nline2 modified\n');
  });
});
