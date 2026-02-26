import { describe, it, expect } from 'vitest';
import { DefaultXmlExampleFormatter } from '../../../../../src/tools/usage/formatters/default-xml-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../../../src/utils/parameter-schema.js';
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

describe('DefaultXmlExampleFormatter (integration)', () => {
  it('renders advanced example when optional params exist', () => {
    const formatter = new DefaultXmlExampleFormatter();
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'input_path',
      type: ParameterType.STRING,
      description: 'Input path.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'output_path',
      type: ParameterType.STRING,
      description: 'Optional output path.',
      required: false
    }));

    const toolDef = new ToolDefinition(
      'ComplexTool',
      'A complex tool.',
      ToolOrigin.LOCAL,
      'general',
      () => schema,
      () => null,
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);
    expect(output).toContain('### Example 2: Advanced Call (With Optional & Nested Arguments)');
  });
});
