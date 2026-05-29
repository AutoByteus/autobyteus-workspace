import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceFileExplorer } from "../../../src/file-explorer/file-explorer.js";

const watcherState = vi.hoisted(() => ({
  instances: [] as Array<{
    start: ReturnType<typeof vi.fn>;
    waitUntilReady: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    events: ReturnType<typeof vi.fn>;
    suppressPaths: ReturnType<typeof vi.fn>;
  }>,
}));

vi.mock("../../../src/file-explorer/watcher/file-system-watcher.js", () => ({
  FileSystemWatcher: class {
    start = vi.fn();
    waitUntilReady = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    events = vi.fn();
    suppressPaths = vi.fn();

    constructor() {
      watcherState.instances.push(this);
    }
  },
}));

describe("WorkspaceFileExplorer", () => {
  beforeEach(() => {
    watcherState.instances = [];
  });

  it("starts watcher when first watcher lease is acquired", async () => {
    const explorer = new WorkspaceFileExplorer("/fake/path");

    const lease = await explorer.acquireWatcherLease("test");

    expect(watcherState.instances).toHaveLength(1);
    expect(watcherState.instances[0]?.start).toHaveBeenCalledTimes(1);
    expect(watcherState.instances[0]?.waitUntilReady).toHaveBeenCalledTimes(1);

    await lease.release();
    expect(watcherState.instances[0]?.stop).toHaveBeenCalledTimes(1);
  });

  it("shares one watcher across multiple leases and stops after the final release", async () => {
    const explorer = new WorkspaceFileExplorer("/fake/path");

    const first = await explorer.acquireWatcherLease("first");
    const second = await explorer.acquireWatcherLease("second");

    expect(watcherState.instances).toHaveLength(1);
    expect(watcherState.instances[0]?.start).toHaveBeenCalledTimes(1);

    await first.release();
    expect(watcherState.instances[0]?.stop).not.toHaveBeenCalled();

    await second.release();
    expect(watcherState.instances[0]?.stop).toHaveBeenCalledTimes(1);
  });

  it("makes watcher lease release idempotent", async () => {
    const explorer = new WorkspaceFileExplorer("/fake/path");

    const lease = await explorer.acquireWatcherLease("test");
    await lease.release();
    await lease.release();

    expect(watcherState.instances[0]?.stop).toHaveBeenCalledTimes(1);
  });

  it("returns events from the active watcher", async () => {
    const mockEvents = (async function* () {})();
    const explorer = new WorkspaceFileExplorer("/fake/path");
    const lease = await explorer.acquireWatcherLease("test");
    watcherState.instances[0]?.events.mockReturnValue(mockEvents);

    const result = explorer.subscribe();

    expect(watcherState.instances[0]?.events).toHaveBeenCalledTimes(1);
    expect(result).toBe(mockEvents);
    await lease.release();
  });

  it("throws if subscribe is called before watcher is ready", () => {
    const explorer = new WorkspaceFileExplorer("/fake/path");

    expect(() => explorer.subscribe()).toThrowError(
      "Watcher is not running. Acquire a watcher lease before subscribing.",
    );
  });

  it("closes active watcher once and clears future subscriptions", async () => {
    const explorer = new WorkspaceFileExplorer("/fake/path");
    await explorer.acquireWatcherLease("test");

    await explorer.close();

    expect(watcherState.instances[0]?.stop).toHaveBeenCalledTimes(1);
    expect(() => explorer.subscribe()).toThrowError(
      "Watcher is not running. Acquire a watcher lease before subscribing.",
    );
  });

  it("loads folder children as a bounded projection without full tree rebuild", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-folder-projection-"));
    try {
      fs.mkdirSync(path.join(tempRoot, "src", "deeper"), { recursive: true });
      fs.writeFileSync(path.join(tempRoot, "src", "main.ts"), "console.log('ok');");
      fs.writeFileSync(path.join(tempRoot, "src", "deeper", "nested.ts"), "nested");
      fs.writeFileSync(path.join(tempRoot, "root.txt"), "root");
      const explorer = new WorkspaceFileExplorer(tempRoot);
      const rebuildSpy = vi.spyOn(explorer, "buildWorkspaceDirectoryTree");

      const folderNode = await explorer.loadFolderChildren("src");

      expect(rebuildSpy).not.toHaveBeenCalled();
      expect(folderNode.getPath()).toBe("src");
      expect(folderNode.children.map((child) => child.name)).toEqual(["deeper", "main.ts"]);
      const deeper = folderNode.children.find((child) => child.name === "deeper");
      expect(deeper?.childrenLoaded).toBe(false);
      expect(deeper?.children).toHaveLength(0);
      expect(explorer.getTree()?.findNodeByPath("src")).toBe(folderNode);
      expect(explorer.getTree()?.findNodeByPath("root.txt")).toBeNull();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
