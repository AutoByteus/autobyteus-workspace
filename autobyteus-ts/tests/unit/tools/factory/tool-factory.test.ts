import { describe, it, expect } from 'vitest';
import { ToolFactory } from '../../../../src/tools/factory/tool-factory.js';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { ToolConfig } from '../../../../src/tools/tool-config.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve('ok');
  }
  static getDescription() { return 'Dummy tool'; }
  static getArgumentSchema() { return null; }
}

class DummyFactory extends ToolFactory {
  createTool(config?: ToolConfig): BaseTool {
    return new DummyTool(config);
  }
}

describe('ToolFactory', () => {
  it('creates tool instances via subclass', () => {
    const factory = new DummyFactory();
    const tool = factory.createTool(new ToolConfig({ key: 'value' }));
    expect(tool).toBeInstanceOf(DummyTool);
  });
});
