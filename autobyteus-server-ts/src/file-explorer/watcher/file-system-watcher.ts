import chokidar, { type FSWatcher } from "chokidar";
import type { FileExplorer } from "../file-explorer.js";
import { EventBatcher, AsyncQueue } from "./event-batcher.js";
import { WatchdogHandler } from "./watchdog-handler.js";
import type { TraversalIgnoreStrategy } from "../traversal-ignore-strategy/traversal-ignore-strategy.js";

const logger = {
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

type PendingUnlink = {
  path: string;
  isDirectory: boolean;
  timer: NodeJS.Timeout;
};

export class FileSystemWatcher {
  private fileExplorer: FileExplorer;
  private handler: WatchdogHandler;
  private watcher: FSWatcher | null = null;
  private readyPromise: Promise<void> | null = null;
  private readyResolve: (() => void) | null = null;
  private subscribers = new Set<AsyncQueue<string | null>>();
  private pendingUnlinks: PendingUnlink[] = [];
  private moveDetectionWindowMs = 200;

  constructor(fileExplorer: FileExplorer, ignoreStrategies: TraversalIgnoreStrategy[]) {
    this.fileExplorer = fileExplorer;
    this.handler = new WatchdogHandler(fileExplorer, (event) => this.handleChangeEvent(event.toJson()), [
      ...ignoreStrategies,
    ]);

    const strategyNames = ignoreStrategies.map((strategy) => strategy.constructor.name);
    logger.info(
      `FileSystemWatcher initialized for '${fileExplorer.workspaceRootPath}' with ignore strategies: ${strategyNames.join(
        ", ",
      )}`,
    );
  }

  start(): void {
    if (this.watcher) {
      return;
    }

    this.readyPromise = new Promise((resolve) => {
      this.readyResolve = resolve;
    });

    this.watcher = chokidar.watch(this.fileExplorer.workspaceRootPath, {
      ignoreInitial: true,
      persistent: true,
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    });

    this.watcher.on("ready", () => {
      this.readyResolve?.();
      this.readyResolve = null;
    });

    this.watcher.on("add", (filePath) => this.handleAdd(filePath, false));
    this.watcher.on("addDir", (dirPath) => this.handleAdd(dirPath, true));
    this.watcher.on("unlink", (filePath) => this.handleUnlink(filePath, false));
    this.watcher.on("unlinkDir", (dirPath) => this.handleUnlink(dirPath, true));
    this.watcher.on("change", (filePath) => this.handleModify(filePath));
    this.watcher.on("error", (error) => logger.error(`Watcher error: ${String(error)}`));

    logger.info(`Started filesystem watcher for workspace ${this.fileExplorer.workspaceRootPath}`);
  }

  stop(): void {
    if (this.watcher) {
      void this.watcher.close();
      this.watcher = null;
      logger.info(`Stopped filesystem watcher for workspace ${this.fileExplorer.workspaceRootPath}`);
    }

    this.readyResolve = null;
    this.readyPromise = null;

    for (const queue of this.subscribers) {
      queue.push(null);
    }
    this.subscribers.clear();

    for (const pending of this.pendingUnlinks) {
      clearTimeout(pending.timer);
    }
    this.pendingUnlinks = [];
  }

  async waitUntilReady(): Promise<void> {
    if (this.readyPromise) {
      await this.readyPromise;
    }
  }

  subscribe(): AsyncQueue<string | null> {
    const queue = new AsyncQueue<string | null>();
    this.subscribers.add(queue);
    return queue;
  }

  unsubscribe(queue: AsyncQueue<string | null>): void {
    this.subscribers.delete(queue);
    queue.push(null);
  }

  private async *queueEvents(queue: AsyncQueue<string | null>): AsyncGenerator<string, void, void> {
    while (true) {
      const event = await queue.pop();
      if (event === null) {
        return;
      }
      yield event;
    }
  }

  async *events(): AsyncGenerator<string, void, void> {
    const queue = this.subscribe();
    try {
      const batcher = new EventBatcher(this.queueEvents(queue), 0.25);
      for await (const batchedEvent of batcher.getBatchedEvents()) {
        yield batchedEvent;
      }
    } finally {
      queue.push(null);
      this.unsubscribe(queue);
    }
  }

  private handleChangeEvent(serializedEvent: string): void {
    if (this.subscribers.size === 0) {
      return;
    }

    for (const queue of this.subscribers) {
      queue.push(serializedEvent);
    }
  }

  private handleAdd(targetPath: string, isDirectory: boolean): void {
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
    if (this.handler.shouldIgnore(targetPath, false)) {
      return;
    }

    this.handler.handleModify(targetPath);
  }
}
