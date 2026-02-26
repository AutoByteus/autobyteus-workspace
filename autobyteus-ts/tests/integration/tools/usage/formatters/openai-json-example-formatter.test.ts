import { describe, it, expect } from 'vitest';
import { OpenAiJsonExampleFormatter } from '../../../../../src/tools/usage/formatters/openai-json-example-formatter.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ToolCategory } from '../../../../../src/tools/tool-category.js';

describe('OpenAiJsonExampleFormatter (integration)', () => {
  it('emits OpenAI tool call example JSON', () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'query',
      type: ParameterType.STRING,
      description: 'Search query.',
      required: true
    }));

    const toolDef = new ToolDefinition(
      'SearchTool',
      'Search tool',
      ToolOrigin.LOCAL,
      ToolCategory.GENERAL,
      () => schema,
      () => null,
      { customFactory: () => ({} as any) }
    );

    const formatter = new OpenAiJsonExampleFormatter();
    const output = formatter.provide(toolDef);
    expect(output).toContain('"function"');
    expect(output).toContain('"arguments"');
    expect(output).toContain('"query"');
  });
});
