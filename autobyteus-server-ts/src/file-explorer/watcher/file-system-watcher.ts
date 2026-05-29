import path from "node:path";
import { randomUUID } from "node:crypto";
import type { WorkspaceFileExplorer } from "../file-explorer.js";
import { EventBatcher, AsyncQueue } from "./event-batcher.js";
import { WatchdogHandler } from "./watchdog-handler.js";
import type { TraversalIgnoreStrategy } from "../traversal-ignore-strategy/traversal-ignore-strategy.js";
import { WorkspaceIgnoreMatcher } from "../traversal-ignore-strategy/workspace-ignore-matcher.js";
import type { RawWatchEvent } from "./runtime/watcher-runtime-protocol.js";
import {
  type WatcherRuntimeIdentity,
  type WatcherRuntimeClient,
} from "./runtime/watcher-runtime-client.js";
import {
  defaultWatcherRuntimeProcessRegistry,
  type WatcherRuntimeProcessRegistry,
} from "./runtime/watcher-runtime-process-registry.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

const isTimingTraceEnabled = (): boolean =>
  process.env.AUTOBYTEUS_FILE_EXPLORER_WATCHER_TRACE === "1" ||
  process.env.AUTOBYTEUS_FE_TERMINAL_TIMING === "1" ||
  process.env.AUTOBYTEUS_TIMING_TRACE === "1";

const timingLog = (event: string, details: Record<string, unknown> = {}): void => {
  if (!isTimingTraceEnabled()) {
    return;
  }

  logger.info(`[TIMING][FileSystemWatcher] ${event} ${JSON.stringify({
    at: Date.now(),
    ...details,
  })}`);
};

type PendingUnlink = {
  path: string;
  isDirectory: boolean;
  timer: NodeJS.Timeout;
};

type SuppressedPath = {
  path: string;
  expiresAt: number;
};

type WatcherQueueItem = string | null | Error;

export class FileSystemWatcher {
  private fileExplorer: WorkspaceFileExplorer;
  private handler: WatchdogHandler;
  private ignoreMatcher: WorkspaceIgnoreMatcher;
  private runtimeRegistry: WatcherRuntimeProcessRegistry;
  private runtimeClient: WatcherRuntimeClient | null = null;
  private watcherId: string | null = null;
  private generation = 0;
  private readyPromise: Promise<void> | null = null;
  private subscribers = new Set<AsyncQueue<WatcherQueueItem>>();
  private pendingUnlinks: PendingUnlink[] = [];
  private moveDetectionWindowMs = 200;
  private suppressionWindowMs = 2000;
  private suppressedPaths: SuppressedPath[] = [];
  private maxSubscriberQueueSize = 5000;

  constructor(
    fileExplorer: WorkspaceFileExplorer,
    ignoreStrategies: TraversalIgnoreStrategy[],
    runtimeRegistry: WatcherRuntimeProcessRegistry = defaultWatcherRuntimeProcessRegistry,
  ) {
    this.fileExplorer = fileExplorer;
    this.runtimeRegistry = runtimeRegistry;
    this.ignoreMatcher = new WorkspaceIgnoreMatcher(fileExplorer.workspaceRootPath, [
      ...ignoreStrategies,
    ]);
    this.handler = new WatchdogHandler(
      fileExplorer,
      (event) => this.handleChangeEvent(event.toJson()),
      this.ignoreMatcher,
    );

    const strategyNames = ignoreStrategies.map((strategy) => strategy.constructor.name);
    logger.info(
      `FileSystemWatcher initialized for '${fileExplorer.workspaceRootPath}' with ignore strategies: ${strategyNames.join(
        ", ",
      )}`,
    );
  }

