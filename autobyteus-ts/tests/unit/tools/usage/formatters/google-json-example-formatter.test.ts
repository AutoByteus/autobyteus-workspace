import { describe, it, expect } from 'vitest';
import { GoogleJsonExampleFormatter } from '../../../../../src/tools/usage/formatters/google-json-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ToolCategory } from '../../../../../src/tools/tool-category.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

const extractJsonFromBlock = (blockText: string): any => {
  const match = blockText.match(/```json\s*([\s\S]+?)\s*```/);
  if (!match) {
    throw new Error('Could not find JSON code block in text');
  }
  return JSON.parse(match[1]);
};

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() {
    return 'A dummy tool.';
  }
  static getArgumentSchema() {
    return null;
  }
}

describe('GoogleJsonExampleFormatter', () => {
  it('simple tool provides single example', () => {
    const formatter = new GoogleJsonExampleFormatter();

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
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);

    expect(typeof output).toBe('string');
    expect(output).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(output).not.toContain('### Example 2:');

    const parsed = extractJsonFromBlock(output);
    expect(parsed.name).toBe('SimpleTool');
    expect(parsed.args).toEqual({ input_path: 'example_string' });
  });

  it('complex tool provides multiple examples', () => {
    const formatter = new GoogleJsonExampleFormatter();

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
      { toolClass: DummyTool }
    );

    const output = formatter.provide(toolDef);

    expect(typeof output).toBe('string');
    const parts = output.split('\n\n');
    expect(parts).toHaveLength(2);

    const [basicBlock, advancedBlock] = parts;
    expect(basicBlock).toContain('### Example 1: Basic Call (Required Arguments)');
    expect(advancedBlock).toContain('### Example 2: Advanced Call (With Optional Arguments)');

    const basicJson = extractJsonFromBlock(basicBlock);
    expect(basicJson.name).toBe('ComplexTool');
    expect(basicJson.args).toEqual({ input_path: 'example_string' });

    const advancedJson = extractJsonFromBlock(advancedBlock);
    expect(advancedJson.name).toBe('ComplexTool');
    expect(advancedJson.args).toEqual({ input_path: 'example_string', retries: 3 });
  });
});
