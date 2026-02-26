import { describe, it, expect, beforeEach } from 'vitest';
import { StdioManagedMcpServer } from '../../../../src/tools/mcp/server/stdio-managed-mcp-server.js';
import { StdioMcpServerConfig } from '../../../../src/tools/mcp/types.js';

class MockTransport {
  static lastInstance: MockTransport | null = null;
  options: Record<string, any>;
  closeCalled = false;

  constructor(options: Record<string, any>) {
    this.options = options;
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

describe('StdioManagedMcpServer', () => {
  beforeEach(() => {
    MockTransport.lastInstance = null;
    MockClient.lastInstance = null;
    StdioManagedMcpServer.setSdkLoader(async () => ({ Client: MockClient, Transport: MockTransport }));
  });

  it('creates a stdio transport and connects the client', async () => {
    const config = new StdioMcpServerConfig({
      server_id: 'stdio-server',
      command: 'node',
      args: ['--version'],
      env: { TEST_ENV: '1' },
      cwd: '/tmp'
    });

    const server = new StdioManagedMcpServer(config);
    await server.connect();

    expect(MockTransport.lastInstance?.options).toEqual({
      command: 'node',
      args: ['--version'],
      env: { TEST_ENV: '1' },
      cwd: '/tmp'
    });

    expect(MockClient.lastInstance?.connectCalledWith).toBe(MockTransport.lastInstance);

    await server.close();
    expect(MockTransport.lastInstance?.closeCalled).toBe(true);
  });
});
