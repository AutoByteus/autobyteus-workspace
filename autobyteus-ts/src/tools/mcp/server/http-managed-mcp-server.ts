import type { Client } from '@modelcontextprotocol/client';
import { BaseManagedMcpServer } from './base-managed-mcp-server.js';
import type { StreamableHttpMcpServerConfig } from '../types.js';

export class HttpManagedMcpServer extends BaseManagedMcpServer {
  protected async createClientSession(): Promise<Client> {
    const config = this.configObject as StreamableHttpMcpServerConfig;
    // Loaded on first use, so importing this module does not load the MCP SDK.
    const { Client, StreamableHTTPClientTransport } = await import('@modelcontextprotocol/client');

    // The SDK sends requestInit.headers on every POST and on the SSE GET. Its defaults are kept:
    // redirects are followed only within the configured URL's origin (redirectPolicy 'same-origin'),
    // and connect() runs the 2025 initialize handshake (versionNegotiation 'legacy').
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: { headers: config.requestHeaders() }
    });
    this.registerCleanup(() => transport.close());

    const client = new Client({ name: 'autobyteus', version: '1.0.0' });
    await client.connect(transport);
    return client;
  }
}
