import { ParameterSchema } from '../../utils/parameter-schema.js';
import { LLMProvider } from '../../llm/providers.js';
import { ToolOrigin } from '../tool-origin.js';
import { DefaultJsonSchemaFormatter } from '../usage/formatters/default-json-schema-formatter.js';
import { DefaultJsonExampleFormatter } from '../usage/formatters/default-json-example-formatter.js';
import { DefaultXmlSchemaFormatter } from '../usage/formatters/default-xml-schema-formatter.js';
import { DefaultXmlExampleFormatter } from '../usage/formatters/default-xml-example-formatter.js';
import { BaseTool, type ToolClass } from '../base-tool.js';
import { ToolConfig } from '../tool-config.js';

const CACHE_NOT_SET = Symbol('cache_not_set');

export class ToolDefinition {
  private _name: string;
  private _description: string;
  private _origin: ToolOrigin;
  private _category: string;
  private _metadata: Record<string, unknown>;

  private _argumentSchemaProvider: () => ParameterSchema | null;
  private _configSchemaProvider: () => ParameterSchema | null;

  private _cachedArgumentSchema: ParameterSchema | null | typeof CACHE_NOT_SET = CACHE_NOT_SET;
  private _cachedConfigSchema: ParameterSchema | null | typeof CACHE_NOT_SET = CACHE_NOT_SET;
  private _descriptionProvider?: () => string;

  public toolClass?: ToolClass;
  public customFactory?: (config?: ToolConfig) => BaseTool;

  constructor(
    name: string,
    description: string,
    origin: ToolOrigin,
    category: string,
    argumentSchemaProvider: () => ParameterSchema | null,
    configSchemaProvider: () => ParameterSchema | null,
    options: {
      toolClass?: ToolClass;
      customFactory?: (config?: ToolConfig) => BaseTool;
      metadata?: Record<string, unknown>;
      descriptionProvider?: () => string;
    }
  ) {
    if (!name || typeof name !== 'string') {
      throw new Error("ToolDefinition requires a non-empty string 'name'.");
    }
    if (!description || typeof description !== 'string') {
      throw new Error(`ToolDefinition '${name}' requires a non-empty string 'description'.`);
    }
    if (typeof argumentSchemaProvider !== 'function') {
      throw new TypeError(`ToolDefinition '${name}' requires a callable for 'argument_schema_provider'.`);
    }
    if (typeof configSchemaProvider !== 'function') {
      throw new TypeError(`ToolDefinition '${name}' requires a callable for 'config_schema_provider'.`);
    }
    if (!Object.values(ToolOrigin).includes(origin)) {
      throw new TypeError(`ToolDefinition '${name}' requires a ToolOrigin for 'origin'.`);
    }
    this._name = name;
    this._description = description;
    this._origin = origin;
    this._category = category;
    this._argumentSchemaProvider = argumentSchemaProvider;
    this._configSchemaProvider = configSchemaProvider;
    
    this.toolClass = options.toolClass;
    this.customFactory = options.customFactory;
    this._metadata = options.metadata || {};

    if (!this.toolClass && !this.customFactory) {
      throw new Error(`ToolDefinition '${name}' must provide either a 'tool_class' or a 'custom_factory'.`);
    }
    if (this.toolClass && this.customFactory) {
      throw new Error(`ToolDefinition '${name}' cannot have both a 'tool_class' and a 'custom_factory'.`);
    }
    if (this.toolClass && typeof this.toolClass !== 'function') {
      throw new TypeError(`ToolDefinition '${name}' requires a valid class for 'tool_class'.`);
    }
    if (this.customFactory && typeof this.customFactory !== 'function') {
      throw new TypeError(`ToolDefinition '${name}' requires a callable for 'custom_factory'.`);
    }
    if (this._origin === ToolOrigin.MCP && !this._metadata?.['mcp_server_id']) {
      throw new Error(`ToolDefinition '${name}' with origin MCP must provide a 'mcp_server_id' in its metadata.`);
    }

    if (options.descriptionProvider && typeof options.descriptionProvider !== 'function') {
      throw new TypeError(`ToolDefinition '${name}' requires a callable for 'description_provider' if provided.`);
    }

    if (options.descriptionProvider) {
      this._descriptionProvider = options.descriptionProvider;
    } else if (this.toolClass && typeof this.toolClass.getDescription === 'function') {
      this._descriptionProvider = () => this.toolClass!.getDescription();
    } else {
      this._descriptionProvider = () => description;
    }
  }

  get name(): string { return this._name; }
  get description(): string { return this._description; }
  get origin(): ToolOrigin { return this._origin; }
  get category(): string { return this._category; }
  get metadata(): Record<string, unknown> { return this._metadata; }

  get argumentSchema(): ParameterSchema | null {
    if (this._cachedArgumentSchema === CACHE_NOT_SET) {
      try {
        this._cachedArgumentSchema = this._argumentSchemaProvider();
      } catch (e) {
        console.warn(`Failed to generate argument schema for tool '${this.name}': ${e}`);
        this._cachedArgumentSchema = null;
      }
    }
    return this._cachedArgumentSchema || null;
  }

  get configSchema(): ParameterSchema | null {
    if (this._cachedConfigSchema === CACHE_NOT_SET) {
      try {
        this._cachedConfigSchema = this._configSchemaProvider();
      } catch (e) {
        console.warn(`Failed to generate config schema for tool '${this.name}': ${e}`);
        this._cachedConfigSchema = null;
      }
    }
    return this._cachedConfigSchema || null;
  }

  public reloadCachedSchema(): void {
    this._reloadDescription();
    this._cachedArgumentSchema = CACHE_NOT_SET;
    this._cachedConfigSchema = CACHE_NOT_SET;
    void this.argumentSchema;
    void this.configSchema;
  }

  private _reloadDescription(): void {
    if (!this._descriptionProvider) {
      return;
    }
    try {
      const newDescription = this._descriptionProvider();
      if (typeof newDescription === 'string' && newDescription) {
        this._description = newDescription;
      } else {
        console.warn(`Description provider for tool '${this.name}' returned an invalid value. Keeping existing description.`);
      }
    } catch (e) {
      console.warn(`Failed to refresh description for tool '${this.name}' during reload: ${e}. Keeping existing description.`);
    }
  }

  public getUsageXml(provider?: LLMProvider): string {
    const formatter = new DefaultXmlSchemaFormatter();
    return formatter.provide(this);
  }

  public getUsageJson(provider?: LLMProvider): unknown {
    const formatter = new DefaultJsonSchemaFormatter();
    return formatter.provide(this);
  }

  public getUsageXmlExample(provider?: LLMProvider): string {
    const formatter = new DefaultXmlExampleFormatter();
    return formatter.provide(this);
  }

  public getUsageJsonExample(provider?: LLMProvider): unknown {
    const formatter = new DefaultJsonExampleFormatter();
    return formatter.provide(this);
  }

  public get hasInstantiationConfig(): boolean {
    const schema = this.configSchema;
    return !!schema && schema.parameters.length > 0;
  }

  public validateInstantiationConfig(configData: Record<string, unknown>): [boolean, string[]] {
    const schema = this.configSchema;
    const payload = configData || {};
    if (!schema) {
      if (Object.keys(payload).length > 0) {
        return [false, [`Tool '${this.name}' does not accept instantiation configuration parameters`]];
      }
      return [true, []];
    }
    return schema.validateConfig(payload);
  }
}
