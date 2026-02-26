import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { registerWriteFileTool } from '../../../../src/tools/file/write-file.js';

const TOOL_NAME_WRITE_FILE = 'write_file';

type MockWorkspace = { getBasePath: () => string };
type MockContext = { agentId: string; workspace: MockWorkspace | null };

describe('write_file tool (integration)', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerWriteFileTool();
  });

  const getToolInstance = (): BaseTool => {
    const tool = defaultToolRegistry.createTool(TOOL_NAME_WRITE_FILE);
    return tool as BaseTool;
  };

  it('creates a file at an absolute path', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-write-file-'));
    const filePath = path.join(tmpDir, 'test_writer1.txt');
    const content = 'Functional Test Content 1 with Ümlauts';
    const expectedMessage = `File created/updated at ${filePath}`;

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    const result = await tool.execute(context, { path: filePath, content });

    expect(result).toBe(expectedMessage);
    const written = await fs.readFile(filePath, 'utf-8');
    expect(written).toBe(content);
  });

  it('creates a file in a new directory', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-write-file-'));
    const filePath = path.join(tmpDir, 'new_subdir', 'test_writer2.txt');
    const content = 'Content in new subdir';
    const expectedMessage = `File created/updated at ${filePath}`;

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    const result = await tool.execute(context, { path: filePath, content });

    expect(result).toBe(expectedMessage);
    const written = await fs.readFile(filePath, 'utf-8');
    expect(written).toBe(content);
  });

  it('requires path and content arguments', async () => {
    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    await expect(tool.execute(context, { content: 'Test Content' })).rejects.toThrow(
      `Invalid arguments for tool '${TOOL_NAME_WRITE_FILE}'`
    );
    await expect(tool.execute(context, { path: '/tmp/test.txt' })).rejects.toThrow(
      `Invalid arguments for tool '${TOOL_NAME_WRITE_FILE}'`
    );
  });

  it('writes empty content', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-write-file-'));
    const filePath = path.join(tmpDir, 'empty_writer_file.txt');
    const content = '';
    const expectedMessage = `File created/updated at ${filePath}`;

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    const result = await tool.execute(context, { path: filePath, content });

    expect(result).toBe(expectedMessage);
    const written = await fs.readFile(filePath, 'utf-8');
    expect(written).toBe(content);
  });

  it('overwrites existing file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-write-file-'));
    const filePath = path.join(tmpDir, 'existing_writer_file.txt');
    await fs.writeFile(filePath, 'Initial', 'utf-8');

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    const result = await tool.execute(context, { path: filePath, content: 'Overwritten Functional Content' });

    expect(result).toBe(`File created/updated at ${filePath}`);
    const written = await fs.readFile(filePath, 'utf-8');
    expect(written).toBe('Overwritten Functional Content');
  });

  it('returns relative path when workspace is used', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-write-file-'));
    const relPath = path.join('subdir', 'relative.txt');
    const fullPath = path.join(tmpDir, relPath);
    const content = 'Relative content';

    const tool = getToolInstance();
    const context: MockContext = {
      agentId: 'agent',
      workspace: { getBasePath: () => tmpDir }
    };

    const result = await tool.execute(context, { path: relPath, content });
    expect(result).toBe(`File created/updated at ${path.normalize(relPath)}`);

    const written = await fs.readFile(fullPath, 'utf-8');
    expect(written).toBe(content);
  });

  it('wraps IO errors', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-write-file-'));
    const filePath = path.join(tmpDir, 'writer_io_error.txt');
    const spy = vi.spyOn(fs, 'writeFile').mockRejectedValue(new Error('Simulated write permission denied'));

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };

    await expect(
      tool.execute(context, { path: filePath, content: 'test' })
    ).rejects.toThrow(`Could not write file at '${filePath}': Simulated write permission denied`);

    spy.mockRestore();
  });
});
