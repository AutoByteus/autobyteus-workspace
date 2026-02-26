import { describe, it, expect } from 'vitest';
import { OpenAiJsonSchemaFormatter } from '../../../../../src/tools/usage/formatters/openai-json-schema-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

class DummyComplexTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'Processes a file with advanced options.'; }
  static getArgumentSchema() { return null; }
}

describe('OpenAiJsonSchemaFormatter', () => {
  it('provides OpenAI JSON function format', () => {
    const formatter = new OpenAiJsonSchemaFormatter();
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
      'general',
      () => schema,
      () => null,
      { toolClass: DummyComplexTool }
    );

    const output = formatter.provide(toolDef);

    expect(output.type).toBe('function');
    expect(output.function.name).toBe('AdvancedFileProcessor');
    expect(output.function.description).toBe('Processes a file with advanced options.');
    expect(output.function.parameters.type).toBe('object');
    expect(output.function.parameters.properties.input_path).toBeDefined();
    expect(output.function.parameters.properties.overwrite).toBeDefined();
    expect(output.function.parameters.required).toContain('input_path');
    expect(output.function.parameters.required).not.toContain('overwrite');
  });
});
