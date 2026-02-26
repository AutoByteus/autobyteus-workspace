import { describe, it, expect } from 'vitest';
import { ToolFactory } from '../../../../src/tools/factory/tool-factory.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { ToolConfig } from '../../../../src/tools/tool-config.js';

class ConfigEchoTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve(this.config?.get('value'));
  }
  static getDescription() { return 'Config echo tool'; }
  static getArgumentSchema() { return null; }
}

class ConfigEchoFactory extends ToolFactory {
  createTool(config?: ToolConfig): BaseTool {
    return new ConfigEchoTool(config);
  }
}

describe('ToolFactory (integration)', () => {
  it('passes ToolConfig through factory', async () => {
    const factory = new ConfigEchoFactory();
    const tool = factory.createTool(new ToolConfig({ value: 'custom' }));
    const result = await tool.execute({ agentId: 'agent' }, {});
    expect(result).toBe('custom');
  });
});
