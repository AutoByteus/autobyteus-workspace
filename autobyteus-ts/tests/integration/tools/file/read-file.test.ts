import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { defaultToolRegistry, ToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';

const TOOL_NAME_READ_FILE = 'read_file';

type MockWorkspace = { getBasePath: () => string };
type MockContext = { agentId: string; workspace: MockWorkspace | null };

describe('read_file tool (integration)', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerReadFileTool();
  });

  const getToolInstance = (): BaseTool => {
    const tool = defaultToolRegistry.createTool(TOOL_NAME_READ_FILE);
    return tool as BaseTool;
  };

  it('reads file content with line numbers', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-read-file-'));
    const filePath = path.join(tmpDir, 'test_file_reader.txt');
    await fs.writeFile(filePath, 'Test Content with Ümlauts for read_file', 'utf-8');

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    const content = await tool.execute(context, { path: filePath });

    expect(content).toBe('1: Test Content with Ümlauts for read_file');
  });

  it('reads file content without line numbers', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-read-file-'));
    const filePath = path.join(tmpDir, 'test_file_reader.txt');
    await fs.writeFile(filePath, 'Test Content with Ümlauts for read_file', 'utf-8');

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    const content = await tool.execute(context, { path: filePath, include_line_numbers: false });

    expect(content).toBe('Test Content with Ümlauts for read_file');
  });

  it('reads file with line range', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-read-file-'));
    const filePath = path.join(tmpDir, 'range_reader_file.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };

    const content = await tool.execute(context, { path: filePath, start_line: 2, end_line: 3 });
    expect(content).toBe('2: line2\n3: line3\n');

    const rawContent = await tool.execute(context, { path: filePath, start_line: 2, end_line: 3, include_line_numbers: false });
    expect(rawContent).toBe('line2\nline3\n');
  });

  it('rejects invalid line range', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-read-file-'));
    const filePath = path.join(tmpDir, 'invalid_range_reader_file.txt');
    await fs.writeFile(filePath, 'line1\nline2\n', 'utf-8');

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };

    await expect(
      tool.execute(context, { path: filePath, start_line: 3, end_line: 2 })
    ).rejects.toThrow('end_line (2) must be >= start_line (3).');
  });

  it('rejects missing path argument', async () => {
    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    await expect(tool.execute(context, {})).rejects.toThrow(`Invalid arguments for tool '${TOOL_NAME_READ_FILE}'`);
  });

  it('resolves relative paths against workspace', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-read-file-'));
    const filePath = path.join(tmpDir, 'relative_reader_test.txt');
    await fs.writeFile(filePath, 'Relative path content for read_file', 'utf-8');

    const tool = getToolInstance();
    const context: MockContext = {
      agentId: 'agent',
      workspace: { getBasePath: () => tmpDir }
    };

    const content = await tool.execute(context, { path: 'relative_reader_test.txt' });
    expect(content).toBe('1: Relative path content for read_file');
  });

  it('returns empty string for empty file', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-read-file-'));
    const filePath = path.join(tmpDir, 'empty_reader_file.txt');
    await fs.writeFile(filePath, '', 'utf-8');

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };
    const content = await tool.execute(context, { path: filePath });
    expect(content).toBe('');
  });

  it('throws when file does not exist', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-read-file-'));
    const tool = getToolInstance();
    const context: MockContext = {
      agentId: 'agent',
      workspace: { getBasePath: () => tmpDir }
    };

    await expect(
      tool.execute(context, { path: 'non_existent_reader_file.txt' })
    ).rejects.toThrow('does not exist');
  });

  it('wraps IO errors', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-read-file-'));
    const filePath = path.join(tmpDir, 'reader_io_error_file.txt');
    await fs.writeFile(filePath, 'content', 'utf-8');

    const spy = vi.spyOn(fs, 'readFile').mockRejectedValue(new Error('Simulated open error for read_file'));

    const tool = getToolInstance();
    const context: MockContext = { agentId: 'agent', workspace: null };

    await expect(
      tool.execute(context, { path: filePath })
    ).rejects.toThrow(`Could not read file at ${filePath}: Simulated open error for read_file`);

    spy.mockRestore();
  });
});
