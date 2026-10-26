import { describe, it, expect } from 'vitest';
import {
  BaseMcpConfig,
  McpServerInstanceKey,
  McpTransportType,
  StdioMcpServerConfig,
  StreamableHttpMcpServerConfig
} from '../../../../src/tools/mcp/types.js';

describe('McpTransportType', () => {
  it('uses expected string values', () => {
    expect(McpTransportType.STDIO).toBe('stdio');
    expect(McpTransportType.STREAMABLE_HTTP).toBe('streamable_http');
    expect(Object.values(McpTransportType)).toEqual(['stdio', 'streamable_http']);
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
    ).toThrowError("StdioMcpServerConfig 'stdio-5' 'env' must map names to strings or secret references.");
  });

  it('keeps a secret reference in env beside plain values', () => {
    const config = new StdioMcpServerConfig({
      server_id: 'stdio-ref',
      command: 'bash',
      env: { API_KEY: { vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000003' } as any, MODE: 'fast' }
    });
    expect(config.env).toEqual({ API_KEY: { vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000003' }, MODE: 'fast' });
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
    ).toThrowError(
      "StreamableHttpMcpServerConfig 'http-3' 'token' must be a string or a secret reference if provided."
    );
  });

  it('validates headers map', () => {
    expect(() =>
      new StreamableHttpMcpServerConfig({
        server_id: 'http-4',
        url: 'http://localhost',
        headers: { X: 2 as any }
      })
    ).toThrowError(
      "StreamableHttpMcpServerConfig 'http-4' 'headers' must map names to strings or secret references."
    );
  });

  it('trims the token and treats a blank token as no token', () => {
    const trimmed = new StreamableHttpMcpServerConfig({
      server_id: 'http-5',
      url: 'http://localhost',
      token: '  test-dummy  '
    });
    expect(trimmed.token).toBe('test-dummy');

    for (const blank of ['', '   ', null, undefined]) {
      const config = new StreamableHttpMcpServerConfig({ server_id: 'http-6', url: 'http://localhost', token: blank });
      expect(config.token).toBeNull();
    }
  });

  it('derives the request headers from the resolved headers and token', () => {
    const config = new StreamableHttpMcpServerConfig({ server_id: 'http-7', url: 'http://localhost' });
    expect(config.requestHeaders({ headers: { Authorization: 'Basic test-dummy', 'X-Test': 'value' }, token: null }))
      .toEqual({ Authorization: 'Basic test-dummy', 'X-Test': 'value' });
    const resolved = { headers: { 'X-Test': 'value' }, token: 'test-dummy' };
    expect(config.requestHeaders(resolved)).toEqual({ 'X-Test': 'value', Authorization: 'Bearer test-dummy' });
    expect(resolved.headers).toEqual({ 'X-Test': 'value' });
  });

  it('keeps secret references for headers and token, and plain strings as they are', () => {
    const config = new StreamableHttpMcpServerConfig({
      server_id: 'http-ref',
      url: 'http://localhost',
      token: { vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000001' } as any,
      headers: { 'X-Api-Key': { vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000002' } as any, 'X-Plain': 'value' }
    });
    expect(config.token).toEqual({ vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000001' });
    expect(config.headers).toEqual({
      'X-Api-Key': { vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000002' },
      'X-Plain': 'value'
    });
  });

  it.each([
    ['a malformed vault secret ID', { vaultSecretId: 'Not A Valid Id' }],
    ['extra keys', { vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000001', value: 'test-dummy' }],
    ['a non-string ID', { vaultSecretId: 7 }]
  ])('rejects a header reference with %s', (_label, value) => {
    expect(() =>
      new StreamableHttpMcpServerConfig({ server_id: 'http-bad', url: 'http://localhost', headers: { X: value as any } })
    ).toThrowError("StreamableHttpMcpServerConfig 'http-bad' 'headers' must map names to strings or secret references.");
  });

  it('rejects a token reference together with an Authorization header', () => {
    expect(() =>
      new StreamableHttpMcpServerConfig({
        server_id: 'http-both',
        url: 'http://localhost',
        token: { vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000001' } as any,
        headers: { Authorization: { vaultSecretId: 'mcp.00000000-0000-4000-8000-000000000002' } as any }
      })
    ).toThrowError("Streamable HTTP MCP server 'http-both' sets both 'token' and an 'Authorization' header; use one of them.");
  });

  it.each(['Authorization', 'authorization', 'AUTHORIZATION'])(
    'rejects a token together with an %s header without echoing values',
    (headerName) => {
      let message = '';
      try {
        new StreamableHttpMcpServerConfig({
          server_id: 'http-9',
          url: 'http://localhost',
          token: 'test-dummy',
          headers: { [headerName]: 'Basic test-other' }
        });
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBe(
        "Streamable HTTP MCP server 'http-9' sets both 'token' and an 'Authorization' header; use one of them."
      );
      expect(message).not.toContain('test-dummy');
      expect(message).not.toContain('test-other');
    }
  );

  it('accepts an Authorization header when the token is blank', () => {
    const config = new StreamableHttpMcpServerConfig({
      server_id: 'http-10',
      url: 'http://localhost',
      token: ' ',
      headers: { authorization: 'Basic test-dummy' }
    });
    expect(config.token).toBeNull();
    expect(config.headers).toEqual({ authorization: 'Basic test-dummy' });
  });
});
