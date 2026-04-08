import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { registerReplaceInFileTool } from '../../../../src/tools/file/replace-in-file.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';

const TOOL_NAME = 'replace_in_file';

type MockContext = { agentId: string; workspaceRootPath: string | null };

describe('replace_in_file tool', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerReplaceInFileTool();
  });

  const getTool = (): BaseTool => defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;

  it('registers definition with expected schema', () => {
    const definition = defaultToolRegistry.getToolDefinition(TOOL_NAME);
    expect(definition).toBeInstanceOf(ToolDefinition);
    expect(definition?.description).toContain('Replaces one exact text block');

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.parameters.length).toBe(3);
    expect(schema?.getParameter('path')).toBeInstanceOf(ParameterDefinition);
    expect(schema?.getParameter('old_text')?.type).toBe(ParameterType.STRING);
    expect(schema?.getParameter('new_text')?.type).toBe(ParameterType.STRING);
  });

  it('replaces a unique exact block', async () => {
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

  it('returns a helpful multiple match error', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-replace-in-file-'));
    const filePath = path.join(tmpDir, 'ambiguous.txt');
    await fs.writeFile(filePath, 'same\nsame\n', 'utf-8');

    await expect(
      getTool().execute(
        { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
        { path: filePath, old_text: 'same\n', new_text: 'changed\n' }
      )
    ).rejects.toThrow('[multiple_matches]');
  });

  it('resolves relative paths from the workspace root', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-replace-in-file-'));
    const filePath = path.join(tmpDir, 'relative.txt');
    await fs.writeFile(filePath, 'a', 'utf-8');

    const result = await getTool().execute(
      { agentId: 'agent', workspaceRootPath: tmpDir } satisfies MockContext,
      { path: 'relative.txt', old_text: 'a', new_text: 'b' }
    );

    expect(result).toBe(`File updated successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('b');
  });

  it('rejects relative paths when no workspace root is configured', async () => {
    await expect(
      getTool().execute(
        { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
        { path: 'relative.txt', old_text: 'a', new_text: 'b' }
      )
    ).rejects.toThrow('but no workspace root is configured');
  });
});
