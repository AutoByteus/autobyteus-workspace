import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WebsocketManagedMcpServer } from '../../../../src/tools/mcp/server/websocket-managed-mcp-server.js';
import { WebsocketMcpServerConfig } from '../../../../src/tools/mcp/types.js';

class MockTransport {
  static lastInstance: MockTransport | null = null;
  options: Record<string, any>;
  closeCalled = false;

  constructor(...args: any[]) {
    const [maybeUrl, maybeOptions] = args;
    const options =
      typeof maybeUrl === 'string' && maybeOptions && typeof maybeOptions === 'object'
        ? maybeOptions
        : maybeUrl;
    this.options = options ?? {};
    MockTransport.lastInstance = this;
  }

  close() {
    this.closeCalled = true;
  }
}

class MockClient {
  static lastInstance: MockClient | null = null;
  connectCalledWith: any;

  constructor() {
    MockClient.lastInstance = this;
  }

  async connect(transport: any): Promise<void> {
    this.connectCalledWith = transport;
  }

  async listTools(): Promise<any> {
    return { tools: [] };
  }

  async callTool(): Promise<any> {
    return {};
  }

  async close(): Promise<void> {
    return;
  }
}

describe('WebsocketManagedMcpServer', () => {
  beforeEach(() => {
    MockTransport.lastInstance = null;
    MockClient.lastInstance = null;
    WebsocketManagedMcpServer.setSdkLoader(async () => ({ Client: MockClient, Transport: MockTransport }));
  });

  it('creates a websocket transport with TLS and connects the client', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-ws-'));
    const caPath = path.join(tempDir, 'ca.pem');
    const certPath = path.join(tempDir, 'cert.pem');
    const keyPath = path.join(tempDir, 'key.pem');
    fs.writeFileSync(caPath, 'ca');
    fs.writeFileSync(certPath, 'cert');
    fs.writeFileSync(keyPath, 'key');

    const config = new WebsocketMcpServerConfig({
      server_id: 'ws-server',
      url: 'wss://localhost:8765/mcp',
      headers: { 'X-Test': '1' },
      origin: 'https://localhost',
      subprotocols: ['custom'],
      open_timeout: 5,
      ping_interval: 15,
      ping_timeout: 20,
      verify_tls: false,
      ca_file: caPath,
      client_cert: certPath,
      client_key: keyPath
    });

    const server = new WebsocketManagedMcpServer(config);
    await server.connect();

    expect(MockTransport.lastInstance?.options.url).toBe('wss://localhost:8765/mcp');
    expect(MockTransport.lastInstance?.options.headers).toEqual({ 'X-Test': '1' });
    expect(MockTransport.lastInstance?.options.origin).toBe('https://localhost');
    expect(MockTransport.lastInstance?.options.subprotocols).toEqual(['custom', 'mcp']);
    expect(MockTransport.lastInstance?.options.openTimeout).toBe(5);
    expect(MockTransport.lastInstance?.options.pingInterval).toBe(15);
    expect(MockTransport.lastInstance?.options.pingTimeout).toBe(20);
    expect(MockTransport.lastInstance?.options.tls?.rejectUnauthorized).toBe(false);

    expect(MockClient.lastInstance?.connectCalledWith).toBe(MockTransport.lastInstance);

    await server.close();
    expect(MockTransport.lastInstance?.closeCalled).toBe(true);
  });
});
