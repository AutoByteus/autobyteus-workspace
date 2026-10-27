import type { Client } from '@modelcontextprotocol/client';
import type { BaseMcpConfig } from '../types.js';
import type { McpSecretResolver } from '../mcp-secret-resolver.js';

export enum ServerState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  FAILED = 'failed',
  CLOSED = 'closed'
}

/** The part of the MCP SDK client that a managed server uses. */
type ClientSessionLike = Pick<Client, 'listTools' | 'callTool' | 'close'>;

type CleanupCallback = () => Promise<void> | void;

export const DEFAULT_MCP_TOOL_CALL_TIMEOUT_MS = 6 * 60 * 1000;

export abstract class BaseManagedMcpServer {
  protected config: BaseMcpConfig;
  protected state: ServerState = ServerState.DISCONNECTED;
  protected clientSession: ClientSessionLike | null = null;

  private cleanupStack: CleanupCallback[] = [];
  private connectPromise: Promise<void> | null = null;

  /**
   * @param secretResolver resolves the config's secret references when the server connects. Without one, a config
   * that holds a reference fails to connect with `McpSecretUnavailableError` (`VAULT_UNAVAILABLE`).
   */
  constructor(config: BaseMcpConfig, protected readonly secretResolver: McpSecretResolver | null = null) {
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
        const session = await this.createClientSession();
        this.clientSession = session;
        this.registerCleanup(() => session.close());

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
    return result.tools;
  }

  async callTool(toolName: string, argumentsPayload: Record<string, unknown>, options: { signal?: AbortSignal | null } = {}): Promise<unknown> {
    if (this.state !== ServerState.CONNECTED) {
      await this.connect();
    }

    if (!this.clientSession) {
      throw new Error(`Cannot call tool: client session not available for server '${this.serverId}'.`);
    }

    return await this.clientSession.callTool(
      { name: toolName, arguments: argumentsPayload },
      { timeout: DEFAULT_MCP_TOOL_CALL_TIMEOUT_MS, signal: options.signal ?? undefined }
    );
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
