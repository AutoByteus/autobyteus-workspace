import { describe, it, expect, beforeEach } from 'vitest';
import {
  BaseMcpConfig,
  McpTransportType,
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig
} from '../../../../src/tools/mcp/types.js';
import { McpConfigService } from '../../../../src/tools/mcp/config-service.js';
import fs from 'node:fs';
import path from 'node:path';

const USER_EXAMPLE_1_DICT_OF_DICTS = {
  'google-slides-mcp': {
    transport_type: 'stdio',
    enabled: true,
    stdio_params: {
      command: 'node',
      args: ['/path/to/google-slides-mcp/build/index.js'],
      env: {
        GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID',
        GOOGLE_CLIENT_SECRET: 'YOUR_CLIENT_SECRET',
        GOOGLE_REFRESH_TOKEN: 'YOUR_REFRESH_TOKEN'
      }
    }
  }
};

const VALID_STDIO_CONFIG_LIST_ITEM = {
  server_id: 'stdio_server_1',
  transport_type: 'stdio',
  enabled: true,
  tool_name_prefix: 'std_',
  stdio_params: {
    command: 'python',
    args: ['-m', 'my_mcp_server'],
    env: { PYTHONUNBUFFERED: '1' },
    cwd: '/tmp'
  }
};

const VALID_HTTP_CONFIG_LIST_ITEM = {
  server_id: 'http_server_1',
  transport_type: 'streamable_http',
  enabled: true,
  tool_name_prefix: 'http_',
  streamable_http_params: {
    url: 'http://localhost:9000/stream',
    token: 'http-secret-token',
    headers: { 'X-Http-Header': 'http_value' }
  }
};

function createConfigService(): McpConfigService {
  (McpConfigService as any).instance = undefined;
  const service = McpConfigService.getInstance();
  service.clearConfigs();
  return service;
}

