import type { BaseMcpConfig } from '../types.js';

export enum ServerState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
  CLOSED = 'closed'
}

type ClientSessionLike = {
  listTools: () => Promise<unknown>;
  callTool: (...args: unknown[]) => Promise<unknown>;
  close?: () => Promise<void> | void;
};

type CleanupCallback = () => Promise<void> | void;

export abstract class BaseManagedMcpServer {
  protected config: BaseMcpConfig;
  protected state: ServerState = ServerState.DISCONNECTED;
  protected clientSession: ClientSessionLike | null = null;

  private cleanupStack: CleanupCallback[] = [];
  private connectPromise: Promise<void> | null = null;

  constructor(config: BaseMcpConfig) {
    this.config = config;
  }

  get serverId(): string {
    return this.config.server_id;
  }

  get configObject(): BaseMcpConfig {
    return this.config;
  }

  get connectionState(): ServerState {
    return this.state;
  }

  protected abstract createClientSession(): Promise<ClientSessionLike>;

  protected registerCleanup(callback: CleanupCallback): void {
    this.cleanupStack.push(callback);
  }

  async connect(): Promise<void> {
    if (this.state === ServerState.CONNECTED) {
      return;
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.state = ServerState.CONNECTING;

    this.connectPromise = (async () => {
      try {
        this.cleanupStack = [];
        this.clientSession = await this.createClientSession();

        if (this.clientSession?.close) {
          this.registerCleanup(async () => {
            await this.clientSession?.close?.();
          });
        }

        this.state = ServerState.CONNECTED;
      } catch (error) {
        this.state = ServerState.FAILED;
        await this.runCleanup();
        this.clientSession = null;
        throw error;
      } finally {
        this.connectPromise = null;
      }
    })();

    return this.connectPromise;
  }

  async close(): Promise<void> {
    if (this.state === ServerState.DISCONNECTED || this.state === ServerState.CLOSED) {
      return;
    }

    this.state = ServerState.CLOSED;
    await this.runCleanup();
    this.clientSession = null;
  }

  async listRemoteTools(): Promise<unknown[]> {
    if (this.state !== ServerState.CONNECTED) {
      await this.connect();
    }

    if (!this.clientSession) {
      throw new Error(`Cannot list tools: client session not available for server '${this.serverId}'.`);
    }

    const result = await this.clientSession.listTools();
    if (Array.isArray(result)) {
      return result;
    }
    if (result && Array.isArray((result as { tools: unknown[] }).tools)) {
      return (result as { tools: unknown[] }).tools;
    }
    return [];
  }

  async callTool(toolName: string, argumentsPayload: Record<string, unknown>): Promise<unknown> {
    if (this.state !== ServerState.CONNECTED) {
      await this.connect();
    }

    if (!this.clientSession) {
      throw new Error(`Cannot call tool: client session not available for server '${this.serverId}'.`);
    }

    const callTool = this.clientSession.callTool.bind(this.clientSession);
    if (callTool.length >= 2) {
      return await callTool(toolName, argumentsPayload);
    }

    return await callTool({ name: toolName, arguments: argumentsPayload });
  }

  private async runCleanup(): Promise<void> {
    while (this.cleanupStack.length > 0) {
      const callback = this.cleanupStack.pop();
      if (!callback) {
        continue;
      }
      await callback();
    }
  }
}
