import { fork, type ChildProcess } from "node:child_process";
import { buildAgentChildEnvironment } from "autobyteus-ts/tools/terminal/agent-child-environment.js";
import path from "node:path";
import type {
  RawWatchEvent,
  WatcherRuntimeCommand,
  WatcherRuntimeStats,
} from "./watcher-runtime-protocol.js";
import { resolveWatcherRuntimeEntrypoint } from "./watcher-runtime-entrypoint.js";
import {
  attachWatcherRuntimeOutputLogging,
  watcherRuntimeLogger,
  watcherRuntimeTimingLog,
} from "./watcher-runtime-diagnostics.js";
import { createReadyState, type ReadyState } from "./watcher-runtime-ready-state.js";
import { WatcherRuntimeMessageDispatcher } from "./watcher-runtime-message-dispatcher.js";

export { resolveWatcherRuntimeEntrypoint } from "./watcher-runtime-entrypoint.js";

export type WatcherRuntimeIdentity = {
  watcherId: string;
  generation: number;
};

export type WatcherRuntimeClientCallbacks = {
  onRawEvent: (identity: WatcherRuntimeIdentity, event: RawWatchEvent) => void;
  onError?: (identity: WatcherRuntimeIdentity, error: Error) => void;
  onStopped?: (identity: WatcherRuntimeIdentity, stats: WatcherRuntimeStats) => void;
  onClosed?: (client: WatcherRuntimeClient) => void;
};

export type WatcherRuntimeStartOptions = WatcherRuntimeIdentity & {
  workspaceRootPath: string;
};

export type WatcherRuntimeClientOptions = WatcherRuntimeClientCallbacks & {
  workspaceRootPath: string;
  entrypointPath?: string;
  stopTimeoutMs?: number;
};

const DEFAULT_STOP_TIMEOUT_MS = 5000;

export class WatcherRuntimeClient {
  private workspaceRootPath: string;
  private callbacks: WatcherRuntimeClientCallbacks;
  private entrypointPath: string;
  private stopTimeoutMs: number;
  private child: ChildProcess | null = null;
  private currentIdentity: WatcherRuntimeIdentity | null = null;
  private readyState: ReadyState | null = null;
  private stopTimer: NodeJS.Timeout | null = null;
  private stopRequested = false;
  private closed = false;
  private messageDispatcher: WatcherRuntimeMessageDispatcher;

  constructor(options: WatcherRuntimeClientOptions) {
    this.workspaceRootPath = options.workspaceRootPath;
    this.callbacks = options;
    this.entrypointPath = options.entrypointPath ?? resolveWatcherRuntimeEntrypoint();
    this.stopTimeoutMs = options.stopTimeoutMs ?? DEFAULT_STOP_TIMEOUT_MS;
    this.messageDispatcher = new WatcherRuntimeMessageDispatcher({
      workspaceRootPath: this.workspaceRootPath,
      getCurrentIdentity: () => this.currentIdentity,
      onReady: () => this.readyState?.resolve(),
      onRawEvent: (identity, event) => this.callbacks.onRawEvent(identity, event),
      onError: (identity, error) => this.handleRuntimeError(identity, error),
      onStopped: (identity, stats) => this.handleRuntimeStopped(identity, stats),
    });
  }

  get isClosed(): boolean {
    return this.closed;
  }

  get identity(): WatcherRuntimeIdentity | null {
    return this.currentIdentity;
  }

  async start(options: WatcherRuntimeStartOptions): Promise<void> {
    if (this.child) {
      throw new Error("Watcher runtime client already started");
    }

    this.closed = false;
    this.stopRequested = false;
    this.currentIdentity = {
      watcherId: options.watcherId,
      generation: options.generation,
    };
    this.readyState = createReadyState();
    const startAt = Date.now();

    watcherRuntimeTimingLog("start.spawn.begin", {
      workspaceRootPath: this.workspaceRootPath,
      entrypointPath: this.entrypointPath,
      ...this.currentIdentity,
    });

    const child = fork(this.entrypointPath, [], {
      cwd: path.dirname(this.entrypointPath),
      env: buildAgentChildEnvironment(),
      execArgv: [],
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    });

    this.child = child;
    attachWatcherRuntimeOutputLogging(child);
    child.on("message", (message) => this.messageDispatcher.handle(message));
    child.on("error", (error) => this.handleChildError(error));
    child.on("exit", (code, signal) => this.handleExit(code, signal));

    this.sendCommand({
      type: "start",
      watcherId: options.watcherId,
      generation: options.generation,
      workspaceRootPath: options.workspaceRootPath,
    });

    try {
      await this.readyState.promise;
      watcherRuntimeTimingLog("start.ready", {
        workspaceRootPath: this.workspaceRootPath,
        durationMs: Date.now() - startAt,
        watcherId: options.watcherId,
        generation: options.generation,
      });
    } catch (error) {
      this.killNow("start-failed");
      throw error;
    }
  }

