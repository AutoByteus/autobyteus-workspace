import { describe, it, expect } from 'vitest';
import { DefaultJsonExampleFormatter } from '../../../../../src/tools/usage/formatters/default-json-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  static getName() {
    return 'dummy_tool';
  }

  static getDescription() {
    return 'Dummy tool for tests.';
  }

  static getArgumentSchema() {
    return null;
  }

  protected async _execute(): Promise<any> {
    return null;
  }
}

describe('DefaultJsonExampleFormatter (integration)', () => {
  it('formats output with required section header', () => {
    const formatter = new DefaultJsonExampleFormatter();
    const toolDef = new ToolDefinition(
      'SimpleTool',
      'A simple tool.',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);
    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
  });
});
