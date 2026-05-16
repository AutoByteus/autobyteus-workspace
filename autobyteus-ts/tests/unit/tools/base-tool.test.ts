import { describe, it, expect } from 'vitest';
import { BaseTool } from '../../../src/tools/base-tool.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../src/utils/parameter-schema.js';
import { parseXmlArguments } from '../../../src/agent/streaming/adapters/tool-call-parsing.js';

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

class ExternalPreparationTool extends BaseTool<unknown, Record<string, unknown>, Record<string, unknown>> {
  public executeCalls = 0;

  static schema: ParameterSchema | null = null;

  static getDescription() { return 'External preparation tool'; }
  static getArgumentSchema() { return ExternalPreparationTool.schema; }

  protected getToolResultExecutionMode(): 'external_result' {
    return 'external_result';
  }

  protected _execute(_context: unknown, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    this.executeCalls += 1;
    return Promise.resolve(args);
  }
}

class FailingModeTool extends ExternalPreparationTool {
  static getDescription() { return 'Failing mode tool'; }

  protected getToolResultExecutionMode(): 'external_result' {
    throw new Error('mode unavailable');
  }
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

  it('test_execute_accepts_array_args_parsed_from_xml', async () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'audio_paths',
      type: ParameterType.ARRAY,
      description: 'Audio paths',
      required: true,
      arrayItemSchema: ParameterType.STRING
    }));
    schema.addParameter(new ParameterDefinition({
      name: 'output_audio_path',
      type: ParameterType.STRING,
      description: 'Output audio path',
      required: true
    }));
    RecordingTool.schema = schema;
    const tool = new RecordingTool();

    const args = parseXmlArguments(
      '<arguments>' +
        '<arg name="audio_paths"><item>/tmp/1.wav</item><item>/tmp/2.wav</item></arg>' +
        '<arg name="output_audio_path">/tmp/out.wav</arg>' +
      '</arguments>'
    );

    const result = await tool.execute({ agentId: 'agent-1' }, args);
    expect(result).toEqual({
      audio_paths: ['/tmp/1.wav', '/tmp/2.wav'],
      output_audio_path: '/tmp/out.wav'
    });
  });

  it('test_prepare_execution_coerces_validates_and_does_not_execute', async () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'count',
      type: ParameterType.INTEGER,
      description: 'Count',
      required: true
    }));
    ExternalPreparationTool.schema = schema;
    const tool = new ExternalPreparationTool();

    const preparation = await tool.prepareExecution({ agentId: 'agent-1' }, { count: '9' });

    expect(preparation).toEqual({
      toolName: 'ExternalPreparationTool',
      args: { count: 9 },
      resultExecutionMode: 'external_result'
    });
    expect((tool as any).agentId).toBe('agent-1');
    expect(tool.executeCalls).toBe(0);
  });

  it('test_prepare_execution_preserves_validation_errors_and_mode_errors', async () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'count',
      type: ParameterType.INTEGER,
      description: 'Count',
      required: true
    }));
    ExternalPreparationTool.schema = schema;
    const tool = new ExternalPreparationTool();

    await expect(tool.prepareExecution({ agentId: 'agent-1' }, {})).rejects.toThrow(
      "Invalid arguments for tool 'ExternalPreparationTool'"
    );
    expect(tool.executeCalls).toBe(0);

    const failingModeTool = new FailingModeTool();
    await expect(failingModeTool.prepareExecution({ agentId: 'agent-1' }, { count: '1' })).rejects.toThrow(
      'mode unavailable'
    );
    expect(failingModeTool.executeCalls).toBe(0);
  });
});
