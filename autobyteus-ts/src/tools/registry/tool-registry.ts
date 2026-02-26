import { Singleton } from '../../utils/singleton.js';
import { ToolDefinition } from './tool-definition.js';
import { ToolConfig } from '../tool-config.js';
import { ToolOrigin } from '../tool-origin.js';
import type { BaseTool } from '../base-tool.js';

export class ToolRegistry extends Singleton {
  protected static instance?: ToolRegistry;

  private definitions: Map<string, ToolDefinition> = new Map();

  constructor() {
    super();
    if (ToolRegistry.instance) {
      return ToolRegistry.instance;
    }
    ToolRegistry.instance = this;
  }

  public registerTool(definition: ToolDefinition): void {
    if (!(definition instanceof ToolDefinition)) {
      throw new Error('Attempted to register an object that is not a ToolDefinition.');
    }
    if (this.definitions.has(definition.name)) {
      console.warn(`Overwriting existing tool definition for name: '${definition.name}'`);
    }
    this.definitions.set(definition.name, definition);
    console.log(`Successfully registered tool definition: '${definition.name}'`);
  }

  public unregisterTool(name: string): boolean {
    if (this.definitions.has(name)) {
      this.definitions.delete(name);
      console.log(`Successfully unregistered tool definition: '${name}'`);
      return true;
    }
    console.warn(`Attempted to unregister tool '${name}', but it was not found in the registry.`);
    return false;
  }

  public reloadToolSchema(name: string): boolean {
    const definition = this.getToolDefinition(name);
    if (!definition) {
      console.warn(`Attempted to reload schema for tool '${name}', but it was not found in the registry.`);
      return false;
    }
    definition.reloadCachedSchema();
    return true;
  }

  public reloadAllToolSchemas(): void {
    for (const definition of this.definitions.values()) {
      definition.reloadCachedSchema();
    }
  }

  public getToolDefinition(name: string): ToolDefinition | undefined {
    return this.definitions.get(name);
  }

  public createTool(name: string, config?: ToolConfig): BaseTool {
    const def = this.getToolDefinition(name);
    if (!def) {
      throw new Error(`No tool definition found for name '${name}'`);
    }

    try {
      if (def.customFactory) {
        const instance = def.customFactory(config);
        instance.definition = def;
        return instance;
      }
      if (def.toolClass) {
        const instance = new def.toolClass(config);
        instance.definition = def;
        return instance;
      }
      throw new Error(`ToolDefinition for '${name}' is invalid: missing both tool_class and custom_factory.`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new TypeError(`Failed to create tool '${name}': ${message}`);
    }
  }

  public listTools(): ToolDefinition[] {
    return Array.from(this.definitions.values());
  }

  public listToolNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  public clear(): void {
    this.definitions.clear();
  }

  public snapshot(): Map<string, ToolDefinition> {
    return new Map(this.definitions);
  }

  public restore(definitions: Map<string, ToolDefinition>): void {
    this.definitions = new Map(definitions);
  }

  public getAllDefinitions(): Record<string, ToolDefinition> {
    return Object.fromEntries(this.definitions.entries());
  }

  public getToolsByMcpServer(serverId: string): ToolDefinition[] {
    if (!serverId) {
      return [];
    }
    return Array.from(this.definitions.values()).filter(
      (definition) =>
        definition.origin === ToolOrigin.MCP &&
        definition.metadata?.['mcp_server_id'] === serverId
    );
  }

  public getToolsByCategory(category: string): ToolDefinition[] {
    if (!category) {
      return [];
    }
    return Array.from(this.definitions.values())
      .filter((definition) => definition.category === category)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  public getToolsGroupedByCategory(origin?: ToolOrigin): Record<string, ToolDefinition[]> {
    const grouped: Record<string, ToolDefinition[]> = {};
    const tools = origin
      ? Array.from(this.definitions.values()).filter((definition) => definition.origin === origin)
      : Array.from(this.definitions.values());

    for (const definition of tools) {
      if (!grouped[definition.category]) {
        grouped[definition.category] = [];
      }
      grouped[definition.category].push(definition);
    }

    const sorted: Record<string, ToolDefinition[]> = {};
    for (const category of Object.keys(grouped).sort()) {
      sorted[category] = grouped[category].sort((a, b) => a.name.localeCompare(b.name));
    }
    return sorted;
  }
}

export const defaultToolRegistry = ToolRegistry.getInstance();
