import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangeType } from "../../../src/file-explorer/file-system-changes.js";
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

  it("rejects direct requests for ignored folders without updating the tree", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-folder-ignore-"));
    try {
      fs.mkdirSync(path.join(tempRoot, ".git", "objects"), { recursive: true });
      fs.mkdirSync(path.join(tempRoot, "node_modules", "pkg"), { recursive: true });
      fs.mkdirSync(path.join(tempRoot, "ignored-by-gitignore"), { recursive: true });
      fs.writeFileSync(path.join(tempRoot, ".gitignore"), "ignored-by-gitignore/\n");
      fs.writeFileSync(path.join(tempRoot, "visible.txt"), "visible");
      const explorer = new WorkspaceFileExplorer(tempRoot);
      const rebuildSpy = vi.spyOn(explorer, "buildWorkspaceDirectoryTree");

      for (const ignoredFolder of [".git", "node_modules", "ignored-by-gitignore"]) {
        await expect(explorer.loadFolderChildren(ignoredFolder)).rejects.toThrow(
          "Access denied: Folder is ignored",
        );
      }

      expect(rebuildSpy).not.toHaveBeenCalled();
      expect(explorer.getTree()).toBeNull();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects same-prefix sibling folder escapes without updating the tree", async () => {
    const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-path-boundary-"));
    try {
      const workspaceRoot = path.join(tempParent, "ws");
      const siblingRoot = path.join(tempParent, "ws-sibling");
      fs.mkdirSync(workspaceRoot, { recursive: true });
      fs.mkdirSync(siblingRoot, { recursive: true });
      fs.writeFileSync(path.join(siblingRoot, "leak.txt"), "leak");
      const explorer = new WorkspaceFileExplorer(workspaceRoot);
      const rebuildSpy = vi.spyOn(explorer, "buildWorkspaceDirectoryTree");

      await expect(explorer.loadFolderChildren("../ws-sibling")).rejects.toThrow(
        "Access denied: Path resolves outside the workspace.",
      );

      expect(rebuildSpy).not.toHaveBeenCalled();
      expect(explorer.getTree()).toBeNull();
    } finally {
      fs.rmSync(tempParent, { recursive: true, force: true });
    }
  });

  it("renames files with valid leaf names", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-rename-leaf-"));
    try {
      fs.mkdirSync(path.join(tempRoot, "sub"), { recursive: true });
      fs.writeFileSync(path.join(tempRoot, "sub", "rename-me.txt"), "content");
      const explorer = new WorkspaceFileExplorer(tempRoot);

      const event = await explorer.renameFileOrFolder("sub/rename-me.txt", "renamed.txt");

      expect(event.changes[0]?.type).toBe(ChangeType.RENAME);
      expect(fs.existsSync(path.join(tempRoot, "sub", "rename-me.txt"))).toBe(false);
      expect(fs.existsSync(path.join(tempRoot, "sub", "renamed.txt"))).toBe(true);
      expect(explorer.getTree()?.findNodeByPath("sub/renamed.txt")).not.toBeNull();
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("rejects path-like rename names before filesystem mutation", async () => {
    const tempParent = fs.mkdtempSync(path.join(os.tmpdir(), "autobyteus-rename-boundary-"));
    try {
      const workspaceRoot = path.join(tempParent, "ws");
      const siblingRoot = path.join(tempParent, "ws-sibling");
      fs.mkdirSync(path.join(workspaceRoot, "sub"), { recursive: true });
      fs.mkdirSync(siblingRoot, { recursive: true });
      fs.writeFileSync(path.join(workspaceRoot, "sub", "rename-me.txt"), "content");
      const explorer = new WorkspaceFileExplorer(workspaceRoot);

      await expect(
        explorer.renameFileOrFolder("sub/rename-me.txt", "../../ws-sibling/renamed-leak.txt"),
      ).rejects.toThrow("Invalid new name");

      expect(fs.existsSync(path.join(siblingRoot, "renamed-leak.txt"))).toBe(false);
      expect(fs.existsSync(path.join(workspaceRoot, "sub", "rename-me.txt"))).toBe(true);
      expect(explorer.getTree()?.findNodeByPath("sub/rename-me.txt")).not.toBeNull();
      expect(explorer.getTree()?.findNodeByPath("sub/renamed-leak.txt")).toBeNull();
    } finally {
      fs.rmSync(tempParent, { recursive: true, force: true });
    }
  });
});
