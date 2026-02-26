import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry, defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../../src/tools/registry/tool-definition.js';
import { BaseTool, type ToolClass } from '../../../../src/tools/base-tool.js';
import { ToolOrigin } from '../../../../src/tools/tool-origin.js';
import { ParameterSchema } from '../../../../src/utils/parameter-schema.js';
import { ToolConfig } from '../../../../src/tools/tool-config.js';

class DummyToolNoConfig extends BaseTool {
  configReceived?: ToolConfig;
  constructor(config?: ToolConfig) {
    super(config);
    this.configReceived = config;
  }
  protected _execute(): Promise<any> {
    return Promise.resolve('executed');
  }
  static getDescription() { return 'A dummy tool without config.'; }
  static getArgumentSchema() { return null; }
}

class DummyToolWithConfig extends BaseTool {
  value: string;
  constructor(config?: ToolConfig) {
    super(config);
    this.value = config?.get('value', 'default') ?? 'default';
  }
  protected _execute(): Promise<any> {
    return Promise.resolve(this.value);
  }
  static getDescription() { return 'A dummy tool with config.'; }
  static getArgumentSchema() { return null; }
}

class DummyToolFailsInit extends BaseTool {
  constructor(config?: ToolConfig) {
    super(config);
    throw new Error('Initialization failed');
  }
  protected _execute(): Promise<any> {
    return Promise.resolve();
  }
  static getDescription() { return 'A tool that fails to initialize.'; }
  static getArgumentSchema() { return null; }
}

class DummyFactoryTool extends BaseTool {
  source: string;
  constructor(source: string, config?: ToolConfig) {
    super(config);
    this.source = source;
  }
  protected _execute(): Promise<any> {
    return Promise.resolve(`created from ${this.source}`);
  }
  static getDescription() { return 'A dummy tool created by a factory.'; }
  static getArgumentSchema() { return null; }
}

class DynamicDescriptionTool extends BaseTool {
  static descText = 'Initial description';
  protected _execute(): Promise<any> {
    return Promise.resolve(DynamicDescriptionTool.descText);
  }
  static getDescription() { return DynamicDescriptionTool.descText; }
  static getArgumentSchema() { return null; }
}

const dummyFactory = (config?: ToolConfig): DummyFactoryTool => {
  const source = config?.get('source_override', 'factory_default') ?? 'factory_default';
  return new DummyFactoryTool(source, config);
};

const createToolDef = (
  name: string,
  description: string,
  toolClass?: ToolClass,
  customFactory?: (config?: ToolConfig) => BaseTool,
  metadata?: Record<string, any>
): ToolDefinition =>
  new ToolDefinition(
    name,
    description,
    ToolOrigin.LOCAL,
    'general',
    () => null,
    () => null,
    { toolClass, customFactory, metadata }
  );

