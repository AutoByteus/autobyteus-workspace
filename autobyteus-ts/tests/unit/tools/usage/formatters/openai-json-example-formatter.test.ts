import { describe, it, expect } from 'vitest';
import { OpenAiJsonExampleFormatter } from '../../../../../src/tools/usage/formatters/openai-json-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ToolCategory } from '../../../../../src/tools/tool-category.js';

const extractJsonFromBlock = (blockText: string): any => {
  const match = blockText.match(/```json\s*([\s\S]+?)\s*```/);
  if (!match) {
    throw new Error('Could not find JSON code block in text');
  }
  return JSON.parse(match[1]);
};

describe('OpenAiJsonExampleFormatter', () => {
  it('test_simple_tool_provides_single_example', () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'input_path',
      type: ParameterType.STRING,
      description: 'Input path.',
      required: true
    }));

    const toolDef = new ToolDefinition(
      'SimpleTool',
      'A simple tool.',
      ToolOrigin.LOCAL,
      ToolCategory.GENERAL,
      () => schema,
      () => null,
      { customFactory: () => ({} as any) }
    );

    const formatter = new OpenAiJsonExampleFormatter();
    const output = formatter.provide(toolDef);

    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(output).not.toContain('### Example 2:');

    const parsed = extractJsonFromBlock(output);
    const functionPart = parsed.tool.function;
    expect(functionPart.name).toBe('SimpleTool');
    expect(functionPart.arguments).toEqual({ input_path: 'example_string' });
  });

  it('test_complex_tool_provides_multiple_examples', () => {
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
      { customFactory: () => ({} as any) }
    );

    const formatter = new OpenAiJsonExampleFormatter();
    const output = formatter.provide(toolDef);

    const parts = output.split('\n\n');
    expect(parts.length).toBe(2);

    const basicBlock = parts[0];
    const advancedBlock = parts[1];

    expect(basicBlock).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(advancedBlock).toContain('### Example 2: Advanced Call (With Optional Arguments)');

    const basicJson = extractJsonFromBlock(basicBlock);
    expect(basicJson.tool.function.name).toBe('ComplexTool');
    expect(basicJson.tool.function.arguments).toEqual({ input_path: 'example_string' });

    const advancedJson = extractJsonFromBlock(advancedBlock);
    expect(advancedJson.tool.function.name).toBe('ComplexTool');
    expect(advancedJson.tool.function.arguments).toEqual({ input_path: 'example_string', retries: 3 });
  });
});
