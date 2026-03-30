import path from "node:path";
import {
  parseArgs,
  resolveLaunchCommand,
  resolveRequestTimeoutMs,
} from "./codex-app-server-launch-config.js";
import { CodexAppServerClient } from "./codex-app-server-client.js";

type CodexAppServerProcessCloseListener = (error: Error | null) => void;
type CodexAppServerClientFactory = (cwd: string) => CodexAppServerClient;

export interface CodexAppServerClientManagerOptions {
  createClient?: CodexAppServerClientFactory;
}

type ClientEntry = {
  key: string;
  cwd: string;
  client: CodexAppServerClient | null;
  startPromise: Promise<CodexAppServerClient> | null;
  refCount: number;
};

const createDefaultClient: CodexAppServerClientFactory = (cwd: string) =>
  new CodexAppServerClient({
    command: resolveLaunchCommand(),
    args: parseArgs(),
    cwd,
    requestTimeoutMs: resolveRequestTimeoutMs(),
  });

export class CodexAppServerClientManager {
  private readonly entries = new Map<string, ClientEntry>();
  private readonly closeListeners = new Set<CodexAppServerProcessCloseListener>();
  private readonly createClient: CodexAppServerClientFactory;

  constructor(options: CodexAppServerClientManagerOptions = {}) {
    this.createClient = options.createClient ?? createDefaultClient;
  }

  async getClient(cwd: string): Promise<CodexAppServerClient> {
    const entry = this.getOrCreateEntry(cwd);
    return this.ensureStarted(entry);
  }

  async acquireClient(cwd: string): Promise<CodexAppServerClient> {
    const entry = this.getOrCreateEntry(cwd);
    entry.refCount += 1;
    try {
      return await this.ensureStarted(entry);
    } catch (error) {
      entry.refCount = Math.max(0, entry.refCount - 1);
      if (entry.refCount === 0 && !entry.client && !entry.startPromise) {
        this.entries.delete(entry.key);
      }
      throw error;
    }
  }

  onClose(listener: CodexAppServerProcessCloseListener): () => void {
    this.closeListeners.add(listener);
    return () => {
      this.closeListeners.delete(listener);
    };
  }

  async close(): Promise<void> {
    const entries = Array.from(this.entries.values());
    this.entries.clear();
    await Promise.all(
      entries.map(async (entry) => {
        entry.refCount = 0;
        const current = entry.client ?? (await entry.startPromise?.catch(() => null));
        entry.client = null;
        entry.startPromise = null;
        if (current) {
          await current.close();
        }
      }),
    );
  }

  async releaseClient(cwd: string): Promise<void> {
    const key = this.normalizeClientKey(cwd);
    const entry = this.entries.get(key);
    if (!entry) {
      return;
    }

    if (entry.refCount > 0) {
      entry.refCount -= 1;
    }
    if (entry.refCount > 0) {
      return;
    }

    const current = entry.client ?? (await entry.startPromise?.catch(() => null));
    this.entries.delete(entry.key);
    entry.client = null;
    entry.startPromise = null;
    if (current) {
      await current.close();
    }
  }

  private getOrCreateEntry(cwd: string): ClientEntry {
    const key = this.normalizeClientKey(cwd);
    const existing = this.entries.get(key);
    if (existing) {
      return existing;
    }
    const entry: ClientEntry = {
      key,
      cwd: key,
      client: null,
      startPromise: null,
      refCount: 0,
    };
    this.entries.set(key, entry);
    return entry;
  }

  private normalizeClientKey(cwd: string): string {
    const normalized = typeof cwd === "string" && cwd.trim().length > 0 ? cwd.trim() : process.cwd();
    return path.resolve(normalized);
  }

  private async ensureStarted(entry: ClientEntry): Promise<CodexAppServerClient> {
    if (entry.client) {
      return entry.client;
    }
    if (!entry.startPromise) {
      entry.startPromise = this.startClient(entry).catch((error) => {
        entry.startPromise = null;
        if (!entry.client && entry.refCount === 0) {
          this.entries.delete(entry.key);
        }
        throw error;
      });
    }
    return entry.startPromise;
  }

  private async startClient(entry: ClientEntry): Promise<CodexAppServerClient> {
    const client = this.createClient(entry.cwd);
    await client.start();
    await this.initializeClient(client);
    client.onClose((error) => {
      if (entry.client !== client) {
        return;
      }
      entry.client = null;
      entry.startPromise = null;
      this.entries.delete(entry.key);
      for (const listener of this.closeListeners) {
        try {
          listener(error);
        } catch {
          // ignore listener errors
        }
      }
    });
    entry.client = client;
    entry.startPromise = null;
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

let cachedCodexAppServerClientManager: CodexAppServerClientManager | null = null;

export const getCodexAppServerClientManager = (): CodexAppServerClientManager => {
  if (!cachedCodexAppServerClientManager) {
    cachedCodexAppServerClientManager = new CodexAppServerClientManager();
  }
  return cachedCodexAppServerClientManager;
};
