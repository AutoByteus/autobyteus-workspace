import { describe, it, expect } from 'vitest';
import { AnthropicJsonExampleFormatter } from '../../../../../src/tools/usage/formatters/anthropic-json-example-formatter.js';
import { DefaultXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/default-xml-example-formatter.js';
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

describe('AnthropicJsonExampleFormatter (integration)', () => {
  it('matches DefaultXmlExampleFormatter output', () => {
    const toolDef = new ToolDefinition(
      'NoArgTool',
      'Tool with no args.',
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: NoArgTool }
    );

    const anthropicOutput = new AnthropicJsonExampleFormatter().provide(toolDef);
    const xmlOutput = new DefaultXmlExampleFormatter().provide(toolDef);

    expect(anthropicOutput).toBe(xmlOutput);
  });
});
