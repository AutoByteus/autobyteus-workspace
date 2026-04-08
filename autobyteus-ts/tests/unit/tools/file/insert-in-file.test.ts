import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';
import { registerInsertInFileTool } from '../../../../src/tools/file/insert-in-file.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';

const TOOL_NAME = 'insert_in_file';

type MockContext = { agentId: string; workspaceRootPath: string | null };

describe('insert_in_file tool', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerInsertInFileTool();
  });

  const getTool = (): BaseTool => defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;

  it('registers definition with expected schema', () => {
    const definition = defaultToolRegistry.getToolDefinition(TOOL_NAME);
    expect(definition).toBeInstanceOf(ToolDefinition);
    expect(definition?.description).toContain('Inserts new text before or after');

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.parameters.length).toBe(4);
    expect(schema?.getParameter('path')).toBeInstanceOf(ParameterDefinition);
    expect(schema?.getParameter('new_text')?.type).toBe(ParameterType.STRING);
    expect(schema?.getParameter('before_text')?.type).toBe(ParameterType.STRING);
    expect(schema?.getParameter('after_text')?.type).toBe(ParameterType.STRING);
  });

  it('inserts text after an exact anchor', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-insert-in-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'alpha\nbeta\ngamma\n', 'utf-8');

    const result = await getTool().execute(
      { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
      { path: filePath, after_text: 'beta\n', new_text: 'inserted\n' }
    );

    expect(result).toBe(`Text inserted successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('alpha\nbeta\ninserted\ngamma\n');
  });

  it('requires exactly one anchor mode', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-insert-in-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'alpha\n', 'utf-8');

    await expect(
      getTool().execute(
        { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
        { path: filePath, before_text: 'alpha\n', after_text: 'alpha\n', new_text: 'inserted\n' }
      )
    ).rejects.toThrow('[invalid_anchor_selection]');
  });

  it('returns a helpful missing anchor error', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-insert-in-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'alpha\nbeta\n', 'utf-8');

    await expect(
      getTool().execute(
        { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
        { path: filePath, after_text: 'missing\n', new_text: 'inserted\n' }
      )
    ).rejects.toThrow('[anchor_not_found]');
  });

  it('resolves relative paths from the workspace root', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-insert-in-file-'));
    const filePath = path.join(tmpDir, 'relative.txt');
    await fs.writeFile(filePath, 'alpha\nbeta\n', 'utf-8');

    const result = await getTool().execute(
      { agentId: 'agent', workspaceRootPath: tmpDir } satisfies MockContext,
      { path: 'relative.txt', after_text: 'alpha\n', new_text: 'inserted\n' }
    );

    expect(result).toBe(`Text inserted successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('alpha\ninserted\nbeta\n');
  });

  it('rejects relative paths when no workspace root is configured', async () => {
    await expect(
      getTool().execute(
        { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
        { path: 'relative.txt', after_text: 'alpha\n', new_text: 'inserted\n' }
      )
    ).rejects.toThrow('but no workspace root is configured');
  });
});
