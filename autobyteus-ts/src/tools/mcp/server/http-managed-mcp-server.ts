import type { Client, SdkHttpError } from '@modelcontextprotocol/client';
import { BaseManagedMcpServer } from './base-managed-mcp-server.js';
import type { StreamableHttpMcpServerConfig } from '../types.js';
import { resolveMcpValue, resolveMcpValues } from '../mcp-secret-resolver.js';

export class HttpManagedMcpServer extends BaseManagedMcpServer {
  protected async createClientSession(): Promise<Client> {
    const config = this.configObject as StreamableHttpMcpServerConfig;
    // Loaded on first use, so importing this module does not load the MCP SDK.
    const { Client, StreamableHTTPClientTransport, SdkHttpError } = await import('@modelcontextprotocol/client');

    // The SDK sends requestInit.headers on every POST and on the SSE GET. Its defaults are kept:
    // redirects are followed only within the configured URL's origin (redirectPolicy 'same-origin'),
    // and connect() runs the 2025 initialize handshake (versionNegotiation 'legacy').
    // Secret references become values only here, for this transport's request headers.
    const resolved = {
      headers: await resolveMcpValues(config.headers, 'header', config.server_id, this.secretResolver),
      token: config.token === null
        ? null
        : await resolveMcpValue(config.token, { serverId: config.server_id, field: 'token' }, this.secretResolver),
    };
    const transport = new StreamableHTTPClientTransport(new URL(config.url), {
      requestInit: { headers: config.requestHeaders(resolved) }
    });
    this.registerCleanup(() => transport.close());

    const client = new Client({ name: 'autobyteus', version: '1.0.0' });
    try {
      await client.connect(transport);
    } catch (error) {
      // The SDK keeps the HTTP status on the error, not in its message.
      throw SdkHttpError.isInstance(error) ? withHttpStatus(error) : error;
    }
    return client;
  }
}

/** The SDK's HTTP failure with its status first in the message, e.g. "HTTP 401 Unauthorized: Error POSTing to endpoint: …". */
function withHttpStatus(error: SdkHttpError): Error {
  const status = error.statusText ? `HTTP ${error.status} ${error.statusText}` : `HTTP ${error.status}`;
  return new Error(`${status}: ${error.message}`, { cause: error });
}