  start(): void {
    if (this.runtimeClient) {
      return;
    }

    const watcherId = randomUUID();
    const generation = this.generation + 1;
    const startAt = Date.now();
    this.watcherId = watcherId;
    this.generation = generation;

    const client = this.runtimeRegistry.createClient({
      workspaceRootPath: this.fileExplorer.workspaceRootPath,
      onRawEvent: (identity, event) => this.handleRuntimeRawEvent(identity, event),
      onError: (identity, error) => this.handleRuntimeError(identity, error),
      onStopped: (identity, stats) => {
        timingLog("runtime.stopped", {
          workspaceRootPath: this.fileExplorer.workspaceRootPath,
          ...identity,
          stats,
        });
      },
    });
    this.runtimeClient = client;

    timingLog("start.begin", {
      workspaceRootPath: this.fileExplorer.workspaceRootPath,
      watcherId,
      generation,
    });

    this.readyPromise = client
      .start({
        watcherId,
        generation,
        workspaceRootPath: this.fileExplorer.workspaceRootPath,
      })
      .then(() => {
        if (!this.isCurrentRuntime({ watcherId, generation })) {
          return;
        }
        timingLog("start.ready", {
          workspaceRootPath: this.fileExplorer.workspaceRootPath,
          watcherId,
          generation,
          durationMs: Date.now() - startAt,
        });
        logger.info(`Started filesystem watcher for workspace ${this.fileExplorer.workspaceRootPath}`);
      })
      .catch((error: unknown) => {
        if (this.isCurrentRuntime({ watcherId, generation })) {
          this.runtimeClient = null;
          this.watcherId = null;
          throw error;
        }
      });
  }

  async stop(reason = "logical-stop"): Promise<void> {
    const stopAt = Date.now();
    timingLog("stop.begin", {
      workspaceRootPath: this.fileExplorer.workspaceRootPath,
      subscriberCount: this.subscribers.size,
      pendingUnlinkTimerCount: this.pendingUnlinks.length,
      watcherId: this.watcherId,
      generation: this.generation,
      reason,
    });

    this.closeSubscribers(null);
    this.clearPendingUnlinks();

    const client = this.runtimeClient;
    const watcherId = this.watcherId;
    const generation = this.generation;
    this.runtimeClient = null;
    this.watcherId = null;
    const readyPromise = this.readyPromise;
    this.readyPromise = null;
    if (readyPromise) {
      void readyPromise.catch(() => undefined);
    }

    if (client) {
      await client.requestStop(reason);
      logger.info(
        `Logically stopped filesystem watcher for workspace ${this.fileExplorer.workspaceRootPath}`,
      );
    }

    timingLog("stop.end", {
      workspaceRootPath: this.fileExplorer.workspaceRootPath,
      durationMs: Date.now() - stopAt,
      watcherId,
      generation,
      reason,
    });
  }

  async waitUntilReady(): Promise<void> {
    if (this.readyPromise) {
      await this.readyPromise;
    }
  }

  subscribe(): AsyncQueue<WatcherQueueItem> {
    const queue = new AsyncQueue<WatcherQueueItem>();
    this.subscribers.add(queue);
    return queue;
  }

  unsubscribe(queue: AsyncQueue<WatcherQueueItem>): void {
    this.subscribers.delete(queue);
    queue.push(null);
  }

  events(): AsyncGenerator<string, void, void> {
    const queue = this.subscribe();
    const batcher = new EventBatcher(this.createSubscriptionStream(queue), 0.25);
    return batcher.getBatchedEvents();
  }

  private createSubscriptionStream(
    queue: AsyncQueue<WatcherQueueItem>,
  ): AsyncGenerator<string, void, void> {
    let closed = false;

    const doneResult = (): IteratorResult<string, void> => ({
      done: true,
      value: undefined,
    });

    const close = (): void => {
      if (closed) {
        return;
      }
      closed = true;
      this.unsubscribe(queue);
    };

    const iterator: AsyncGenerator<string, void, void> = {
      next: async () => {
        if (closed) {
          return doneResult();
        }

        const event = await queue.pop();
        if (event instanceof Error) {
          close();
          throw event;
        }
        if (event === null || closed) {
          close();
          return doneResult();
        }

        return {
          done: false,
          value: event,
        };
      },
      return: async () => {
        close();
        return doneResult();
      },
      throw: async (error?: unknown) => {
        close();
        throw error;
      },
      [Symbol.asyncDispose]: async () => {
        close();
      },
      [Symbol.asyncIterator]: () => iterator,
    };

    return iterator;
  }

  suppressPaths(paths: string[], ttlMs = this.suppressionWindowMs): void {
    const now = Date.now();
    this.cleanupSuppressedPaths(now);

    for (const targetPath of paths) {
      this.suppressedPaths.push({
        path: path.resolve(targetPath),
        expiresAt: now + ttlMs,
      });
    }
  }

