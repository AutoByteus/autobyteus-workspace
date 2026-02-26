import { describe, it, expect } from 'vitest';
import { formatToolUsageInfo } from '../../../src/tools/utils.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'Dummy tool'; }
  static getArgumentSchema() { return null; }
}

describe('formatToolUsageInfo', () => {
  it('formats usage for tools with definitions', () => {
    const tool = new DummyTool();
    tool.definition = new ToolDefinition(
      'DummyTool',
      'Dummy tool',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: DummyTool }
    );

    const result = formatToolUsageInfo([tool]);
    expect(result).toContain('1 <tool name="DummyTool"');
    expect(result).toContain('Dummy tool');
  });
});
