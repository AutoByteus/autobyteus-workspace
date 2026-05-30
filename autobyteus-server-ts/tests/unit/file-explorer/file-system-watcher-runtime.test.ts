import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { WorkspaceFileExplorer } from "../../../src/file-explorer/file-explorer.js";
import { TreeNode } from "../../../src/file-explorer/tree-node.js";
import { FileSystemWatcher } from "../../../src/file-explorer/watcher/file-system-watcher.js";
import type { WatcherRuntimeProcessRegistry } from "../../../src/file-explorer/watcher/runtime/watcher-runtime-process-registry.js";
import type {
  WatcherRuntimeClient,
  WatcherRuntimeClientOptions,
  WatcherRuntimeStartOptions,
} from "../../../src/file-explorer/watcher/runtime/watcher-runtime-client.js";

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

class FakeRuntimeClient {
  startOptions: WatcherRuntimeStartOptions | null = null;
  start = vi.fn(async (options: WatcherRuntimeStartOptions) => {
    this.startOptions = options;
  });
  requestStop = vi.fn(async (_reason?: string) => undefined);
}

type FakeRegistry = WatcherRuntimeProcessRegistry & {
  lastOptions: WatcherRuntimeClientOptions | null;
  client: FakeRuntimeClient;
};

const createFakeRegistry = (): FakeRegistry => {
  const client = new FakeRuntimeClient();
  return {
    client,
    lastOptions: null,
    createClient(options: WatcherRuntimeClientOptions): WatcherRuntimeClient {
      this.lastOptions = options;
      return client as unknown as WatcherRuntimeClient;
    },
  } as FakeRegistry;
};

const createExplorerContext = (workspaceRootPath: string): WorkspaceFileExplorer => {
  const rootNode = new TreeNode(path.basename(workspaceRootPath), false, null, false);
  return {
    workspaceRootPath,
    rootPath: workspaceRootPath,
    rootNode,
    findNodeByPath: (relativePath: string) => {
      if (!relativePath || relativePath === ".") {
        return rootNode;
      }
      return rootNode.findNodeByPath(relativePath);
    },
    getTree: () => rootNode,
  } as unknown as WorkspaceFileExplorer;
};

describe("FileSystemWatcher runtime boundary", () => {
  let workspaceRootPath: string;

  beforeEach(async () => {
    workspaceRootPath = await fs.mkdtemp(path.join(os.tmpdir(), "watcher-runtime-unit-"));
  });

  afterEach(async () => {
    await fs.rm(workspaceRootPath, { recursive: true, force: true });
  });

  it("logical stop returns after requesting child stop without waiting for child stopped", async () => {
    const registry = createFakeRegistry();
    const watcher = new FileSystemWatcher(createExplorerContext(workspaceRootPath), [], registry);

    watcher.start();
    await watcher.waitUntilReady();
    await watcher.stop("unit-test-stop");

    expect(registry.client.start).toHaveBeenCalledTimes(1);
    expect(registry.client.requestStop).toHaveBeenCalledWith("unit-test-stop");
  });

  it("ignores raw events whose watcher generation is stale", async () => {
    const registry = createFakeRegistry();
    const watcher = new FileSystemWatcher(createExplorerContext(workspaceRootPath), [], registry);

    watcher.start();
    await watcher.waitUntilReady();
    const stream = watcher.events();
    const next = stream.next().then((result) => (result.done ? "done" : "event"));

    registry.lastOptions?.onRawEvent(
      { watcherId: "stale-watcher", generation: -1 },
      {
        eventType: "add",
        path: path.join(workspaceRootPath, "stale.txt"),
        isDirectory: false,
      },
    );

    expect(await Promise.race([next, sleep(50).then(() => "timeout")])).toBe("timeout");

    await stream.return?.();
    await watcher.stop("unit-test-stop");
  });
});
