import fs from 'node:fs';
import { Singleton } from '../../utils/singleton.js';
import {
  BaseMcpConfig,
  McpTransportType,
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
  WebsocketMcpServerConfig,
  type StdioMcpServerConfigData,
  type StreamableHttpMcpServerConfigData,
  type WebsocketMcpServerConfigData
} from './types.js';

type ConfigDict = Record<string, unknown>;

type TransportSpecificParamsKeyMap = Record<McpTransportType, string>;

const TRANSPORT_SPECIFIC_PARAMS_KEY_MAP: TransportSpecificParamsKeyMap = {
  [McpTransportType.STDIO]: 'stdio_params',
  [McpTransportType.STREAMABLE_HTTP]: 'streamable_http_params',
  [McpTransportType.WEBSOCKET]: 'websocket_params'
};

const TRANSPORT_TYPE_NAME: Record<McpTransportType, string> = {
  [McpTransportType.STDIO]: 'STDIO',
  [McpTransportType.STREAMABLE_HTTP]: 'STREAMABLE_HTTP',
  [McpTransportType.WEBSOCKET]: 'WEBSOCKET'
};

export class McpConfigService extends Singleton {
  protected static instance?: McpConfigService;

  private configs: Map<string, BaseMcpConfig> = new Map();

  constructor() {
    super();
    if (McpConfigService.instance) {
      return McpConfigService.instance;
    }
    McpConfigService.instance = this;
  }

  static parseTransportType(typeStr: string, serverIdentifier: string): McpTransportType {
    const normalized = (typeStr ?? '').toLowerCase();
    const values = Object.values(McpTransportType);
    if (values.includes(normalized as McpTransportType)) {
      return normalized as McpTransportType;
    }
    const validTypes = values.join(', ');
    throw new Error(
      `Invalid 'transport_type' string '${typeStr}' for server '${serverIdentifier}'. ` +
        `Valid types are: ${validTypes}.`
    );
  }

