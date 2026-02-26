import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpToolRegistrar } from '../../../../src/tools/mcp/tool-registrar.js';
import { StdioMcpServerConfig } from '../../../../src/tools/mcp/types.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { ParameterSchema } from '../../../../src/utils/parameter-schema.js';

const mockRemoteTool = {
  name: 'remoteToolA',
  description: 'A remote tool for testing.',
  inputSchema: { type: 'object', properties: { paramA: { type: 'string' } } }
};

function createRegistrar() {
  const configService = {
    addConfig: vi.fn(),
    loadConfigFromDict: vi.fn(),
    getAllConfigs: vi.fn()
  };
  const toolRegistry = {
    registerTool: vi.fn(),
    unregisterTool: vi.fn()
  };
  const instanceManager = {
    managedDiscoverySession: vi.fn()
  };

  const registrar = new McpToolRegistrar({
    configService: configService as any,
    toolRegistry: toolRegistry as any,
    instanceManager: instanceManager as any
  });

  return { registrar, configService, toolRegistry, instanceManager };
}

describe('McpToolRegistrar', () => {
  beforeEach(() => {
    (McpToolRegistrar as any).instance = undefined;
  });

  it('reloads all MCP tools and replaces stale registrations', async () => {
    const { registrar, configService, toolRegistry } = createRegistrar();
    const serverConfig = new StdioMcpServerConfig({
      server_id: 'server1',
      command: 'cmd1',
      enabled: true,
      tool_name_prefix: 's1_'
    });

    configService.getAllConfigs.mockReturnValue([serverConfig]);

    const fetchSpy = vi
      .spyOn(registrar as any, 'fetchToolsFromServer')
      .mockResolvedValue([mockRemoteTool]);

    const staleToolDef = { name: 'stale_tool' } as ToolDefinition;
    (registrar as any)._registeredToolsByServer.set('stale_server', [staleToolDef]);

    await registrar.reloadAllMcpTools();

    expect(configService.getAllConfigs).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith(serverConfig);
    expect(toolRegistry.unregisterTool).toHaveBeenCalledWith('stale_tool');
    expect(toolRegistry.registerTool).toHaveBeenCalledOnce();

    const registeredDef = toolRegistry.registerTool.mock.calls[0][0] as ToolDefinition;
    expect(registeredDef).toBeInstanceOf(ToolDefinition);
    expect(registeredDef.name).toBe('s1_remoteToolA');
    expect(registeredDef.category).toBe('server1');
    expect(registeredDef.metadata.mcp_server_id).toBe('server1');

    const schema = registeredDef.argumentSchema;
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema?.getParameter('paramA')).toBeDefined();

    expect((registrar as any)._registeredToolsByServer.has('stale_server')).toBe(false);
    expect((registrar as any)._registeredToolsByServer.has('server1')).toBe(true);
  });

  it('registers a single server and unregisters old tools', async () => {
    const { registrar, configService, toolRegistry } = createRegistrar();
    const targetConfig = new StdioMcpServerConfig({
      server_id: 'target_server',
      command: 'cmd_target',
      enabled: true
    });

    const fetchSpy = vi
      .spyOn(registrar as any, 'fetchToolsFromServer')
      .mockResolvedValue([mockRemoteTool]);

    const staleToolDef = { name: 'old_tool_for_target' } as ToolDefinition;
    (registrar as any)._registeredToolsByServer.set('target_server', [staleToolDef]);

    await registrar.registerServer(targetConfig);

    expect(fetchSpy).toHaveBeenCalledWith(targetConfig);
    expect(toolRegistry.unregisterTool).toHaveBeenCalledWith('old_tool_for_target');
    expect(toolRegistry.registerTool).toHaveBeenCalledOnce();
    expect(configService.addConfig).toHaveBeenCalledWith(targetConfig);
  });

  it('loads and registers a server from a config dict', async () => {
    const { registrar, configService } = createRegistrar();
    const targetConfigDict = { target_server: { transport_type: 'stdio', command: 'cmd_target' } };
    const validatedConfig = new StdioMcpServerConfig({
      server_id: 'target_server',
      command: 'cmd_target'
    });

    configService.loadConfigFromDict.mockReturnValue(validatedConfig);

    const registerSpy = vi
      .spyOn(registrar, 'registerServer')
      .mockResolvedValue([]);

    await registrar.loadAndRegisterServer(targetConfigDict);

    expect(configService.loadConfigFromDict).toHaveBeenCalledWith(targetConfigDict);
    expect(registerSpy).toHaveBeenCalledWith(validatedConfig);
  });

  it('continues reload when discovery fails', async () => {
    const { registrar, configService, toolRegistry } = createRegistrar();
    const serverConfig = new StdioMcpServerConfig({
      server_id: 'server_err',
      command: 'cmd',
      enabled: true
    });

    configService.getAllConfigs.mockReturnValue([serverConfig]);

    const fetchSpy = vi
      .spyOn(registrar as any, 'fetchToolsFromServer')
      .mockRejectedValue(new Error('Discovery network failed'));

    await registrar.reloadAllMcpTools();

    expect(fetchSpy).toHaveBeenCalledWith(serverConfig);
    expect(toolRegistry.registerTool).not.toHaveBeenCalled();
    expect((registrar as any)._registeredToolsByServer.has('server_err')).toBe(false);
  });

  it('lists remote tools without registering them', async () => {
    const { registrar, toolRegistry } = createRegistrar();
    const previewConfig = new StdioMcpServerConfig({
      server_id: 'preview_server',
      command: 'preview_cmd'
    });

    const fetchSpy = vi
      .spyOn(registrar as any, 'fetchToolsFromServer')
      .mockResolvedValue([mockRemoteTool]);

    const toolDefs = await registrar.listRemoteTools(previewConfig);

    expect(fetchSpy).toHaveBeenCalledWith(previewConfig);
    expect(toolDefs).toHaveLength(1);
    expect(toolDefs[0]).toBeInstanceOf(ToolDefinition);
    expect(toolDefs[0].name).toBe('remoteToolA');
    expect(toolDefs[0].metadata.mcp_server_id).toBe('preview_server');
    expect(toolRegistry.registerTool).not.toHaveBeenCalled();
    expect((registrar as any)._registeredToolsByServer.size).toBe(0);
  });

  it('unregisters tools from a server', () => {
    const { registrar, toolRegistry } = createRegistrar();
    const toolDef = { name: 'tool_to_remove' } as ToolDefinition;
    (registrar as any)._registeredToolsByServer.set('server1', [toolDef]);

    const result = registrar.unregisterToolsFromServer('server1');

    expect(result).toBe(true);
    expect(toolRegistry.unregisterTool).toHaveBeenCalledWith('tool_to_remove');
    expect((registrar as any)._registeredToolsByServer.has('server1')).toBe(false);
  });
});
