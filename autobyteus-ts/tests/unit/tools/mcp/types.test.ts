import { describe, it, expect } from 'vitest';
import {
  BaseMcpConfig,
  McpServerInstanceKey,
  McpTransportType,
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig,
  WebsocketMcpServerConfig
} from '../../../../src/tools/mcp/types.js';

describe('McpTransportType', () => {
  it('uses expected string values', () => {
    expect(McpTransportType.STDIO).toBe('stdio');
    expect(McpTransportType.STREAMABLE_HTTP).toBe('streamable_http');
    expect(McpTransportType.WEBSOCKET).toBe('websocket');
  });
});

describe('McpServerInstanceKey', () => {
  it('stores agent and server identifiers', () => {
    const key = new McpServerInstanceKey('agent-1', 'server-1');
    expect(key.agentId).toBe('agent-1');
    expect(key.serverId).toBe('server-1');
    expect(key.toKey()).toBe('agent-1:server-1');
  });
});

describe('BaseMcpConfig', () => {
  it('defaults enabled and tool_name_prefix', () => {
    const config = new BaseMcpConfig({ server_id: 'server-1' });
    expect(config.enabled).toBe(true);
    expect(config.tool_name_prefix).toBeNull();
    expect(config.transport_type).toBeUndefined();
  });

  it('validates server_id', () => {
    expect(() => new BaseMcpConfig({ server_id: '' })).toThrowError(
      "BaseMcpConfig 'server_id' must be a non-empty string."
    );
  });

  it('validates enabled flag', () => {
    expect(() => new BaseMcpConfig({ server_id: 'server-1', enabled: 'yes' as any })).toThrowError(
      "BaseMcpConfig 'enabled' for server 'server-1' must be a boolean."
    );
  });

  it('validates tool_name_prefix type', () => {
    expect(() =>
      new BaseMcpConfig({ server_id: 'server-1', tool_name_prefix: 123 as any })
    ).toThrowError(
      "BaseMcpConfig 'tool_name_prefix' for server 'server-1' must be a string if provided."
    );
  });
});

describe('StdioMcpServerConfig', () => {
  it('normalizes defaults and sets transport type', () => {
    const config = new StdioMcpServerConfig({
      server_id: 'stdio-1',
      command: 'python'
    });

    expect(config.transport_type).toBe(McpTransportType.STDIO);
    expect(config.command).toBe('python');
    expect(config.args).toEqual([]);
    expect(config.env).toEqual({});
    expect(config.cwd).toBeNull();
  });

  it('converts empty cwd to null', () => {
    const config = new StdioMcpServerConfig({
      server_id: 'stdio-2',
      command: 'node',
      cwd: ''
    });
    expect(config.cwd).toBeNull();
  });

  it('requires a non-empty command', () => {
    expect(() =>
      new StdioMcpServerConfig({ server_id: 'stdio-3', command: '   ' })
    ).toThrowError("StdioMcpServerConfig 'stdio-3' 'command' must be a non-empty string.");
  });

  it('validates args list', () => {
    expect(() =>
      new StdioMcpServerConfig({ server_id: 'stdio-4', command: 'bash', args: ['ok', 1 as any] })
    ).toThrowError("StdioMcpServerConfig 'stdio-4' 'args' must be a list of strings.");
  });

  it('validates env dictionary', () => {
    expect(() =>
      new StdioMcpServerConfig({
        server_id: 'stdio-5',
        command: 'bash',
        env: { A: 1 as any }
      })
    ).toThrowError("StdioMcpServerConfig 'stdio-5' 'env' must be a Dict[str, str].");
  });

  it('validates cwd type', () => {
    expect(() =>
      new StdioMcpServerConfig({
        server_id: 'stdio-6',
        command: 'bash',
        cwd: 123 as any
      })
    ).toThrowError("StdioMcpServerConfig 'stdio-6' 'cwd' must be a string if provided.");
  });
});

