import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionalTool, tool, _parseSignature } from '../../../src/tools/functional-tool.js';
import { ToolRegistry, defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../src/utils/parameter-schema.js';
import { ToolState } from '../../../src/tools/tool-state.js';
import { ToolCategory } from '../../../src/tools/tool-category.js';

describe('FunctionalTool', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
  });

  it('test_functional_tool_initialization_and_properties', () => {
    const mockFunc = vi.fn().mockResolvedValue('result');
    const argSchema = new ParameterSchema();
    argSchema.addParameter(new ParameterDefinition({
      name: 'p1',
      type: ParameterType.STRING,
      description: 'd'
    }));

    const toolInstance = new FunctionalTool(
      mockFunc,
      'MyTestTool',
      'A test description.',
      argSchema,
      null,
      true,
      false,
      false,
      ['p1'],
      ['p1']
    );

    expect(toolInstance.getName()).toBe('MyTestTool');
    expect(toolInstance.getDescription()).toBe('A test description.');
    expect(toolInstance.getArgumentSchema()).toBe(argSchema);
    expect(toolInstance.getConfigSchema()).toBeNull();
    expect((toolInstance as any)._isAsync).toBe(true);
    expect((toolInstance as any)._originalFunc).toBe(mockFunc);
    expect(toolInstance.toolState).toBeInstanceOf(ToolState);
  });

  it('test_functional_tool_execute_async_func_with_state', async () => {
    const mockFunc = vi.fn().mockResolvedValue('async_result');
    const toolInstance = new FunctionalTool(
      mockFunc,
      'AsyncExecTool',
      'd',
      new ParameterSchema(),
      null,
      true,
      true,
      true,
      ['arg1'],
      ['context', 'tool_state', 'arg1']
    );
    toolInstance.toolState.set('counter', 5);

    const result = await toolInstance.execute({ agentId: 'agent' }, { arg1: 'value1' });

    expect(result).toBe('async_result');
    expect(mockFunc).toHaveBeenCalledOnce();
    expect(mockFunc).toHaveBeenCalledWith(
      { agentId: 'agent' },
      toolInstance.toolState,
      'value1'
    );
  });

  it('test_functional_tool_execute_sync_func', async () => {
    const mockFunc = vi.fn().mockReturnValue('sync_result');
    const toolInstance = new FunctionalTool(
      mockFunc,
      'SyncExecTool',
      'd',
      new ParameterSchema(),
      null,
      false,
      false,
      false,
      ['arg1'],
      ['arg1']
    );

    const result = await toolInstance.execute({ agentId: 'agent' }, { arg1: 'value1' });

    expect(result).toBe('sync_result');
    expect(mockFunc).toHaveBeenCalledOnce();
    expect(mockFunc).toHaveBeenCalledWith('value1');
  });
});

describe('@tool decorator', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
  });

  it('test_tool_decorator_registers_definition', () => {
    const decorated = tool({
      name: 'DecoratedTool',
      description: 'Docstring for description.',
      paramTypeHints: { p1: ParameterType.STRING }
    })(function myDecoratedFunc(p1: string) { return p1; });

    expect(decorated).toBeInstanceOf(FunctionalTool);

    const definition = defaultToolRegistry.getToolDefinition('DecoratedTool');
    expect(definition).toBeInstanceOf(ToolDefinition);
    expect(definition?.name).toBe('DecoratedTool');
    expect(definition?.description).toBe('Docstring for description.');
    expect(typeof definition?.customFactory).toBe('function');
    expect(definition?.toolClass).toBeUndefined();

    const schema = definition?.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.getParameter('p1')).toBeDefined();
  });

  it('test_tool_decorator_returns_functional_tool_instance', () => {
    const decorated = tool(function anotherDecoratedFunc() { return undefined; });
    expect(decorated).toBeInstanceOf(FunctionalTool);
    expect(decorated.getName()).toBe('anotherDecoratedFunc');
  });

  it('test_tool_decorator_default_category', () => {
    const decorated = tool({ paramTypeHints: { name: ParameterType.STRING } })(function namedTool(name: string) {
      return name;
    });
    expect(decorated).toBeInstanceOf(FunctionalTool);
    const definition = defaultToolRegistry.getToolDefinition('namedTool');
    expect(definition?.category).toBe(ToolCategory.GENERAL);
  });
});

