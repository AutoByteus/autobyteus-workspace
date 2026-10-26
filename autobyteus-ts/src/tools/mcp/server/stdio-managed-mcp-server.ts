import type { Client } from '@modelcontextprotocol/client';
import { BaseManagedMcpServer } from './base-managed-mcp-server.js';
import type { StdioMcpServerConfig } from '../types.js';
import { resolveMcpValues } from '../mcp-secret-resolver.js';

export class StdioManagedMcpServer extends BaseManagedMcpServer {
  protected async createClientSession(): Promise<Client> {
    const config = this.configObject as StdioMcpServerConfig;
    // Loaded on first use, so importing this module does not load the MCP SDK.
    const [{ Client }, { StdioClientTransport }] = await Promise.all([
      import('@modelcontextprotocol/client'),
      import('@modelcontextprotocol/client/stdio')
    ]);

    // Secret references become values only here, for this one child process's environment.
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args,
      env: await resolveMcpValues(config.env, 'env', config.server_id, this.secretResolver),
      cwd: config.cwd ?? undefined
    });
    this.registerCleanup(() => transport.close());

    const client = new Client({ name: 'autobyteus', version: '1.0.0' });
    await client.connect(transport);
    return client;
  }
}
