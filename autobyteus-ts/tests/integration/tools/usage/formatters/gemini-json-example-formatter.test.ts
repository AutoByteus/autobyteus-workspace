import { describe, it, expect } from 'vitest';
import { GeminiJsonExampleFormatter } from '../../../../../src/tools/usage/formatters/gemini-json-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

const extractJsonFromBlock = (blockText: string): any => {
  const match = blockText.match(/```json\s*([\s\S]+?)\s*```/);
  if (!match) {
    throw new Error('Could not find JSON code block in text');
  }
  return JSON.parse(match[1]);
};

class NoArgTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'No-arg tool'; }
  static getArgumentSchema() { return null; }
}

describe('GeminiJsonExampleFormatter (integration)', () => {
  it('produces a single example with empty args for tools without arguments', () => {
    const formatter = new GeminiJsonExampleFormatter();
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

    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(output).not.toContain('### Example 2:');

    const parsed = extractJsonFromBlock(output);
    expect(parsed).toEqual({
      name: 'NoArgTool',
      args: {}
    });
  });
});
