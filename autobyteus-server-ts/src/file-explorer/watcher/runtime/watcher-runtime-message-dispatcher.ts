import {
  isWatcherRuntimeMessage,
  type RawWatchEvent,
  type WatcherRuntimeMessage,
  type WatcherRuntimeStats,
} from "./watcher-runtime-protocol.js";
import { watcherRuntimeLogger, watcherRuntimeTimingLog } from "./watcher-runtime-diagnostics.js";
import type { WatcherRuntimeIdentity } from "./watcher-runtime-client.js";

export type WatcherRuntimeMessageDispatcherOptions = {
  workspaceRootPath: string;
  getCurrentIdentity: () => WatcherRuntimeIdentity | null;
  onReady: () => void;
  onRawEvent: (identity: WatcherRuntimeIdentity, event: RawWatchEvent) => void;
  onError: (identity: WatcherRuntimeIdentity, error: Error) => void;
  onStopped: (identity: WatcherRuntimeIdentity, stats: WatcherRuntimeStats) => void;
};

export class WatcherRuntimeMessageDispatcher {
  private options: WatcherRuntimeMessageDispatcherOptions;
  private staleMessageCount = 0;

  constructor(options: WatcherRuntimeMessageDispatcherOptions) {
    this.options = options;
  }

  handle(rawMessage: unknown): void {
    if (!isWatcherRuntimeMessage(rawMessage)) {
      watcherRuntimeLogger.warn("Ignoring malformed watcher runtime message");
      return;
    }

    if (!this.isCurrentIdentity(rawMessage)) {
      this.logStaleMessage(rawMessage);
      return;
    }

    const identity = this.identityFromMessage(rawMessage);
    switch (rawMessage.type) {
      case "ready":
        this.options.onReady();
        watcherRuntimeTimingLog("message.ready", {
          workspaceRootPath: this.options.workspaceRootPath,
          stats: rawMessage.stats,
          startDurationMs: rawMessage.startDurationMs,
          ...identity,
        });
        break;
      case "rawEvent":
        this.options.onRawEvent(identity, rawMessage.event);
        break;
      case "error": {
        const error = new Error(rawMessage.message);
        if (rawMessage.stack) {
          error.stack = rawMessage.stack;
        }
        this.options.onError(identity, error);
        break;
      }
      case "stopped":
        watcherRuntimeTimingLog("message.stopped", {
          workspaceRootPath: this.options.workspaceRootPath,
          reason: rawMessage.reason,
          closeDurationMs: rawMessage.closeDurationMs,
          stats: rawMessage.stats,
          ...identity,
        });
        this.options.onStopped(identity, rawMessage.stats);
        break;
      case "log":
        watcherRuntimeLogger[rawMessage.level](`[WatcherRuntime] ${rawMessage.message}`);
        break;
    }
  }

  private isCurrentIdentity(message: WatcherRuntimeMessage): boolean {
    const currentIdentity = this.options.getCurrentIdentity();
    return (
      currentIdentity?.watcherId === message.watcherId &&
      currentIdentity.generation === message.generation
    );
  }

  private logStaleMessage(message: WatcherRuntimeMessage): void {
    const currentIdentity = this.options.getCurrentIdentity();
    this.staleMessageCount += 1;
    watcherRuntimeTimingLog("message.stale", {
      workspaceRootPath: this.options.workspaceRootPath,
      staleMessageCount: this.staleMessageCount,
      messageType: message.type,
      watcherId: message.watcherId,
      generation: message.generation,
      currentWatcherId: currentIdentity?.watcherId ?? null,
      currentGeneration: currentIdentity?.generation ?? null,
    });
  }

  private identityFromMessage(message: WatcherRuntimeMessage): WatcherRuntimeIdentity {
    return {
      watcherId: message.watcherId,
      generation: message.generation,
    };
  }
}
