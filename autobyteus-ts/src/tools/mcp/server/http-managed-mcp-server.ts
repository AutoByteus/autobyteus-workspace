import { BaseManagedMcpServer } from './base-managed-mcp-server.js';
import type { StreamableHttpMcpServerConfig } from '../types.js';

type ClientLike = {
  connect?: (transport: unknown) => Promise<void>;
  initialize?: () => Promise<void>;
  close?: () => Promise<void> | void;
  listTools: () => Promise<unknown>;
  callTool: (...args: unknown[]) => Promise<unknown>;
};

type SdkModule = {
  Client: new (...args: unknown[]) => ClientLike;
  Transport: new (...args: unknown[]) => unknown;
};

async function loadSdk(): Promise<SdkModule> {
  const [clientModule, transportModule] = await Promise.all([
    import('@modelcontextprotocol/sdk/client/index.js'),
    import('@modelcontextprotocol/sdk/client/streamableHttp.js')
  ]);

  const Client = (clientModule as any).Client ?? (clientModule as any).default?.Client;
  const Transport =
    (transportModule as any).StreamableHTTPClientTransport ??
    (transportModule as any).StreamableHttpClientTransport ??
    (transportModule as any).default;

  if (!Client || !Transport) {
    throw new Error('MCP SDK streamable HTTP client transport is unavailable.');
  }

  return { Client, Transport };
}

export class HttpManagedMcpServer extends BaseManagedMcpServer {
  static sdkLoader: (() => Promise<SdkModule>) | null = null;

  static setSdkLoader(loader: (() => Promise<SdkModule>) | null): void {
    HttpManagedMcpServer.sdkLoader = loader;
  }

  protected async createClientSession(): Promise<ClientLike> {
    const config = this.configObject as StreamableHttpMcpServerConfig;
    const sdk = await (HttpManagedMcpServer.sdkLoader ?? loadSdk)();

    const transportOptions = {
      url: config.url,
      headers: config.headers ?? {}
    };

    let transport: unknown;
    try {
      transport = new sdk.Transport(config.url, transportOptions);
    } catch {
      transport = new sdk.Transport(transportOptions);
    }

    if (typeof (transport as { close?: () => void }).close === 'function') {
      this.registerCleanup(() => (transport as { close: () => void }).close());
    }

    const client = this.createClientInstance(sdk.Client);

    if (typeof client.connect === 'function') {
      await client.connect(transport);
    }

    if (typeof client.initialize === 'function') {
      await client.initialize();
    }

    return client;
  }

  private createClientInstance(ClientCtor: new (...args: any[]) => ClientLike): ClientLike {
    try {
      return new ClientCtor({ name: 'autobyteus', version: '1.0.0' });
    } catch {
      return new ClientCtor();
    }
  }
}
