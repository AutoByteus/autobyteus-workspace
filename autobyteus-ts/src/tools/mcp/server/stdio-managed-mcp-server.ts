import { BaseManagedMcpServer } from './base-managed-mcp-server.js';
import type { StdioMcpServerConfig } from '../types.js';

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
    import('@modelcontextprotocol/sdk/client/stdio.js')
  ]);

  const Client = (clientModule as any).Client ?? (clientModule as any).default?.Client;
  const Transport =
    (transportModule as any).StdioClientTransport ??
    (transportModule as any).StdioTransport ??
    (transportModule as any).default;

  if (!Client || !Transport) {
    throw new Error('MCP SDK stdio client transport is unavailable.');
  }

  return { Client, Transport };
}

export class StdioManagedMcpServer extends BaseManagedMcpServer {
  static sdkLoader: (() => Promise<SdkModule>) | null = null;

  static setSdkLoader(loader: (() => Promise<SdkModule>) | null): void {
    StdioManagedMcpServer.sdkLoader = loader;
  }

  protected async createClientSession(): Promise<ClientLike> {
    const config = this.configObject as StdioMcpServerConfig;
    const sdk = await (StdioManagedMcpServer.sdkLoader ?? loadSdk)();

    const transport = new sdk.Transport({
      command: config.command,
      args: config.args,
      env: config.env,
      cwd: config.cwd ?? undefined
    });

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

  private createClientInstance(ClientCtor: new (...args: unknown[]) => ClientLike): ClientLike {
    try {
      return new ClientCtor({ name: 'autobyteus', version: '1.0.0' });
    } catch {
      return new ClientCtor();
    }
  }
}
