import { describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import { AgentTurn } from '../../../../src/agent/agent-turn.js';
import { ToolPhase } from '../../../../src/agent/loop/tool-phase.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { registerEditFileTool } from '../../../../src/tools/file/edit-file.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';

describe('ToolPhase edit_file failure envelope', () => {
  it('preserves the existing outer prefix around the actionable inner diagnostic', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tool-phase-edit-file-'));
    const filePath = path.join(tmpDir, 'target.txt');
    await fs.writeFile(filePath, 'alpha\nbeta\ngamma\n', 'utf-8');

    try {
      defaultToolRegistry.clear();
      registerEditFileTool();
      const tool = defaultToolRegistry.createTool('edit_file');
      const context = {
        agentId: 'agent',
        autoExecuteTools: true,
        config: { toolInvocationPreprocessors: [] },
        getTool: (name: string) => name === 'edit_file' ? tool : undefined
      } as unknown as AgentContext;
      const invocation = new ToolInvocation('edit_file', {
        path: filePath,
        patch: '@@\n alpha\n-delta\n+theta\n gamma\n'
      }, 'inv-edit-file');

      const [result] = await new ToolPhase().run(
        [invocation],
        context,
        new AgentTurn('turn-1'),
        null
      );

      expect(result.error).toContain(
        "Error executing tool 'edit_file' (ID: inv-edit-file): PatchApplicationError: " +
        'Could not apply context hunk 1 of 1 after exact and whitespace-tolerant matching.'
      );
      expect(result.error).toContain('No file changes were written.');
      expect(await fs.readFile(filePath, 'utf-8')).toBe('alpha\nbeta\ngamma\n');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
