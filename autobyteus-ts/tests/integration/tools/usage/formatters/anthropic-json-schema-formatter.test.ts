import { describe, it, expect } from 'vitest';
import { AnthropicJsonSchemaFormatter } from '../../../../../src/tools/usage/formatters/anthropic-json-schema-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

class NoArgTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'No-arg tool'; }
  static getArgumentSchema() { return null; }
}

describe('AnthropicJsonSchemaFormatter (integration)', () => {
  it('produces empty input_schema for tools without arguments', () => {
    const formatter = new AnthropicJsonSchemaFormatter();
    const toolDef = new ToolDefinition(
      'NoArgTool',
      'Tool with no args.',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: NoArgTool }
    );

    const output = formatter.provide(toolDef);

    expect(output).toEqual({
      name: 'NoArgTool',
      description: 'Tool with no args.',
      input_schema: { type: 'object', properties: {}, required: [] }
    });
  });
});
