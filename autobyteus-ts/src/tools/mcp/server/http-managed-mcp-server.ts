import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { BaseManagedMcpServer } from './base-managed-mcp-server.js';
import type { StreamableHttpMcpServerConfig } from '../types.js';

export class HttpManagedMcpServer extends BaseManagedMcpServer {
  protected async createClientSession(): Promise<Client> {
    const config = this.configObject as StreamableHttpMcpServerConfig;
    // Loaded on first use, so importing this module does not load the MCP SDK.
    const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
      import('@modelcontextprotocol/sdk/client/index.js'),
      import('@modelcontextprotocol/sdk/client/streamableHttp.js')
    ]);

    // The SDK sends requestInit.headers on every POST and on the SSE GET. Its default
    // redirect policy follows redirects only within the configured URL's origin.
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: { headers: config.requestHeaders() }
    });
    this.registerCleanup(() => transport.close());

    const client = new Client({ name: 'autobyteus', version: '1.0.0' });
    await client.connect(transport);
    return client;
  }
}
