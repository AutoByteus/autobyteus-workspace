import { describe, it, expect } from 'vitest';
import { BaseTool } from '../../../src/tools/base-tool.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../src/utils/parameter-schema.js';

class RecordingTool extends BaseTool {
  public lastArgs: Record<string, unknown> | null = null;
  protected _execute(_context: unknown, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.lastArgs = args;
    return Promise.resolve(args);
  }
  static getDescription() { return 'Recording tool'; }
  static getArgumentSchema() { return RecordingTool.schema; }

  static schema: ParameterSchema | null = null;
}

describe('BaseTool', () => {
  it('test_set_agent_id_validates', () => {
    const tool = new RecordingTool();
    tool.setAgentId('agent-1');
    expect((tool as any).agentId).toBe('agent-1');

    tool.setAgentId('');
    expect((tool as any).agentId).toBe('agent-1');

    tool.setAgentId(null as any);
    expect((tool as any).agentId).toBe('agent-1');
  });

  it('test_execute_coerces_and_sets_agent_id', async () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'count',
      type: ParameterType.INTEGER,
      description: 'Count',
      required: true
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'ratio',
      type: ParameterType.FLOAT,
      description: 'Ratio',
      required: false
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'enabled',
      type: ParameterType.BOOLEAN,
      description: 'Enabled',
      required: false
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
          flag: { type: 'boolean', description: 'Flag' }
        },
        required: ['index']
      }
    }));

    RecordingTool.schema = schema;
    const tool = new RecordingTool();

    const result = await tool.execute(
      { agentId: 'agent-123' },
      {
        count: '12',
        ratio: '3.5',
        enabled: 'yes',
        items: [{ index: '4', flag: 'false' }]
      }
    );

    expect((tool as any).agentId).toBe('agent-123');
    expect(result).toEqual({
      count: 12,
      ratio: 3.5,
      enabled: true,
      items: [{ index: 4, flag: false }]
    });
  });

  it('test_execute_missing_required_raises', async () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'count',
      type: ParameterType.INTEGER,
      description: 'Count',
      required: true
    }));
    RecordingTool.schema = schema;
    const tool = new RecordingTool();

    await expect(tool.execute({ agentId: 'agent-1' }, {})).rejects.toThrow(
      "Invalid arguments for tool 'RecordingTool'"
    );
  });

  it('test_execute_invalid_type_raises', async () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'count',
      type: ParameterType.INTEGER,
      description: 'Count',
      required: true
    }));
    RecordingTool.schema = schema;
    const tool = new RecordingTool();

    await expect(tool.execute({ agentId: 'agent-1' }, { count: 'not-a-number' })).rejects.toThrow(
      "Invalid arguments for tool 'RecordingTool'"
    );
  });

  it('test_execute_allows_args_without_schema', async () => {
    RecordingTool.schema = null;
    const tool = new RecordingTool();
    const result = await tool.execute({ agentId: 'agent-1' }, { message: 'hello' });
    expect(result).toEqual({ message: 'hello' });
  });

  it('test_array_empty_string_coerces_to_empty_list', async () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'items',
      type: ParameterType.ARRAY,
      description: 'Items',
      required: false,
      arrayItemSchema: ParameterType.STRING
    }));
    RecordingTool.schema = schema;
    const tool = new RecordingTool();

    const result = await tool.execute({ agentId: 'agent-1' }, { items: '' });
    expect(result).toEqual({ items: [] });
  });
});
