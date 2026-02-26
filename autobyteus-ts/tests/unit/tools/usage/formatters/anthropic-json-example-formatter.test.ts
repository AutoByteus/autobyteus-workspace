import { describe, it, expect } from 'vitest';
import { AnthropicJsonExampleFormatter } from '../../../../../src/tools/usage/formatters/anthropic-json-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ToolCategory } from '../../../../../src/tools/tool-category.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

class DummyComplexTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() {
    return 'A complex tool.';
  }
  static getArgumentSchema() {
    return null;
  }
}

describe('AnthropicJsonExampleFormatter', () => {
  it('provides Anthropic XML example output', () => {
    const formatter = new AnthropicJsonExampleFormatter();

    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'input_path',
      type: ParameterType.STRING,
      description: 'Input path.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'retries',
      type: ParameterType.INTEGER,
      description: 'Number of retries.',
      required: false,
      defaultValue: 3
    }));

    const toolDef = new ToolDefinition(
      'ComplexTool',
      'A complex tool.',
      ToolOrigin.LOCAL,
      ToolCategory.GENERAL,
      () => schema,
      () => null,
      { toolClass: DummyComplexTool }
    );

    const xmlOutput = formatter.provide(toolDef);

    expect(typeof xmlOutput).toBe('string');
    expect(xmlOutput).toContain('<tool name="ComplexTool">');
    expect(xmlOutput).toContain('<arg name="input_path">A valid string for \'input_path\'</arg>');
    expect(xmlOutput).toContain('<arg name="retries">3</arg>');
  });
});
