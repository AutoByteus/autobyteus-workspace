import { describe, it, expect } from 'vitest';
import { DefaultJsonExampleFormatter } from '../../../../../src/tools/usage/formatters/default-json-example-formatter.js';
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

const extractJsonFromBlock = (blockText: string): any => {
  const match = blockText.match(/```json\s*([\s\S]+?)\s*```/);
  if (!match) {
    throw new Error('Could not find JSON code block in text');
  }
  return JSON.parse(match[1]);
};

describe('DefaultJsonExampleFormatter', () => {
  it('simple tool provides single example', () => {
    const formatter = new DefaultJsonExampleFormatter();
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
      'general',
      () => schema,
      () => null,
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);
    expect(typeof output).toBe('string');
    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(output).not.toContain('### Example 2:');

    const parsed = extractJsonFromBlock(output);
    expect(parsed.tool.function).toBe('SimpleTool');
    expect(parsed.tool.parameters).toEqual({ input_path: 'example_input_path' });
  });

  it('complex tool provides multiple examples', () => {
    const formatter = new DefaultJsonExampleFormatter();
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
      'general',
      () => schema,
      () => null,
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);
    const parts = output.split('\n\n');
    expect(parts.length).toBe(2);

    const [basicBlock, advancedBlock] = parts;
    expect(basicBlock).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(advancedBlock).toContain('### Example 2: Advanced Call (With Optional Arguments)');

    const basicJson = extractJsonFromBlock(basicBlock);
    expect(basicJson.tool.function).toBe('ComplexTool');
    expect(basicJson.tool.parameters).toEqual({ input_path: 'example_input_path' });

    const advancedJson = extractJsonFromBlock(advancedBlock);
    expect(advancedJson.tool.function).toBe('ComplexTool');
    expect(advancedJson.tool.parameters).toEqual({ input_path: 'example_input_path', retries: 3 });
  });
});
