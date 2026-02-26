import { describe, it, expect } from 'vitest';
import { OpenAiJsonSchemaFormatter } from '../../../../../src/tools/usage/formatters/openai-json-schema-formatter.js';
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

describe('OpenAiJsonSchemaFormatter (integration)', () => {
  it('produces function schema for tools without arguments', () => {
    const formatter = new OpenAiJsonSchemaFormatter();
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
      type: 'function',
      function: {
        name: 'NoArgTool',
        description: 'Tool with no args.',
        parameters: { type: 'object', properties: {}, required: [] }
      }
    });
  });
});