  private handleRuntimeRawEvent(identity: WatcherRuntimeIdentity, event: RawWatchEvent): void {
    if (!this.isCurrentRuntime(identity)) {
      timingLog("runtime.rawEvent.stale", {
        workspaceRootPath: this.fileExplorer.workspaceRootPath,
        eventType: event.eventType,
        path: event.path,
        ...identity,
        currentWatcherId: this.watcherId,
        currentGeneration: this.generation,
      });
      return;
    }

    switch (event.eventType) {
      case "add":
      case "addDir":
        this.handleAdd(event.path, event.isDirectory);
        break;
      case "unlink":
      case "unlinkDir":
        this.handleUnlink(event.path, event.isDirectory);
        break;
      case "change":
        this.handleModify(event.path);
        break;
    }
  }

  private handleRuntimeError(identity: WatcherRuntimeIdentity, error: Error): void {
    logger.error(
      `Watcher runtime error for ${this.fileExplorer.workspaceRootPath}: ${error.message}`,
    );
    if (!this.isCurrentRuntime(identity)) {
      return;
    }
    this.closeSubscribers(new Error("File Explorer watcher runtime failed; reconnect required"));
  }

  private handleChangeEvent(serializedEvent: string): void {
    if (this.subscribers.size === 0) {
      return;
    }

    for (const queue of [...this.subscribers]) {
      if (queue.size >= this.maxSubscriberQueueSize) {
        logger.warn(
          `File Explorer event subscriber queue overflow for ${this.fileExplorer.workspaceRootPath}; closing stream`,
        );
        this.subscribers.delete(queue);
        queue.clear();
        queue.push(new Error("File Explorer event queue overflow; reconnect required"));
        continue;
      }
      queue.push(serializedEvent);
    }
  }

  private closeSubscribers(error: Error | null): void {
    for (const queue of this.subscribers) {
      queue.clear();
      queue.push(error ?? null);
    }
    this.subscribers.clear();
  }

  private clearPendingUnlinks(): void {
    for (const pending of this.pendingUnlinks) {
      clearTimeout(pending.timer);
    }
    this.pendingUnlinks = [];
  }

  private handleAdd(targetPath: string, isDirectory: boolean): void {
    if (this.isSuppressed(targetPath)) {
      return;
    }

    const pendingIndex = this.pendingUnlinks.findIndex(
      (pending) => pending.isDirectory === isDirectory,
    );

    if (pendingIndex >= 0) {
      const pending = this.pendingUnlinks.splice(pendingIndex, 1)[0];
      clearTimeout(pending.timer);
      if (!this.handler.shouldIgnore(targetPath, isDirectory)) {
        this.handler.handleMove(pending.path, targetPath, isDirectory);
      }
      return;
    }

    if (this.handler.shouldIgnore(targetPath, isDirectory)) {
      return;
    }

    this.handler.handleAdd(targetPath, isDirectory);
  }

  private handleUnlink(targetPath: string, isDirectory: boolean): void {
    if (this.isSuppressed(targetPath)) {
      return;
    }

    if (this.handler.shouldIgnore(targetPath, isDirectory)) {
      return;
    }

    const pending: PendingUnlink = {
      path: targetPath,
      isDirectory,
      timer: setTimeout(() => {
        this.pendingUnlinks = this.pendingUnlinks.filter((item) => item !== pending);
        this.handler.handleDelete(targetPath, isDirectory);
      }, this.moveDetectionWindowMs),
    };

    this.pendingUnlinks.push(pending);
  }

  private handleModify(targetPath: string): void {
    if (this.isSuppressed(targetPath)) {
      return;
    }

    if (this.handler.shouldIgnore(targetPath, false)) {
      return;
    }

    this.handler.handleModify(targetPath);
  }

  private isCurrentRuntime(identity: WatcherRuntimeIdentity): boolean {
    return (
      this.runtimeClient !== null &&
      this.watcherId === identity.watcherId &&
      this.generation === identity.generation
    );
  }

  private isSuppressed(targetPath: string): boolean {
    const resolvedPath = path.resolve(targetPath);
    const now = Date.now();
    this.cleanupSuppressedPaths(now);

    return this.suppressedPaths.some((entry) =>
      resolvedPath === entry.path || resolvedPath.startsWith(`${entry.path}${path.sep}`),
    );
  }

  private cleanupSuppressedPaths(now: number): void {
    this.suppressedPaths = this.suppressedPaths.filter((entry) => entry.expiresAt > now);
  }
}