describe('ToolRegistry', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
  });

  it('test_singleton_instance', () => {
    const registry1 = new ToolRegistry();
    const registry2 = new ToolRegistry();
    expect(registry1).toBe(registry2);
  });

  it('test_register_and_get_tool_definition', () => {
    const def = createToolDef('DummyToolNoConfig', 'A dummy tool without config.', DummyToolNoConfig);
    expect(defaultToolRegistry.getToolDefinition('DummyToolNoConfig')).toBeUndefined();
    defaultToolRegistry.registerTool(def);
    const retrieved = defaultToolRegistry.getToolDefinition('DummyToolNoConfig');
    expect(retrieved).toBe(def);
    expect(retrieved?.name).toBe('DummyToolNoConfig');
  });

  it('test_register_overwrites_existing', () => {
    const def = createToolDef('DummyToolNoConfig', 'A dummy tool without config.', DummyToolNoConfig);
    defaultToolRegistry.registerTool(def);
    const newDef = createToolDef('DummyToolNoConfig', 'An updated description.', DummyToolNoConfig);
    defaultToolRegistry.registerTool(newDef);
    const retrieved = defaultToolRegistry.getToolDefinition('DummyToolNoConfig');
    expect(retrieved).toBe(newDef);
    expect(retrieved?.description).toBe('An updated description.');
  });

  it('test_unregister_tool', () => {
    const def = createToolDef('DummyToolNoConfig', 'A dummy tool without config.', DummyToolNoConfig);
    defaultToolRegistry.registerTool(def);
    expect(defaultToolRegistry.getToolDefinition(def.name)).toBeDefined();
    expect(defaultToolRegistry.unregisterTool(def.name)).toBe(true);
    expect(defaultToolRegistry.getToolDefinition(def.name)).toBeUndefined();
    expect(defaultToolRegistry.unregisterTool('nonexistent_tool')).toBe(false);
  });

  it('test_reload_tool_schema', () => {
    const schemaProvider = () => new ParameterSchema();
    const toolDef = new ToolDefinition(
      'ReloadableTool',
      'A tool to test reloading.',
      ToolOrigin.LOCAL,
      'general',
      schemaProvider,
      () => null,
      { toolClass: DummyToolNoConfig }
    );
    defaultToolRegistry.registerTool(toolDef);
    void toolDef.argumentSchema;
    const reloadResult = defaultToolRegistry.reloadToolSchema('ReloadableTool');
    expect(reloadResult).toBe(true);
    expect(defaultToolRegistry.reloadToolSchema('nonexistent')).toBe(false);
  });

  it('test_reload_tool_schema_updates_description', () => {
    DynamicDescriptionTool.descText = 'Initial description';
    const toolDef = new ToolDefinition(
      'DynamicDescriptionTool',
      DynamicDescriptionTool.getDescription(),
      ToolOrigin.LOCAL,
      'general',
      () => null,
      () => null,
      { toolClass: DynamicDescriptionTool }
    );
    defaultToolRegistry.registerTool(toolDef);
    expect(toolDef.description).toBe('Initial description');
    DynamicDescriptionTool.descText = 'Updated description';
    defaultToolRegistry.reloadToolSchema('DynamicDescriptionTool');
    expect(toolDef.description).toBe('Updated description');
  });

  it('test_reload_all_tool_schemas', () => {
    const toolDef1 = new ToolDefinition(
      'Tool1',
      'd1',
      ToolOrigin.LOCAL,
      'general',
      () => new ParameterSchema(),
      () => null,
      { toolClass: DummyToolNoConfig }
    );
    const toolDef2 = new ToolDefinition(
      'Tool2',
      'd2',
      ToolOrigin.LOCAL,
      'general',
      () => new ParameterSchema(),
      () => null,
      { toolClass: DummyToolNoConfig }
    );
    defaultToolRegistry.registerTool(toolDef1);
    defaultToolRegistry.registerTool(toolDef2);
    defaultToolRegistry.reloadAllToolSchemas();
  });

  it('test_list_tools', () => {
    const defA = createToolDef('DummyToolNoConfig', 'A dummy tool without config.', DummyToolNoConfig);
    const defB = createToolDef('DummyFactoryTool', 'A dummy tool created by a factory.', undefined, dummyFactory);
    expect(defaultToolRegistry.listTools()).toEqual([]);
    expect(defaultToolRegistry.listToolNames()).toEqual([]);
    defaultToolRegistry.registerTool(defA);
    defaultToolRegistry.registerTool(defB);
    const defs = defaultToolRegistry.listTools();
    const names = defaultToolRegistry.listToolNames();
    expect(defs.length).toBe(2);
    expect(names.length).toBe(2);
    expect(names).toContain('DummyToolNoConfig');
    expect(names).toContain('DummyFactoryTool');
  });

  it('test_create_simple_class_based_tool', () => {
    const def = createToolDef('DummyToolNoConfig', 'A dummy tool without config.', DummyToolNoConfig);
    defaultToolRegistry.registerTool(def);
    const instance = defaultToolRegistry.createTool('DummyToolNoConfig');
    expect(instance).toBeInstanceOf(DummyToolNoConfig);
    expect((instance as DummyToolNoConfig).configReceived).toBeUndefined();
  });

  it('test_create_class_based_tool_with_config', async () => {
    const def = createToolDef('DummyToolWithConfig', 'A dummy tool with config.', DummyToolWithConfig);
    defaultToolRegistry.registerTool(def);
    const toolDefault = defaultToolRegistry.createTool('DummyToolWithConfig');
    expect(await toolDefault.execute({ agentId: 'agent' }, {})).toBe('default');
    const toolCustom = defaultToolRegistry.createTool('DummyToolWithConfig', new ToolConfig({ value: 'custom_value' }));
    expect(await toolCustom.execute({ agentId: 'agent' }, {})).toBe('custom_value');
  });

  it('test_create_factory_based_tool', async () => {
    const def = createToolDef('DummyFactoryTool', 'A dummy tool created by a factory.', undefined, dummyFactory);
    defaultToolRegistry.registerTool(def);
    const toolDefault = defaultToolRegistry.createTool('DummyFactoryTool');
    expect(await toolDefault.execute({ agentId: 'agent' }, {})).toBe('created from factory_default');
    const toolCustom = defaultToolRegistry.createTool('DummyFactoryTool', new ToolConfig({ source_override: 'factory_custom' }));
    expect(await toolCustom.execute({ agentId: 'agent' }, {})).toBe('created from factory_custom');
  });

  it('test_create_tool_not_found_raises_error', () => {
    expect(() => defaultToolRegistry.createTool('NonExistentTool')).toThrow(
      "No tool definition found for name 'NonExistentTool'"
    );
  });

  it('test_create_tool_instantiation_fails_raises_error', () => {
    const def = createToolDef('DummyToolFailsInit', '...', DummyToolFailsInit);
    defaultToolRegistry.registerTool(def);
    expect(() => defaultToolRegistry.createTool('DummyToolFailsInit')).toThrow(
      "Failed to create tool 'DummyToolFailsInit': Initialization failed"
    );
  });

  it('test_register_invalid_definition_raises_error', () => {
    expect(() => defaultToolRegistry.registerTool('not a definition' as any)).toThrow(
      'Attempted to register an object that is not a ToolDefinition.'
    );
  });

  it('test_get_tools_by_mcp_server', () => {
    const mcpTool = new ToolDefinition(
      'McpTool',
      'MCP tool',
      ToolOrigin.MCP,
      'general',
      () => null,
      () => null,
      { toolClass: DummyToolNoConfig, metadata: { mcp_server_id: 'server-1' } }
    );
    const localTool = createToolDef('LocalTool', 'Local tool', DummyToolNoConfig);
    defaultToolRegistry.registerTool(mcpTool);
    defaultToolRegistry.registerTool(localTool);
    const result = defaultToolRegistry.getToolsByMcpServer('server-1');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('McpTool');
  });

  it('test_get_tools_by_category', () => {
    const toolA = new ToolDefinition(
      'AlphaTool',
      'Alpha',
      ToolOrigin.LOCAL,
      'alpha',
      () => null,
      () => null,
      { toolClass: DummyToolNoConfig }
    );
    const toolB = new ToolDefinition(
      'BetaTool',
      'Beta',
      ToolOrigin.LOCAL,
      'alpha',
      () => null,
      () => null,
      { toolClass: DummyToolNoConfig }
    );
    defaultToolRegistry.registerTool(toolB);
    defaultToolRegistry.registerTool(toolA);
    const result = defaultToolRegistry.getToolsByCategory('alpha');
    expect(result.map((tool) => tool.name)).toEqual(['AlphaTool', 'BetaTool']);
  });

  it('test_get_tools_grouped_by_category', () => {
    const tools = [
      new ToolDefinition('AlphaTool', 'Alpha', ToolOrigin.LOCAL, 'alpha', () => null, () => null, { toolClass: DummyToolNoConfig }),
      new ToolDefinition('BetaTool', 'Beta', ToolOrigin.LOCAL, 'alpha', () => null, () => null, { toolClass: DummyToolNoConfig }),
      new ToolDefinition('GammaTool', 'Gamma', ToolOrigin.LOCAL, 'beta', () => null, () => null, { toolClass: DummyToolNoConfig })
    ];
    tools.forEach((tool) => defaultToolRegistry.registerTool(tool));
    const grouped = defaultToolRegistry.getToolsGroupedByCategory();
    expect(Object.keys(grouped)).toEqual(['alpha', 'beta']);
    expect(grouped.alpha.map((tool) => tool.name)).toEqual(['AlphaTool', 'BetaTool']);
    expect(grouped.beta.map((tool) => tool.name)).toEqual(['GammaTool']);
  });
});
