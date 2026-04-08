import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { registerInsertInFileTool } from '../../../../src/tools/file/insert-in-file.js';

const TOOL_NAME = 'insert_in_file';

type MockContext = { agentId: string; workspaceRootPath: string | null };

describe('insert_in_file tool (integration)', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
    registerInsertInFileTool();
  });

  const getTool = (): BaseTool => defaultToolRegistry.createTool(TOOL_NAME) as BaseTool;

  it('inserts content on disk after an anchor', async () => {
    const tmpDir = await fs.mkdtemp(path.join(process.cwd(), 'tmp-insert-in-file-'));
    const filePath = path.join(tmpDir, 'sample.txt');
    await fs.writeFile(filePath, 'line1\nline2\nline3\n', 'utf-8');

    const result = await getTool().execute(
      { agentId: 'agent', workspaceRootPath: null } satisfies MockContext,
      { path: filePath, after_text: 'line2\n', new_text: 'inserted\n' }
    );

    expect(result).toBe(`Text inserted successfully at ${filePath}`);
    expect(await fs.readFile(filePath, 'utf-8')).toBe('line1\nline2\ninserted\nline3\n');
  });
});
