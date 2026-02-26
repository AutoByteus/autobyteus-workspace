import { describe, it, expect } from 'vitest';
import { BaseTool } from '../../../src/tools/base-tool.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../src/utils/parameter-schema.js';

class ComplexTool extends BaseTool {
  protected _execute(_context: any, kwargs: Record<string, any>): Promise<any> {
    return Promise.resolve(kwargs);
  }
  static getDescription() { return 'Complex tool'; }
  static getArgumentSchema() { return ComplexTool.schema; }
  static schema: ParameterSchema | null = null;
}

describe('BaseTool (integration)', () => {
  it('coerces nested objects and arrays end-to-end', async () => {
    const nestedSchema = new ParameterSchema();
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'threshold',
      type: ParameterType.FLOAT,
      description: 'Threshold',
      required: true
    }));
    nestedSchema.addParameter(new ParameterDefinition({
      name: 'active',
      type: ParameterType.BOOLEAN,
      description: 'Active',
      required: false
    }));

    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'config',
      type: ParameterType.OBJECT,
      description: 'Config',
      required: true,
      objectSchema: nestedSchema
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'items',
      type: ParameterType.ARRAY,
      description: 'Items',
      required: false,
      arrayItemSchema: {
        type: 'object',
        properties: {
          index: { type: 'integer', description: 'Index' },
          flag: { type: 'boolean', description: 'Flag' },
          tags: { type: 'array', description: 'Tags', items: { type: 'string' } }
        },
        required: ['index']
      }
    }));

    ComplexTool.schema = schema;
    const tool = new ComplexTool();

    const result = await tool.execute(
      { agentId: 'agent-99' },
      {
        config: { threshold: '0.75', active: 'true' },
        items: [
          { index: '7', flag: 'no', tags: ['a', 'b'] },
          { index: 3, flag: true, tags: [] }
        ]
      }
    );

    expect(result).toEqual({
      config: { threshold: 0.75, active: true },
      items: [
        { index: 7, flag: false, tags: ['a', 'b'] },
        { index: 3, flag: true, tags: [] }
      ]
    });
  });
});