describe('StreamableHttpMcpServerConfig', () => {
  it('defaults headers and token', () => {
    const config = new StreamableHttpMcpServerConfig({
      server_id: 'http-1',
      url: 'http://localhost:9000/stream'
    });
    expect(config.transport_type).toBe(McpTransportType.STREAMABLE_HTTP);
    expect(config.token).toBeNull();
    expect(config.headers).toEqual({});
  });

  it('requires a non-empty url', () => {
    expect(() =>
      new StreamableHttpMcpServerConfig({ server_id: 'http-2', url: '' })
    ).toThrowError("StreamableHttpMcpServerConfig 'http-2' 'url' must be a non-empty string.");
  });

  it('validates token type', () => {
    expect(() =>
      new StreamableHttpMcpServerConfig({
        server_id: 'http-3',
        url: 'http://localhost',
        token: 123 as any
      })
    ).toThrowError("StreamableHttpMcpServerConfig 'http-3' 'token' must be a string if provided.");
  });

  it('validates headers map', () => {
    expect(() =>
      new StreamableHttpMcpServerConfig({
        server_id: 'http-4',
        url: 'http://localhost',
        headers: { X: 2 as any }
      })
    ).toThrowError("StreamableHttpMcpServerConfig 'http-4' 'headers' must be a Dict[str, str].");
  });
});

describe('WebsocketMcpServerConfig', () => {
  it('defaults optional fields and sets transport type', () => {
    const config = new WebsocketMcpServerConfig({
      server_id: 'ws-1',
      url: 'wss://localhost:8765/mcp'
    });

    expect(config.transport_type).toBe(McpTransportType.WEBSOCKET);
    expect(config.headers).toEqual({});
    expect(config.subprotocols).toEqual([]);
    expect(config.origin).toBeNull();
    expect(config.open_timeout).toBe(10.0);
    expect(config.ping_interval).toBeNull();
    expect(config.ping_timeout).toBeNull();
    expect(config.verify_tls).toBe(true);
  });

  it('requires websocket urls', () => {
    expect(() =>
      new WebsocketMcpServerConfig({ server_id: 'ws-2', url: 'http://localhost' })
    ).toThrowError(
      "WebsocketMcpServerConfig 'ws-2' 'url' must start with ws:// or wss://."
    );
  });

  it('validates headers and subprotocols', () => {
    expect(() =>
      new WebsocketMcpServerConfig({
        server_id: 'ws-3',
        url: 'wss://localhost',
        headers: { X: 1 as any }
      })
    ).toThrowError("WebsocketMcpServerConfig 'ws-3' 'headers' must be a Dict[str, str].");

    expect(() =>
      new WebsocketMcpServerConfig({
        server_id: 'ws-4',
        url: 'wss://localhost',
        subprotocols: ['ok', 2 as any]
      })
    ).toThrowError("WebsocketMcpServerConfig 'ws-4' 'subprotocols' must be a list of strings.");
  });

  it('validates numeric timeouts and verify_tls', () => {
    expect(() =>
      new WebsocketMcpServerConfig({
        server_id: 'ws-5',
        url: 'wss://localhost',
        open_timeout: 0
      })
    ).toThrowError(
      "WebsocketMcpServerConfig 'ws-5' 'open_timeout' must be a positive number when provided."
    );

    expect(() =>
      new WebsocketMcpServerConfig({
        server_id: 'ws-6',
        url: 'wss://localhost',
        verify_tls: 'false' as any
      })
    ).toThrowError("WebsocketMcpServerConfig 'ws-6' 'verify_tls' must be a boolean.");
  });

  it('validates certificate paths and client key requirements', () => {
    expect(() =>
      new WebsocketMcpServerConfig({
        server_id: 'ws-7',
        url: 'wss://localhost',
        ca_file: 123 as any
      })
    ).toThrowError(
      "WebsocketMcpServerConfig 'ws-7' 'ca_file' must be a string path when provided."
    );

    expect(() =>
      new WebsocketMcpServerConfig({
        server_id: 'ws-8',
        url: 'wss://localhost',
        client_key: '/tmp/key.pem'
      })
    ).toThrowError(
      "WebsocketMcpServerConfig 'ws-8' requires 'client_cert' when 'client_key' is provided."
    );
  });
});