  async requestStop(reason = "logical-stop"): Promise<void> {
    if (this.closed || this.stopRequested) {
      return;
    }

    this.stopRequested = true;
    const identity = this.currentIdentity;
    watcherRuntimeTimingLog("stop.request", {
      workspaceRootPath: this.workspaceRootPath,
      reason,
      ...identity,
    });

    if (identity) {
      this.sendCommand({
        type: "stop",
        watcherId: identity.watcherId,
        generation: identity.generation,
        reason,
      });
    }

    this.rejectReady(new Error(`Watcher runtime stop requested before ready: ${reason}`));
    this.armForceKill(reason);
  }

  killNow(reason = "forced-kill"): void {
    if (this.closed) {
      return;
    }
    watcherRuntimeTimingLog("kill", {
      workspaceRootPath: this.workspaceRootPath,
      reason,
      ...this.currentIdentity,
    });
    this.clearStopTimer();
    try {
      this.child?.kill("SIGKILL");
    } catch {
      // ignore; process may already be gone
    }
    this.rejectReady(new Error(`Watcher runtime killed: ${reason}`));
  }

  private handleRuntimeError(identity: WatcherRuntimeIdentity, error: Error): void {
    this.callbacks.onError?.(identity, error);
    this.rejectReady(error);
  }

  private handleRuntimeStopped(
    identity: WatcherRuntimeIdentity,
    stats: WatcherRuntimeStats,
  ): void {
    this.callbacks.onStopped?.(identity, stats);
    this.clearStopTimer();
  }

  private handleChildError(error: Error): void {
    watcherRuntimeLogger.error(`Watcher runtime child error for ${this.workspaceRootPath}: ${error.message}`);
    this.callbacks.onError?.(
      this.currentIdentity ?? { watcherId: "unknown", generation: -1 },
      error,
    );
    this.rejectReady(error);
  }

  private handleExit(code: number | null, signal: NodeJS.Signals | null): void {
    watcherRuntimeTimingLog("exit", {
      workspaceRootPath: this.workspaceRootPath,
      code,
      signal,
      stopRequested: this.stopRequested,
      ...this.currentIdentity,
    });
    const unexpected = !this.stopRequested && code !== 0;
    if (unexpected) {
      this.rejectReady(new Error(`Watcher runtime exited unexpectedly: code=${code} signal=${signal}`));
    }
    this.clearStopTimer();
    this.closed = true;
    this.child = null;
    this.callbacks.onClosed?.(this);
  }

  private sendCommand(command: WatcherRuntimeCommand): void {
    if (!this.child?.connected) {
      this.rejectReady(new Error("Watcher runtime IPC channel is not connected"));
      return;
    }
    this.child.send(command);
  }

  private armForceKill(reason: string): void {
    this.clearStopTimer();
    this.stopTimer = setTimeout(() => {
      watcherRuntimeLogger.warn(
        `Watcher runtime for ${this.workspaceRootPath} did not stop within ${this.stopTimeoutMs}ms; killing child`,
      );
      this.killNow(`stop-timeout:${reason}`);
    }, this.stopTimeoutMs);
    this.stopTimer.unref?.();
  }

  private clearStopTimer(): void {
    if (!this.stopTimer) {
      return;
    }
    clearTimeout(this.stopTimer);
    this.stopTimer = null;
  }

  private rejectReady(error: Error): void {
    this.readyState?.reject(error);
    this.readyState = null;
  }
}
