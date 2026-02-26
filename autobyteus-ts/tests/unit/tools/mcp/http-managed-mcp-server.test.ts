import { describe, it, expect, beforeEach } from 'vitest';
import { HttpManagedMcpServer } from '../../../../src/tools/mcp/server/http-managed-mcp-server.js';
import { StreamableHttpMcpServerConfig } from '../../../../src/tools/mcp/types.js';

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

describe('HttpManagedMcpServer', () => {
  beforeEach(() => {
    MockTransport.lastInstance = null;
    MockClient.lastInstance = null;
    HttpManagedMcpServer.setSdkLoader(async () => ({ Client: MockClient, Transport: MockTransport }));
  });

  it('creates a streamable HTTP transport and connects the client', async () => {
    const config = new StreamableHttpMcpServerConfig({
      server_id: 'http-server',
      url: 'http://localhost:9000/stream',
      headers: { Authorization: 'Bearer token' }
    });

    const server = new HttpManagedMcpServer(config);
    await server.connect();

    expect(MockTransport.lastInstance?.options).toEqual({
      url: 'http://localhost:9000/stream',
      headers: { Authorization: 'Bearer token' }
    });

    expect(MockClient.lastInstance?.connectCalledWith).toBe(MockTransport.lastInstance);

    await server.close();
    expect(MockTransport.lastInstance?.closeCalled).toBe(true);
  });
});
