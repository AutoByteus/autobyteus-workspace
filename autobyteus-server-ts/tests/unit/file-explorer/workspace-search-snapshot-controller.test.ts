import { describe, expect, it, vi } from "vitest";
import { TreeNode } from "../../../src/file-explorer/tree-node.js";
import {
  WorkspaceSearchSnapshotController,
  type SearchSnapshotContext,
} from "../../../src/file-explorer/search-snapshot/workspace-search-snapshot-controller.js";

const createAbortError = (): Error => {
  const error = new Error("test abort");
  error.name = "AbortError";
  return error;
};

const waitForPromptResult = async <T>(promise: Promise<T>, label: string): Promise<T> => {
  let timeout: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} did not settle promptly`)), 100);
      }),
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

const waitForMicrotasks = async (): Promise<void> => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
};

type Deferred<T> = {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
};

const createDeferred = <T>(): Deferred<T> => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });
  return { promise, resolve, reject };
};

const createRootNode = (): TreeNode => new TreeNode("workspace", false, null, false);

const createContext = (
  buildWorkspaceDirectoryTree: SearchSnapshotContext["buildWorkspaceDirectoryTree"],
  getTree = vi.fn((): TreeNode | null => null),
): SearchSnapshotContext => ({
  workspaceRootPath: "/tmp/workspace",
  rootPath: "/tmp/workspace",
  buildWorkspaceDirectoryTree,
  getTree,
});

const expectAbortError = (value: unknown): void => {
  expect(value).toBeInstanceOf(Error);
  expect((value as Error).name).toBe("AbortError");
};

describe("WorkspaceSearchSnapshotController", () => {
  it("rejects promptly and aborts refresh when the caller aborts initial refresh", async () => {
    let observedSignal: AbortSignal | null = null;
    const context = createContext(
      vi.fn((_maxDepth: number | null = null, options: { signal?: AbortSignal } = {}) => {
        observedSignal = options.signal ?? null;
        return new Promise<TreeNode>(() => undefined);
      }),
    );
    const controller = new WorkspaceSearchSnapshotController(context);
    const callerAbort = new AbortController();
    const search = controller.search("anything", callerAbort.signal).catch((error: unknown) => error);

    await Promise.resolve();
    callerAbort.abort();
    const error = await waitForPromptResult(search, "caller-aborted initial search");

    expectAbortError(error);
    expect(observedSignal?.aborted).toBe(true);
  });

  it("rejects promptly when a caller aborts while waiting on an existing refresh task", async () => {
    let observedSignal: AbortSignal | null = null;
    const refresh = createDeferred<TreeNode>();
    const context = createContext(
      vi.fn((_maxDepth: number | null = null, options: { signal?: AbortSignal } = {}) => {
        observedSignal = options.signal ?? null;
        return refresh.promise;
      }),
    );
    const controller = new WorkspaceSearchSnapshotController(context);
    const firstSearch = controller.search("first").catch((error: unknown) => error);

    await Promise.resolve();
    const waitingAbort = new AbortController();
    const waitingSearch = controller
      .search("second", waitingAbort.signal)
      .catch((error: unknown) => error);

    await Promise.resolve();
    waitingAbort.abort();
    const waitingError = await waitForPromptResult(waitingSearch, "waiting caller-aborted search");

    expectAbortError(waitingError);
    expect(observedSignal?.aborted).toBe(false);

    controller.close();
    const firstError = await waitForPromptResult(firstSearch, "remaining search after close");
    expectAbortError(firstError);
  });

  it("close aborts and unblocks an in-flight refresh without waiting for traversal completion", async () => {
    let observedSignal: AbortSignal | null = null;
    const context = createContext(
      vi.fn((_maxDepth: number | null = null, options: { signal?: AbortSignal } = {}) => {
        observedSignal = options.signal ?? null;
        return new Promise<TreeNode>(() => undefined);
      }),
    );
    const controller = new WorkspaceSearchSnapshotController(context);
    const search = controller.search("anything").catch((error: unknown) => error);

    await Promise.resolve();
    controller.close();
    const error = await waitForPromptResult(search, "close-aborted search");

    expect(observedSignal?.aborted).toBe(true);
    expectAbortError(error);
  });

  it("does not commit a stale refresh after caller abort", async () => {
    let observedSignal: AbortSignal | null = null;
    const refresh = createDeferred<TreeNode>();
    const getTree = vi.fn((): TreeNode | null => createRootNode());
    const context = createContext(
      vi.fn((_maxDepth: number | null = null, options: { signal?: AbortSignal } = {}) => {
        observedSignal = options.signal ?? null;
        return refresh.promise;
      }),
      getTree,
    );
    const controller = new WorkspaceSearchSnapshotController(context);
    const callerAbort = new AbortController();
    const search = controller.search("anything", callerAbort.signal).catch((error: unknown) => error);

    await Promise.resolve();
    callerAbort.abort();
    const error = await waitForPromptResult(search, "caller-aborted stale search");
    refresh.resolve(createRootNode());
    await waitForMicrotasks();

    expectAbortError(error);
    expect(observedSignal?.aborted).toBe(true);
    expect(getTree).not.toHaveBeenCalled();
  });

  it("aborts an in-flight refresh when traversal observes close abort", async () => {
    let observedSignal: AbortSignal | null = null;
    let resolveAbortObserved!: () => void;
    const abortObserved = new Promise<void>((resolve) => {
      resolveAbortObserved = resolve;
    });
    const context = createContext(
      vi.fn((_maxDepth: number | null = null, options: { signal?: AbortSignal } = {}) => {
        observedSignal = options.signal ?? null;
        return new Promise<TreeNode>((_resolve, reject) => {
          options.signal?.addEventListener(
            "abort",
            () => {
              resolveAbortObserved();
              reject(createAbortError());
            },
            { once: true },
          );
        });
      }),
    );
    const controller = new WorkspaceSearchSnapshotController(context);
    const search = controller.search("anything").catch((error: unknown) => error);

    await Promise.resolve();
    controller.close();
    await abortObserved;
    const error = await search;

    expect(observedSignal?.aborted).toBe(true);
    expectAbortError(error);
  });
});
