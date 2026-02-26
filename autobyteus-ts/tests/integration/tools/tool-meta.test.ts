import { describe, it, expect, beforeEach } from 'vitest';
import { registerToolClass } from '../../../src/tools/tool-meta.js';
import { defaultToolRegistry, ToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { BaseTool } from '../../../src/tools/base-tool.js';

class ExecutableTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve('executed');
  }
  static getDescription() { return 'Executable tool'; }
  static getArgumentSchema() { return null; }
}

describe('registerToolClass (integration)', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
  });

  it('registers and creates tool instances', async () => {
    expect(registerToolClass(ExecutableTool)).toBe(true);
    const instance = defaultToolRegistry.createTool('ExecutableTool');
    expect(instance).toBeInstanceOf(ExecutableTool);
    expect(await instance.execute({ agentId: 'agent-1' }, {})).toBe('executed');
  });
});
