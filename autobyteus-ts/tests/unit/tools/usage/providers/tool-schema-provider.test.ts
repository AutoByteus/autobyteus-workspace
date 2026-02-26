import { describe, it, expect, beforeEach } from 'vitest';
import { ToolSchemaProvider } from '../../../../../src/tools/usage/providers/tool-schema-provider.js';
import { ToolRegistry } from '../../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../../src/tools/registry/tool-definition.js';
import { ToolOrigin } from '../../../../../src/tools/tool-origin.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../../src/utils/parameter-schema.js';
import { LLMProvider } from '../../../../../src/llm/providers.js';
import { BaseTool } from '../../../../../src/tools/base-tool.js';

class DummyTool extends BaseTool {
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'Dummy tool.'; }
  static getArgumentSchema() { return null; }
}

const createToolDefinition = (name: string, schema: ParameterSchema | null): ToolDefinition => {
  return new ToolDefinition(
    name,
    `${name} description`,
    ToolOrigin.LOCAL,
    'general',
    () => schema,
    () => null,
    { toolClass: DummyTool }
  );
};

describe('ToolSchemaProvider', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    (ToolRegistry as any).instance = undefined;
    registry = new ToolRegistry();
  });

  it('builds OpenAI schemas by default', () => {
    const schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'input',
        type: ParameterType.STRING,
        description: 'Input value.',
        required: true
      })
    ]);
    registry.registerTool(createToolDefinition('ToolA', schema));

    const provider = new ToolSchemaProvider(registry);
    const output = provider.buildSchema(['ToolA'], null);

    expect(output).toHaveLength(1);
    expect(output[0].type).toBe('function');
    expect(output[0].function.name).toBe('ToolA');
    expect(output[0].function.parameters.required).toContain('input');
  });

  it('builds Anthropic schemas when provider is ANTHROPIC', () => {
    const schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'path',
        type: ParameterType.STRING,
        description: 'Path value.',
        required: true
      })
    ]);
    registry.registerTool(createToolDefinition('ToolB', schema));

    const provider = new ToolSchemaProvider(registry);
    const output = provider.buildSchema(['ToolB'], LLMProvider.ANTHROPIC);

    expect(output).toHaveLength(1);
    expect(output[0].name).toBe('ToolB');
    expect(output[0].input_schema.required).toContain('path');
  });

  it('builds Gemini schemas when provider is GEMINI', () => {
    const schema = new ParameterSchema([
      new ParameterDefinition({
        name: 'count',
        type: ParameterType.INTEGER,
        description: 'Count value.',
        required: true
      })
    ]);
    registry.registerTool(createToolDefinition('ToolC', schema));

    const provider = new ToolSchemaProvider(registry);
    const output = provider.buildSchema(['ToolC'], LLMProvider.GEMINI);

    expect(output).toHaveLength(1);
    expect(output[0].name).toBe('ToolC');
    expect(output[0].parameters.required).toContain('count');
  });

  it('skips unknown tool names', () => {
    const provider = new ToolSchemaProvider(registry);
    const output = provider.buildSchema(['MissingTool'], null);

    expect(output).toEqual([]);
  });
});
