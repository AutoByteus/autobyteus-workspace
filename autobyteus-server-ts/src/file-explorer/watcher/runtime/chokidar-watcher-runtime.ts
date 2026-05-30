import chokidar, { type FSWatcher } from "chokidar";
import { performance } from "node:perf_hooks";
import { WorkspaceIgnoreMatcher } from "../../traversal-ignore-strategy/workspace-ignore-matcher.js";
import { createWorkspaceIgnoreStrategies } from "../../traversal-ignore-strategy/workspace-ignore-strategies.js";
import type {
  RawWatchEvent,
  WatcherRuntimeMessage,
  WatcherRuntimeStartCommand,
  WatcherRuntimeStats,
} from "./watcher-runtime-protocol.js";

export type WatcherRuntimeEmitter = (message: WatcherRuntimeMessage) => void;

const roundMs = (value: number): number => Number(value.toFixed(1));

export class ChokidarWatcherRuntime {
  private watcher: FSWatcher | null = null;
  private watcherId: string | null = null;
  private generation: number | null = null;
  private emitter: WatcherRuntimeEmitter;
  private closingPromise: Promise<void> | null = null;

  constructor(emitter: WatcherRuntimeEmitter) {
    this.emitter = emitter;
  }

  async start(command: WatcherRuntimeStartCommand): Promise<void> {
    if (this.watcher) {
      throw new Error("Watcher runtime is already started");
    }

    this.watcherId = command.watcherId;
    this.generation = command.generation;
    const startAt = performance.now();
    const ignoreMatcher = new WorkspaceIgnoreMatcher(
      command.workspaceRootPath,
      createWorkspaceIgnoreStrategies(command.workspaceRootPath),
    );

    const watcher = chokidar.watch(command.workspaceRootPath, {
      ignoreInitial: true,
      persistent: true,
      ignored: (targetPath, stats) => ignoreMatcher.shouldIgnoreForWatch(targetPath, stats),
      awaitWriteFinish: {
        stabilityThreshold: 200,
        pollInterval: 50,
      },
    });

    this.watcher = watcher;

    watcher.on("ready", () => {
      this.emit({
        type: "ready",
        watcherId: command.watcherId,
        generation: command.generation,
        stats: this.getWatchedSummary(watcher),
        startDurationMs: roundMs(performance.now() - startAt),
      });
    });

    watcher.on("add", (filePath) => this.emitRaw("add", filePath, false));
    watcher.on("addDir", (dirPath) => this.emitRaw("addDir", dirPath, true));
    watcher.on("unlink", (filePath) => this.emitRaw("unlink", filePath, false));
    watcher.on("unlinkDir", (dirPath) => this.emitRaw("unlinkDir", dirPath, true));
    watcher.on("change", (filePath) => this.emitRaw("change", filePath, false));
    watcher.on("error", (error) => this.emitError(error));
  }

  async stop(reason = "stop-requested"): Promise<void> {
    if (this.closingPromise) {
      return this.closingPromise;
    }

    const watcher = this.watcher;
    this.watcher = null;
    if (!watcher || !this.watcherId || this.generation === null) {
      return;
    }

    const watcherId = this.watcherId;
    const generation = this.generation;
    const stats = this.getWatchedSummary(watcher);
    this.closingPromise = (async () => {
      const closeAt = performance.now();
      await watcher.close();
      this.emit({
        type: "stopped",
        watcherId,
        generation,
        reason,
        stats,
        closeDurationMs: roundMs(performance.now() - closeAt),
      });
    })().finally(() => {
      this.closingPromise = null;
      this.watcherId = null;
      this.generation = null;
    });

    return this.closingPromise;
  }

  private emitRaw(eventType: RawWatchEvent["eventType"], targetPath: string, isDirectory: boolean): void {
    if (!this.watcherId || this.generation === null) {
      return;
    }
    this.emit({
      type: "rawEvent",
      watcherId: this.watcherId,
      generation: this.generation,
      event: {
        eventType,
        path: targetPath,
        isDirectory,
      },
    });
  }

  private emitError(error: unknown): void {
    if (!this.watcherId || this.generation === null) {
      return;
    }
    this.emit({
      type: "error",
      watcherId: this.watcherId,
      generation: this.generation,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }

  private emit(message: WatcherRuntimeMessage): void {
    this.emitter(message);
  }

  private getWatchedSummary(watcher: FSWatcher): WatcherRuntimeStats {
    try {
      const watched = watcher.getWatched();
      const directories = Object.keys(watched);
      const watchedEntryCount = directories.reduce(
        (count, directory) => count + (watched[directory]?.length ?? 0),
        0,
      );
      return {
        watchedDirectoryCount: directories.length,
        watchedEntryCount,
      };
    } catch {
      return {};
    }
  }
}
