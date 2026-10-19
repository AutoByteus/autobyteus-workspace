import { BaseManagedMcpServer } from './base-managed-mcp-server.js';
import type { StreamableHttpMcpServerConfig } from '../types.js';

type ClientLike = {
  connect: (transport: unknown) => Promise<void>;
  close?: () => Promise<void> | void;
  listTools: () => Promise<unknown>;
  callTool: (...args: unknown[]) => Promise<unknown>;
};

type TransportOptions = {
  requestInit: { headers: Record<string, string> };
};

type SdkModule = {
  Client: new (clientInfo: { name: string; version: string }) => ClientLike;
  Transport: new (url: URL, options: TransportOptions) => unknown;
};

async function loadSdk(): Promise<SdkModule> {
  const [{ Client }, { StreamableHTTPClientTransport }] = await Promise.all([
    import('@modelcontextprotocol/sdk/client/index.js'),
    import('@modelcontextprotocol/sdk/client/streamableHttp.js')
  ]);
  return {
    Client: Client as unknown as SdkModule['Client'],
    Transport: StreamableHTTPClientTransport as unknown as SdkModule['Transport']
  };
}

export class HttpManagedMcpServer extends BaseManagedMcpServer {
  static sdkLoader: (() => Promise<SdkModule>) | null = null;

  static setSdkLoader(loader: (() => Promise<SdkModule>) | null): void {
    HttpManagedMcpServer.sdkLoader = loader;
  }

  protected async createClientSession(): Promise<ClientLike> {
    const config = this.configObject as StreamableHttpMcpServerConfig;
    const sdk = await (HttpManagedMcpServer.sdkLoader ?? loadSdk)();

    // The SDK sends requestInit.headers on every POST and on the SSE GET.
    const transport = new sdk.Transport(new URL(config.url), {
      requestInit: { headers: config.requestHeaders() }
    });

    if (typeof (transport as { close?: () => void }).close === 'function') {
      this.registerCleanup(() => (transport as { close: () => void }).close());
    }

    const client = new sdk.Client({ name: 'autobyteus', version: '1.0.0' });
    await client.connect(transport);
    return client;
  }
}
