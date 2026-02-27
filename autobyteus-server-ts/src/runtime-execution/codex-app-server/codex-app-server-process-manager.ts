import {
  parseArgs,
  resolveLaunchCommand,
  resolveRequestTimeoutMs,
} from "./codex-runtime-launch-config.js";
import { CodexAppServerClient } from "./codex-app-server-client.js";

type ProcessCloseListener = (error: Error | null) => void;
type CodexClientFactory = (cwd: string) => CodexAppServerClient;

const createDefaultClient: CodexClientFactory = (cwd: string) =>
  new CodexAppServerClient({
    command: resolveLaunchCommand(),
    args: parseArgs(),
    cwd,
    requestTimeoutMs: resolveRequestTimeoutMs(),
  });

export class CodexAppServerProcessManager {
  private client: CodexAppServerClient | null = null;
  private startPromise: Promise<CodexAppServerClient> | null = null;
  private readonly closeListeners = new Set<ProcessCloseListener>();
  private readonly createClient: CodexClientFactory;

  constructor(options: { createClient?: CodexClientFactory } = {}) {
    this.createClient = options.createClient ?? createDefaultClient;
  }

  async getClient(cwd: string): Promise<CodexAppServerClient> {
    if (this.client) {
      return this.client;
    }
    if (!this.startPromise) {
      this.startPromise = this.startClient(cwd);
    }
    try {
      return await this.startPromise;
    } finally {
      this.startPromise = null;
    }
  }

  onClose(listener: ProcessCloseListener): () => void {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  async close(): Promise<void> {
    const current = this.client;
    this.client = null;
    this.startPromise = null;
    if (!current) {
      return;
    }
    await current.close();
  }

  private async startClient(cwd: string): Promise<CodexAppServerClient> {
    const client = this.createClient(cwd);
    await client.start();
    await this.initializeClient(client);
    client.onClose((error) => {
      if (this.client !== client) {
        return;
      }
      this.client = null;
      for (const listener of this.closeListeners) {
        try {
          listener(error);
        } catch {
          // ignore listener errors
        }
      }
    });
    this.client = client;
    return client;
  }

  private async initializeClient(client: CodexAppServerClient): Promise<void> {
    await client.request("initialize", {
      clientInfo: {
        name: "autobyteus-server-ts",
        version: "0.1.1",
      },
      capabilities: {
        experimentalApi: true,
      },
    });
    client.notify("initialized", {});
  }
}

let cachedCodexAppServerProcessManager: CodexAppServerProcessManager | null = null;

export const getCodexAppServerProcessManager = (): CodexAppServerProcessManager => {
  if (!cachedCodexAppServerProcessManager) {
    cachedCodexAppServerProcessManager = new CodexAppServerProcessManager();
  }
  return cachedCodexAppServerProcessManager;
};