describe('McpConfigService', () => {
  let service: McpConfigService;

  beforeEach(() => {
    service = createConfigService();
  });

  it('loads a single config from dict', () => {
    const configDictToLoad = {
      stdio_server_1: {
        transport_type: 'stdio',
        command: 'python'
      }
    };

    const loadedConfig = service.loadConfigFromDict(configDictToLoad);
    expect(loadedConfig).toBeInstanceOf(StdioMcpServerConfig);
    expect(loadedConfig.server_id).toBe('stdio_server_1');

    const storedConfig = service.getConfig('stdio_server_1');
    expect(storedConfig).not.toBeNull();
    expect((storedConfig as StdioMcpServerConfig).command).toBe('python');
    expect(service.getAllConfigs()).toHaveLength(1);
  });

  it('loads multiple configs from dict', () => {
    const configsData = {
      stdio_server_1: VALID_STDIO_CONFIG_LIST_ITEM,
      http_server_1: VALID_HTTP_CONFIG_LIST_ITEM
    };

    const loaded = service.loadConfigsFromDict(configsData);
    expect(loaded).toHaveLength(2);
    expect(service.getAllConfigs()).toHaveLength(2);

    const config1 = service.getConfig('stdio_server_1');
    expect(config1).toBeInstanceOf(StdioMcpServerConfig);
    expect((config1 as StdioMcpServerConfig).command).toBe('python');

    const config2 = service.getConfig('http_server_1');
    expect(config2).toBeInstanceOf(StreamableHttpMcpServerConfig);
    expect((config2 as StreamableHttpMcpServerConfig).url).toBe('http://localhost:9000/stream');
  });

  it('loads configs from file with list', () => {
    const fileContent = [
      VALID_STDIO_CONFIG_LIST_ITEM,
      VALID_HTTP_CONFIG_LIST_ITEM
    ];

    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'mcp-config-'));
    const configFile = path.join(tempDir, 'mcp_config_list.json');
    fs.writeFileSync(configFile, JSON.stringify(fileContent), 'utf-8');

    const loaded = service.loadConfigsFromFile(configFile);
    expect(loaded).toHaveLength(2);

    const stdioConfig = service.getConfig('stdio_server_1');
    expect(stdioConfig).toBeInstanceOf(StdioMcpServerConfig);
    expect((stdioConfig as StdioMcpServerConfig).command).toBe('python');

    const httpConfig = service.getConfig('http_server_1');
    expect(httpConfig).toBeInstanceOf(StreamableHttpMcpServerConfig);
    expect((httpConfig as StreamableHttpMcpServerConfig).url).toBe('http://localhost:9000/stream');
  });

  it('loads configs from file with dict', () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'mcp-config-'));
    const configFile = path.join(tempDir, 'mcp_config_dict.json');
    fs.writeFileSync(configFile, JSON.stringify(USER_EXAMPLE_1_DICT_OF_DICTS), 'utf-8');

    const loaded = service.loadConfigsFromFile(configFile);
    expect(loaded).toHaveLength(1);

    const config = service.getConfig('google-slides-mcp');
    expect(config).toBeInstanceOf(StdioMcpServerConfig);
    expect((config as StdioMcpServerConfig).command).toBe('node');
  });

  it('rejects invalid config data', () => {
    const tempDir = fs.mkdtempSync(path.join(process.cwd(), 'mcp-config-'));
    const invalidFile = path.join(tempDir, 'invalid.json');
    fs.writeFileSync(invalidFile, JSON.stringify([{ transport_type: 'stdio' }]), 'utf-8');

    expect(() => service.loadConfigsFromFile(invalidFile)).toThrowError(
      "each item must be a dict with a 'server_id'"
    );

    expect(() =>
      service.loadConfigsFromDict({
        myid: { transport_type: 'invalid_type' }
      })
    ).toThrowError("Invalid 'transport_type' string 'invalid_type'");

    expect(() =>
      service.loadConfigsFromDict({
        myid: { transport_type: 'stdio', stdio_params: { command: 123 } }
      })
    ).toThrowError('incompatible parameters for STDIO config');

    expect(() =>
      service.loadConfigsFromDict({
        myid: { transport_type: 'streamable_http', streamable_http_params: {} }
      })
    ).toThrowError('incompatible parameters for STREAMABLE_HTTP config');

  });

  it('adds configs and overwrites existing config', () => {
    const stdioObj = new StdioMcpServerConfig({
      server_id: 'google-doc-mcp',
      command: 'node',
      args: ['/path/to/google-doc-mcp/index.js']
    });

    const returnedConfig = service.addConfig(stdioObj);
    expect(returnedConfig).toBe(stdioObj);
    expect(service.getConfig('google-doc-mcp')).toBe(stdioObj);

    const configV1 = new StdioMcpServerConfig({ server_id: 'common_server', command: 'cmd_v1' });
    const configV2 = new StdioMcpServerConfig({ server_id: 'common_server', command: 'cmd_v2' });

    service.addConfig(configV1);
    service.addConfig(configV2);

    const storedConfig = service.getConfig('common_server') as StdioMcpServerConfig;
    expect(storedConfig.command).toBe('cmd_v2');
  });

  it('removes configs and clears all configs', () => {
    service.loadConfigFromDict({ server_to_remove: { transport_type: 'stdio', command: 'mycmd' } });

    expect(service.getConfig('server_to_remove')).not.toBeNull();
    expect(service.removeConfig('server_to_remove')).toBe(true);
    expect(service.getConfig('server_to_remove')).toBeNull();
    expect(service.removeConfig('nonexistent_server')).toBe(false);

    service.loadConfigFromDict({ server1: { transport_type: 'stdio', command: 'c' } });
    expect(service.getAllConfigs()).toHaveLength(1);
    service.clearConfigs();
    expect(service.getAllConfigs()).toHaveLength(0);
  });

  it('parses transport types', () => {
    const parsed = (McpConfigService as any).parseTransportType('stdio', 'server1');
    expect(parsed).toBe(McpTransportType.STDIO);

    expect(() => (McpConfigService as any).parseTransportType('INVALID', 'server1')).toThrowError(
      "Invalid 'transport_type' string 'INVALID'"
    );
  });

  it('rejects the removed websocket transport and lists the supported transports', () => {
    expect(() =>
      service.loadConfigsFromDict({
        ws_server: { transport_type: 'websocket', url: 'ws://127.0.0.1:8765/mcp' }
      })
    ).toThrowError(
      "Invalid 'transport_type' string 'websocket' for server 'ws_server'. Valid types are: stdio, streamable_http."
    );
    expect(service.getAllConfigs()).toHaveLength(0);
  });

  it('parses a single mcp config dict', () => {
    const parsed = McpConfigService.parseMcpConfigDict({
      server_one: { transport_type: 'stdio', command: 'python' }
    });
    expect(parsed).toBeInstanceOf(BaseMcpConfig);
    expect(parsed.server_id).toBe('server_one');
  });

  it('rejects an imported HTTP server that sets both a token and an Authorization header', () => {
    expect(() =>
      McpConfigService.parseMcpConfigDict({
        both: {
          transport_type: 'streamable_http',
          url: 'http://localhost:9000/mcp',
          token: 'test-dummy',
          headers: { authorization: 'Basic test-other' }
        }
      })
    ).toThrowError(
      "Failed to create config for server 'both' due to incompatible parameters for STREAMABLE_HTTP config: " +
        "Streamable HTTP MCP server 'both' sets both 'token' and an 'Authorization' header; use one of them."
    );
  });
});
