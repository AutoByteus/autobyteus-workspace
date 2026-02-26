import { describe, it, expect } from 'vitest';
import { AnthropicJsonSchemaFormatter } from '../../../../../src/tools/usage/formatters/anthropic-json-schema-formatter.js';
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
    return 'Processes a file with advanced options.';
  }
  static getArgumentSchema() {
    return null;
  }
}

describe('AnthropicJsonSchemaFormatter', () => {
  it('provides Anthropic JSON format for complex tool', () => {
    const formatter = new AnthropicJsonSchemaFormatter();

    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'input_path',
      type: ParameterType.STRING,
      description: 'The path to the input file.',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'overwrite',
      type: ParameterType.BOOLEAN,
      description: 'Overwrite existing file.',
      required: false,
      defaultValue: false
    }));

    const toolDef = new ToolDefinition(
      'AdvancedFileProcessor',
      'Processes a file with advanced options.',
      ToolOrigin.LOCAL,
      ToolCategory.GENERAL,
      () => schema,
      () => null,
      { toolClass: DummyComplexTool }
    );

    const jsonOutput = formatter.provide(toolDef);

    expect(jsonOutput.name).toBe('AdvancedFileProcessor');
    expect(jsonOutput.description).toBe('Processes a file with advanced options.');

    const inputSchema = jsonOutput.input_schema;
    expect(inputSchema).toBeDefined();
    expect(inputSchema.properties.input_path).toBeDefined();
    expect(inputSchema.properties.overwrite).toBeDefined();
    expect(inputSchema.required).toContain('input_path');
  });
});