describe('_parseSignature', () => {
  it('test_parse_signature_simple_types', () => {
    const funcSimple = function (p_str: string, p_int: number, p_bool: boolean, p_float: number) {
      return undefined;
    };

    const [, expectsContext, expectsToolState, schema] = _parseSignature(
      funcSimple,
      'func_simple',
      {
        paramTypeHints: {
          p_str: ParameterType.STRING,
          p_int: ParameterType.INTEGER,
          p_bool: ParameterType.BOOLEAN,
          p_float: ParameterType.FLOAT
        }
      }
    );

    expect(expectsContext).toBe(false);
    expect(expectsToolState).toBe(false);
    expect(schema.getParameter('p_str')?.type).toBe(ParameterType.STRING);
    expect(schema.getParameter('p_int')?.type).toBe(ParameterType.INTEGER);
    expect(schema.getParameter('p_bool')?.type).toBe(ParameterType.BOOLEAN);
    expect(schema.getParameter('p_float')?.type).toBe(ParameterType.FLOAT);
    expect(schema.parameters.every((p) => p.required)).toBe(true);
  });

  it('test_parse_signature_with_optional_and_defaults', () => {
    const funcOptional = function (req_str: string, opt_int?: number, bool_default = true) {
      return undefined;
    };

    const [, , , schema] = _parseSignature(
      funcOptional,
      'func_optional',
      {
        paramTypeHints: {
          req_str: ParameterType.STRING,
          opt_int: ParameterType.INTEGER,
          bool_default: ParameterType.BOOLEAN
        },
        paramDefaults: {
          opt_int: null,
          bool_default: true
        }
      }
    );

    expect(schema.getParameter('req_str')?.required).toBe(true);

    const optIntParam = schema.getParameter('opt_int');
    expect(optIntParam?.required).toBe(false);
    expect(optIntParam?.defaultValue).toBeNull();
    expect(optIntParam?.type).toBe(ParameterType.INTEGER);

    const boolDefaultParam = schema.getParameter('bool_default');
    expect(boolDefaultParam?.required).toBe(false);
    expect(boolDefaultParam?.defaultValue).toBe(true);
    expect(boolDefaultParam?.type).toBe(ParameterType.BOOLEAN);
  });

  it('test_parse_signature_with_context_and_state', () => {
    const funcWithContext = function (context: any, tool_state: Record<string, any>, p1: string) {
      return undefined;
    };

    const [paramNames, expectsContext, expectsToolState, schema] = _parseSignature(
      funcWithContext,
      'func_with_context',
      { paramTypeHints: { p1: ParameterType.STRING } }
    );

    expect(expectsContext).toBe(true);
    expect(expectsToolState).toBe(true);
    expect(paramNames).toEqual(['p1']);
    expect(schema.getParameter('context')).toBeUndefined();
    expect(schema.getParameter('tool_state')).toBeUndefined();
    expect(schema.getParameter('p1')).toBeDefined();
    expect(schema.parameters.length).toBe(1);
  });

  it('test_parse_signature_with_collections', () => {
    const funcCollections = function (p_list: string[], p_dict: Record<string, any>, p_untyped_list: any[]) {
      return undefined;
    };

    const [, , , schema] = _parseSignature(
      funcCollections,
      'func_collections',
      {
        paramTypeHints: {
          p_list: { type: ParameterType.ARRAY, arrayItemSchema: { type: 'string' } },
          p_dict: ParameterType.OBJECT,
          p_untyped_list: ParameterType.ARRAY
        }
      }
    );

    const listParam = schema.getParameter('p_list');
    expect(listParam?.type).toBe(ParameterType.ARRAY);
    expect(listParam?.arrayItemSchema).toEqual({ type: 'string' });

    const dictParam = schema.getParameter('p_dict');
    expect(dictParam?.type).toBe(ParameterType.OBJECT);

    const untypedListParam = schema.getParameter('p_untyped_list');
    expect(untypedListParam?.type).toBe(ParameterType.ARRAY);
    expect(untypedListParam?.arrayItemSchema).toEqual({});
  });

});
