import path from "node:path";
import { parseArgs, resolveLaunchCommand, resolveRequestTimeoutMs } from "./codex-app-server-launch-config.js";
import { CodexAppServerClient } from "./codex-app-server-client.js";

type CloseListener = (error: Error | null) => void;
export interface CodexAppServerClientManagerOptions { createClient?: (cwd: string) => CodexAppServerClient; }
export interface CodexAppServerClientLease {
  acquire(): Promise<CodexAppServerClient>;
  release(): Promise<void>;
}
type ClientEntry = {
  key: string; client: CodexAppServerClient | null; startPromise: Promise<CodexAppServerClient> | null;
  holders: number; closing: boolean; closeAttempt: Promise<void> | null;
};

/** One exact lease per holder/generation. Failed startup/close never loses its client. */
export class CodexAppServerClientManager {
  private readonly entries = new Map<string, ClientEntry>();
  private readonly closeListeners = new Set<CloseListener>();
  private readonly createClient: (cwd: string) => CodexAppServerClient;
  constructor(options: CodexAppServerClientManagerOptions = {}) {
    this.createClient = options.createClient ?? ((cwd) => new CodexAppServerClient({
      command: resolveLaunchCommand(), args: parseArgs(), cwd, requestTimeoutMs: resolveRequestTimeoutMs(),
    }));
  }

  beginAcquire(cwd: string): CodexAppServerClientLease {
    const key = path.resolve(cwd?.trim() || process.cwd());
    let entry = this.entries.get(key);
    if (entry?.closing) throw new Error(`Codex client generation for '${key}' has unresolved cleanup.`);
    if (!entry) {
      entry = { key, client: null, startPromise: null, holders: 0, closing: false, closeAttempt: null };
      this.entries.set(key, entry);
    }
    const exact = entry;
    exact.holders += 1;
    let relinquished = false;
    let released = false;
    return Object.freeze({
      acquire: () => {
        if (relinquished) return Promise.reject(new Error("Codex client lease has been released."));
        return this.ensureStarted(exact);
      },
      release: async () => {
        if (released) return;
        if (!relinquished) { relinquished = true; exact.holders -= 1; }
        if (exact.holders > 0) { released = true; return; }
        await this.closeEntry(exact);
        released = true;
      },
    });
  }

  onClose(listener: CloseListener): () => void {
    this.closeListeners.add(listener);
    return () => { this.closeListeners.delete(listener); };
  }

  async close(): Promise<void> {
    const errors: unknown[] = [];
    for (const entry of this.entries.values()) {
      entry.holders = 0;
      try { await this.closeEntry(entry); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Codex client shutdown failed.");
  }

  private closeEntry(entry: ClientEntry): Promise<void> {
    if (entry.closeAttempt) return entry.closeAttempt;
    entry.closing = true;
    const attempt = (async () => {
      if (entry.client) await entry.client.close();
      // Startup can fail as a consequence of exact process close. It cannot introduce a new client.
      if (entry.startPromise) {
        let timeout: ReturnType<typeof setTimeout> | undefined;
        try { await Promise.race([entry.startPromise.catch(() => undefined), new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error("Codex exact startup remains pending after close.")), 5_000);
        })]); } finally { if (timeout) clearTimeout(timeout); }
      }

      entry.client = null;
      entry.startPromise = null;
      if (this.entries.get(entry.key) === entry) this.entries.delete(entry.key);
    })();
    entry.closeAttempt = attempt;
    void attempt.finally(() => { if (entry.closeAttempt === attempt) entry.closeAttempt = null; }).catch(() => undefined);
    return attempt;
  }

  private ensureStarted(entry: ClientEntry): Promise<CodexAppServerClient> {
    if (entry.closing) return Promise.reject(new Error("Codex client generation is closing."));
    if (!entry.startPromise) entry.startPromise = this.startClient(entry);
    return entry.startPromise;
  }

  private async startClient(entry: ClientEntry): Promise<CodexAppServerClient> {
    const client = this.createClient(entry.key);
    entry.client = client; // before start/initialize: failure retains the lowest concrete owner
    client.onClose((error) => {
      if (entry.client !== client) return;
      if (!entry.closing) entry.closing = true;
      for (const listener of this.closeListeners) {
        try { listener(error); } catch { /* observer does not own release */ }
      }
    });
    await client.start();
    await client.request("initialize", {
      clientInfo: { name: "autobyteus-server-ts", version: "0.1.1" }, capabilities: { experimentalApi: true },
    });
    client.notify("initialized", {});
    if (entry.closing) throw new Error("Codex client closed during initialization.");
    return client;
  }
}

let cachedCodexAppServerClientManager: CodexAppServerClientManager | null = null;
export const getCodexAppServerClientManager = (): CodexAppServerClientManager =>
  cachedCodexAppServerClientManager ??= new CodexAppServerClientManager();
