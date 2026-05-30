import { FileNameIndexer } from "../file-name-indexer.js";
import type { TreeNode } from "../tree-node.js";
import {
  BaseFileSearchStrategy,
  CompositeSearchStrategy,
  FuzzysortSearchStrategy,
  RipgrepSearchStrategy,
} from "../search-strategy/index.js";

export type SearchSnapshotContext = {
  readonly workspaceRootPath: string;
  readonly rootPath: string;
  buildWorkspaceDirectoryTree(
    maxDepth?: number | null,
    options?: { signal?: AbortSignal },
  ): Promise<TreeNode>;
  getTree(): TreeNode | null;
};

type RefreshState = {
  readonly generation: number;
  readonly abortController: AbortController;
  readonly activeWaiters: Set<symbol>;
  task: Promise<void>;
  settled: boolean;
};

type AbortRaceEntry = {
  readonly signal: AbortSignal;
  readonly message: string;
};

const createAbortError = (message: string): Error => {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
};

const throwIfAborted = (signal: AbortSignal | undefined, message: string): void => {
  if (signal?.aborted) {
    throw createAbortError(message);
  }
};

export class WorkspaceSearchSnapshotController {
  private context: SearchSnapshotContext;
  private searchStrategy: BaseFileSearchStrategy | null = null;
  private fileNameIndexer: FileNameIndexer | null = null;
  private refreshState: RefreshState | null = null;
  private refreshGeneration = 0;

  constructor(context: SearchSnapshotContext) {
    this.context = context;
  }

  async search(query: string, signal?: AbortSignal): Promise<string[]> {
    throwIfAborted(signal, "Search aborted");
    if (!this.searchStrategy) {
      this.searchStrategy = this.createSearchStrategy();
    }

    await this.refreshSearchSnapshotIndex(signal);
    throwIfAborted(signal, "Search aborted");
    const searchTask = this.searchStrategy.search(this.context.workspaceRootPath, query);
    return this.raceSearchWithAbort(searchTask, signal);
  }

  close(): void {
    this.refreshGeneration += 1;
    const state = this.refreshState;
    this.refreshState = null;
    if (state) {
      state.abortController.abort();
      void state.task.catch(() => undefined);
    }
  }

  private createSearchStrategy(): BaseFileSearchStrategy {
    if (!this.fileNameIndexer) {
      this.fileNameIndexer = new FileNameIndexer(this.context);
    }
    const fuzzysortStrategy = new FuzzysortSearchStrategy(this.fileNameIndexer, 10);
    const ripgrepStrategy = new RipgrepSearchStrategy(50);
    return new CompositeSearchStrategy([fuzzysortStrategy, ripgrepStrategy]);
  }

  private async refreshSearchSnapshotIndex(callerSignal?: AbortSignal): Promise<void> {
    throwIfAborted(callerSignal, "Search aborted");
    if (!this.fileNameIndexer) {
      this.fileNameIndexer = new FileNameIndexer(this.context);
    }

    const state = this.refreshState ?? this.startRefresh();
    await this.waitForRefresh(state, callerSignal);
  }

  private startRefresh(): RefreshState {
    const generation = this.refreshGeneration + 1;
    this.refreshGeneration = generation;
    const abortController = new AbortController();
    const signal = abortController.signal;
    const state: RefreshState = {
      generation,
      abortController,
      activeWaiters: new Set<symbol>(),
      task: Promise.resolve(),
      settled: false,
    };

    const task = (async () => {
      throwIfAborted(signal, "Search snapshot refresh aborted");
      await this.context.buildWorkspaceDirectoryTree(null, { signal });
      this.throwIfStale(generation, signal);
      await this.fileNameIndexer?.refreshSnapshotIndex(signal);
      this.throwIfStale(generation, signal);
    })();

    state.task = task;
    this.refreshState = state;
    void task.finally(() => {
      state.settled = true;
      if (this.refreshState === state) {
        this.refreshState = null;
      }
    }).catch(() => undefined);

    return state;
  }

  private async waitForRefresh(state: RefreshState, callerSignal?: AbortSignal): Promise<void> {
    const waiter = Symbol("search-refresh-waiter");
    state.activeWaiters.add(waiter);
    let completed = false;
    try {
      await this.raceRefreshWithAbort(state, callerSignal);
      completed = true;
    } finally {
      this.releaseRefreshWaiter(state, waiter, completed);
    }
  }

  private async raceRefreshWithAbort(
    state: RefreshState,
    callerSignal?: AbortSignal,
  ): Promise<void> {
    const abortEntries: AbortRaceEntry[] = [
      { signal: state.abortController.signal, message: "Search snapshot refresh aborted" },
    ];
    if (callerSignal) {
      abortEntries.push({ signal: callerSignal, message: "Search aborted" });
    }

    await this.raceTaskWithAbort(state.task, abortEntries);
  }

  private async raceSearchWithAbort<T>(task: Promise<T>, callerSignal?: AbortSignal): Promise<T> {
    if (!callerSignal) {
      return task;
    }
    return this.raceTaskWithAbort(task, [{ signal: callerSignal, message: "Search aborted" }]);
  }

  private async raceTaskWithAbort<T>(
    task: Promise<T>,
    abortEntries: AbortRaceEntry[],
  ): Promise<T> {
    for (const entry of abortEntries) {
      throwIfAborted(entry.signal, entry.message);
    }

    let cleanup = (): void => undefined;
    let abortSettled = false;
    const abortPromise = new Promise<never>((_resolve, reject) => {
      const removers = abortEntries.map((entry) => {
        const onAbort = (): void => {
          if (abortSettled) {
            return;
          }
          abortSettled = true;
          reject(createAbortError(entry.message));
        };
        entry.signal.addEventListener("abort", onAbort, { once: true });
        return () => entry.signal.removeEventListener("abort", onAbort);
      });
      cleanup = () => {
        for (const remove of removers) {
          remove();
        }
      };
    });

    try {
      return await Promise.race([task, abortPromise]);
    } finally {
      abortSettled = true;
      cleanup();
    }
  }

  private releaseRefreshWaiter(
    state: RefreshState,
    waiter: symbol,
    completed: boolean,
  ): void {
    state.activeWaiters.delete(waiter);
    if (completed || state.settled || state.activeWaiters.size > 0 || this.refreshState !== state) {
      return;
    }

    this.refreshGeneration += 1;
    this.refreshState = null;
    state.abortController.abort();
    void state.task.catch(() => undefined);
  }

  private throwIfStale(generation: number, signal?: AbortSignal): void {
    throwIfAborted(signal, "Search snapshot refresh aborted");
    if (this.refreshGeneration !== generation) {
      throw createAbortError("Search snapshot refresh became stale");
    }
  }
}
