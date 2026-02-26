import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GenericMcpTool } from '../../../../src/tools/mcp/tool.js';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../../src/utils/parameter-schema.js';

const mocks = vi.hoisted(() => ({
  callToolMock: vi.fn(),
  constructorSpy: vi.fn()
}));

vi.mock('../../../../src/tools/mcp/server/proxy.js', () => {
  class MockProxy {
    constructor(agentId: string, serverId: string) {
      mocks.constructorSpy(agentId, serverId);
    }

    callTool(toolName: string, args: Record<string, any>) {
      return mocks.callToolMock(toolName, args);
    }
  }

  return { McpServerProxy: MockProxy };
});

describe('GenericMcpTool', () => {
  beforeEach(() => {
    mocks.callToolMock.mockReset();
    mocks.constructorSpy.mockClear();
  });

  function buildSchema(): ParameterSchema {
    const schema = new ParameterSchema();
    schema.addParameter(
      new ParameterDefinition({
        name: 'param1',
        type: ParameterType.STRING,
        description: 'Test param'
      })
    );
    return schema;
  }

  it('exposes instance-specific properties', () => {
    const schema = buildSchema();
    const tool = new GenericMcpTool(
      'test_server_123',
      'remote_calculator',
      'MyCalculator',
      'A remote calculator tool.',
      schema
    );

    expect(tool.getName()).toBe('MyCalculator');
    expect(tool.getDescription()).toBe('A remote calculator tool.');
    expect(tool.getArgumentSchema()).toBe(schema);

    expect(GenericMcpTool.getName()).toBe('call_remote_mcp_tool');
    expect(GenericMcpTool.getDescription()).toContain('generic wrapper');
    expect(GenericMcpTool.getArgumentSchema()).toBeNull();
  });

  it('delegates execution to the proxy', async () => {
    const schema = buildSchema();
    const tool = new GenericMcpTool(
      'test_server_123',
      'remote_calculator',
      'MyCalculator',
      'A remote calculator tool.',
      schema
    );

    const expectedResult = { result: 'calculation complete' };
    mocks.callToolMock.mockResolvedValue(expectedResult);

    const remoteToolArgs = { param1: 'value1', param2: 100 };
    const context = { agentId: 'test_agent_001' };

    const result = await (tool as any)._execute(context, remoteToolArgs);

    expect(mocks.constructorSpy).toHaveBeenCalledWith('test_agent_001', 'test_server_123');
    expect(mocks.callToolMock).toHaveBeenCalledWith('remote_calculator', remoteToolArgs);
    expect(result).toEqual(expectedResult);
  });

  it('propagates proxy failures', async () => {
    const schema = buildSchema();
    const tool = new GenericMcpTool(
      'test_server_123',
      'remote_calculator',
      'MyCalculator',
      'A remote calculator tool.',
      schema
    );

    mocks.callToolMock.mockRejectedValue(new Error('Proxy failed'));

    await expect((tool as any)._execute({ agentId: 'agent' }, { param1: 'test' })).rejects.toThrowError(
      'Proxy failed'
    );
  });
});
