import { WatcherRuntimeClient, type WatcherRuntimeClientOptions } from "./watcher-runtime-client.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class WatcherRuntimeProcessRegistry {
  private clientsByWorkspaceRoot = new Map<string, WatcherRuntimeClient>();

  createClient(options: WatcherRuntimeClientOptions): WatcherRuntimeClient {
    const existing = this.clientsByWorkspaceRoot.get(options.workspaceRootPath);
    if (existing && !existing.isClosed) {
      logger.warn(
        `Replacing stale watcher runtime client for ${options.workspaceRootPath}; killing previous child`,
      );
      existing.killNow("replaced-by-new-generation");
    }

    const client = new WatcherRuntimeClient({
      ...options,
      onClosed: (closedClient) => {
        if (this.clientsByWorkspaceRoot.get(options.workspaceRootPath) === closedClient) {
          this.clientsByWorkspaceRoot.delete(options.workspaceRootPath);
        }
        options.onClosed?.(closedClient);
      },
    });
    this.clientsByWorkspaceRoot.set(options.workspaceRootPath, client);
    return client;
  }
}

export const defaultWatcherRuntimeProcessRegistry = new WatcherRuntimeProcessRegistry();