  private static createSpecificConfig(
    serverId: string,
    transportType: McpTransportType,
    configData: ConfigDict
  ): BaseMcpConfig {
    const constructorParams: ConfigDict = { server_id: serverId };

    if ('enabled' in configData) {
      constructorParams.enabled = configData.enabled;
    }
    if ('tool_name_prefix' in configData) {
      constructorParams.tool_name_prefix = configData.tool_name_prefix;
    }

    const paramsKey = TRANSPORT_SPECIFIC_PARAMS_KEY_MAP[transportType];
    if (paramsKey) {
      const specificParams = configData[paramsKey] ?? {};
      if (!specificParams || typeof specificParams !== 'object' || Array.isArray(specificParams)) {
        throw new Error(
          `'${paramsKey}' for server '${serverId}' must be a dictionary, got ${typeof specificParams}.`
        );
      }
      Object.assign(constructorParams, specificParams);
    }

    const otherTopLevelKeys: ConfigDict = {};
    for (const [key, value] of Object.entries(configData)) {
      if (key === 'enabled' || key === 'tool_name_prefix' || key === 'transport_type') {
        continue;
      }
      if (Object.values(TRANSPORT_SPECIFIC_PARAMS_KEY_MAP).includes(key)) {
        continue;
      }
      otherTopLevelKeys[key] = value;
    }

    Object.assign(constructorParams, otherTopLevelKeys);

    try {
      if (transportType === McpTransportType.STDIO) {
        return new StdioMcpServerConfig(constructorParams as unknown as StdioMcpServerConfigData);
      }
      if (transportType === McpTransportType.STREAMABLE_HTTP) {
        return new StreamableHttpMcpServerConfig(constructorParams as unknown as StreamableHttpMcpServerConfigData);
      }
      if (transportType === McpTransportType.WEBSOCKET) {
        return new WebsocketMcpServerConfig(constructorParams as unknown as WebsocketMcpServerConfigData);
      }
      throw new Error(
        `Unsupported McpTransportType '${transportType}' for server '${serverId}'.`
      );
    } catch (error: unknown) {
      if (transportType === McpTransportType.WEBSOCKET) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to create config for server '${serverId}' due to incompatible parameters for ` +
          `${TRANSPORT_TYPE_NAME[transportType]} config: ${errorMessage}`
      );
    }
  }

  static parseMcpConfigDict(configDict: ConfigDict): BaseMcpConfig {
    if (!configDict || typeof configDict !== 'object' || Array.isArray(configDict)) {
      throw new Error(
        'Input must be a dictionary with a single top-level key representing the server_id.'
      );
    }

    const keys = Object.keys(configDict);
    if (keys.length !== 1) {
      throw new Error(
        'Input must be a dictionary with a single top-level key representing the server_id.'
      );
    }

    const serverId = keys[0];
    const rawConfigData = configDict[serverId];

    if (!rawConfigData || typeof rawConfigData !== 'object' || Array.isArray(rawConfigData)) {
      throw new Error(`Configuration for server '${serverId}' must be a dictionary.`);
    }

    const configData: ConfigDict = { ...(rawConfigData as ConfigDict) };
    if (!('transport_type' in configData) && 'transportType' in configData) {
      configData.transport_type = configData.transportType;
      delete configData.transportType;
    }
    if (!('tool_name_prefix' in configData) && 'toolNamePrefix' in configData) {
      configData.tool_name_prefix = configData.toolNamePrefix;
      delete configData.toolNamePrefix;
    }

    const transportTypeValue = configData['transport_type'];
    if (typeof transportTypeValue !== 'string' || !transportTypeValue) {
      throw new Error(`Config data for server '${serverId}' is missing 'transport_type' field.`);
    }

    const transportType = McpConfigService.parseTransportType(transportTypeValue, serverId);
    return McpConfigService.createSpecificConfig(serverId, transportType, configData as ConfigDict);
  }

  addConfig(configObject: BaseMcpConfig): BaseMcpConfig {
    if (!(configObject instanceof BaseMcpConfig)) {
      throw new TypeError(
        `Unsupported input type for addConfig: ${typeof configObject}. ` +
          'Expected a BaseMcpConfig subclass object (e.g., StdioMcpServerConfig).'
      );
    }

    if (this.configs.has(configObject.server_id)) {
      console.warn(`Overwriting existing MCP config with server_id '${configObject.server_id}'.`);
    }

    this.configs.set(configObject.server_id, configObject);
    return configObject;
  }

  loadConfigFromDict(configDict: ConfigDict): BaseMcpConfig {
    const configObject = McpConfigService.parseMcpConfigDict(configDict);
    return this.addConfig(configObject);
  }

  loadConfigsFromDict(configsData: Record<string, ConfigDict>): BaseMcpConfig[] {
    if (!configsData || typeof configsData !== 'object' || Array.isArray(configsData)) {
      throw new TypeError('configs_data must be a dictionary of server configurations keyed by server_id.');
    }

    const loaded: BaseMcpConfig[] = [];
    for (const [serverId, singleConfigData] of Object.entries(configsData)) {
      if (!singleConfigData || typeof singleConfigData !== 'object' || Array.isArray(singleConfigData)) {
        throw new Error(`Configuration for server_id '${serverId}' must be a dictionary.`);
      }
      const configObj = McpConfigService.parseMcpConfigDict({ [serverId]: singleConfigData });
      this.addConfig(configObj);
      loaded.push(configObj);
    }
    return loaded;
  }

  loadConfigsFromFile(filepath: string): BaseMcpConfig[] {
    if (!fs.existsSync(filepath)) {
      throw new Error(`MCP configuration file not found: ${filepath}`);
    }

    try {
      const rawContent = fs.readFileSync(filepath, 'utf-8');
      const jsonData = JSON.parse(rawContent);

      if (jsonData && typeof jsonData === 'object' && !Array.isArray(jsonData)) {
        return this.loadConfigsFromDict(jsonData as Record<string, ConfigDict>);
      }

      if (Array.isArray(jsonData)) {
        const configsAsDict: Record<string, ConfigDict> = {};
        for (const item of jsonData) {
          if (item && typeof item === 'object' && 'server_id' in item) {
            const serverId = (item as ConfigDict).server_id;
            if (typeof serverId !== 'string' || !serverId) {
              throw new Error("When loading from a list, each item must have a non-empty 'server_id'.");
            }
            configsAsDict[serverId] = item as ConfigDict;
          } else {
            throw new Error("When loading from a list, each item must be a dict with a 'server_id'.");
          }
        }
        return this.loadConfigsFromDict(configsAsDict);
      }

      throw new TypeError(
        `Unsupported JSON structure in ${filepath}. Expected a dictionary of configurations.`
      );
    } catch (error: unknown) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in MCP configuration file ${filepath}: ${error.message}`);
      }
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Could not read or process MCP configuration file ${filepath}: ${String(error)}`);
    }
  }

  getConfig(serverId: string): BaseMcpConfig | null {
    return this.configs.get(serverId) ?? null;
  }

  getAllConfigs(): BaseMcpConfig[] {
    return Array.from(this.configs.values());
  }

  removeConfig(serverId: string): boolean {
    if (this.configs.has(serverId)) {
      this.configs.delete(serverId);
      return true;
    }
    return false;
  }

  clearConfigs(): void {
    this.configs.clear();
  }
}

export const defaultMcpConfigService = McpConfigService.getInstance();
