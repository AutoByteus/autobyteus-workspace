import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentPackageFolderWatcher,
  PACKAGE_CATCH_UP_DELAY_MS,
  type PackageFolderWatch,
} from "../../../src/agent-package-definitions/monitor/agent-package-folder-watcher.js";
import type { RegisteredPackageRoot } from "../../../src/agent-package-definitions/domain/agent-package-definition-types.js";

let base: string;
let monitor: AgentPackageFolderWatcher | null = null;

const rootAt = (rootPath: string): RegisteredPackageRoot => ({
  rootPath,
  sourceClass: "registered_package",
  kindDirs: {
    agents: path.join(rootPath, "agents"),
    "agent-teams": path.join(rootPath, "agent-teams"),
    "agent-orgs": path.join(rootPath, "agent-orgs"),
  },
});

const recordingSink = () => {
  const folders: string[] = [];
  const roots: string[] = [];
  const reconciles: string[] = [];
  return {
    folders,
    roots,
    reconciles,
    sink: {
      markFolderChanged: (subject: string, folderId: string) => { folders.push(`${subject}:${folderId}`); },
      markPackageFolderChanged: (rootPath: string) => { roots.push(rootPath); },
      reconcilePackageFolder: (rootPath: string) => { reconciles.push(rootPath); },
    },
  };
};

const waitFor = async (predicate: () => boolean, timeoutMs = 5000): Promise<void> => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for the monitor.");
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
};
const settleQuietly = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(async () => {
  base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "apar-monitor-")));
});

afterEach(async () => {
  vi.useRealTimers();
  await monitor?.close();
  monitor = null;
  await fs.rm(base, { recursive: true, force: true });
});

describe("AgentPackageFolderWatcher", () => {
  it("reports definition changes per folder and ignores skills and other files", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents", "a", "skills", "s"), { recursive: true });
    await fs.mkdir(path.join(rootPath, "agent-teams", "t", "agents"), { recursive: true });
    const recorded = recordingSink();
    monitor = new AgentPackageFolderWatcher({ sink: recorded.sink });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    await monitor.whenReady();
    expect(monitor.getPackageFolderWatchStatus(rootPath)).toEqual({ state: "WATCHING", message: null });

    await fs.writeFile(path.join(rootPath, "agents", "a", "skills", "s", "SKILL.md"), "x");
    await fs.writeFile(path.join(rootPath, "agents", "a", "notes.md"), "x");
    await fs.mkdir(path.join(rootPath, "docs"));
    await fs.writeFile(path.join(rootPath, "docs", "readme.md"), "x");
    await settleQuietly();
    expect(recorded.folders).toEqual([]);

    await fs.writeFile(path.join(rootPath, "agents", "a", "agent.md"), "x");
    await fs.mkdir(path.join(rootPath, "agent-teams", "t", "agents", "lead"));
    await fs.writeFile(path.join(rootPath, "agent-teams", "t", "agents", "lead", "agent-config.json"), "{}");
    await waitFor(() => recorded.folders.includes("agent:a") && recorded.folders.includes("agent_team:t"));
    expect(recorded.folders.every((folder) => folder === "agent:a" || folder === "agent_team:t")).toBe(true);
  });

  it("moves a root to FOLDER_MISSING when it is renamed away and resumes watching when it returns", async () => {
    const rootPath = path.join(base, "pkg");
    const movedPath = path.join(base, "pkg-moved");
    await fs.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
    const recorded = recordingSink();
    monitor = new AgentPackageFolderWatcher({ sink: recorded.sink });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    await monitor.whenReady();
    await settleQuietly(300);

    await fs.rename(rootPath, movedPath);
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "FOLDER_MISSING");
    expect(recorded.roots).toContain(rootPath);

    recorded.roots.length = 0;
    await fs.rename(movedPath, rootPath);
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "WATCHING");
    expect(recorded.roots).toContain(rootPath);
    await monitor.whenReady();
    await settleQuietly(300);

    await fs.writeFile(path.join(rootPath, "agents", "a", "agent.md"), "x");
    await waitFor(() => recorded.folders.includes("agent:a"));
  });

  it("re-arms a root whose folder was replaced in place (GitHub update rename swap)", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const recorded = recordingSink();
    monitor = new AgentPackageFolderWatcher({ sink: recorded.sink });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    await monitor.whenReady();

    const staged = path.join(base, "staged");
    await fs.mkdir(path.join(staged, "agents", "b"), { recursive: true });
    await fs.rename(rootPath, path.join(base, "backup"));
    await fs.rename(staged, rootPath);
    // The update's own full reconcile re-syncs roots; the identity check re-arms the replaced root.
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "WATCHING");
    await monitor.whenReady();
    // macOS directory watches start slightly after chokidar's ready; the re-arm itself also asks
    // the sync for a full reconcile of the root, which covers writes made in that short window.
    expect(recorded.roots).toContain(rootPath);
    await settleQuietly(300);
    recorded.folders.length = 0;

    await fs.writeFile(path.join(rootPath, "agents", "b", "agent.md"), "x");
    await waitFor(() => recorded.folders.includes("agent:b"));
  });

  it("starts a registered root that is missing as FOLDER_MISSING and arms it when it appears", async () => {
    const rootPath = path.join(base, "later", "pkg");
    const recorded = recordingSink();
    monitor = new AgentPackageFolderWatcher({ sink: recorded.sink });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    expect(monitor.getPackageFolderWatchStatus(rootPath)?.state).toBe("FOLDER_MISSING");

    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "WATCHING");
    expect(recorded.roots).toContain(rootPath);
    // waitFor alone may take 5 s, the default test timeout: under load the watcher arms late.
  }, 15_000);

  it("reports UNAVAILABLE when watching cannot be set up, and re-arms on the next sync", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(rootPath, { recursive: true });
    let fail = true;
    const recorded = recordingSink();
    monitor = new AgentPackageFolderWatcher({
      sink: recorded.sink,
      createWatcher: (paths, options) => {
        if (fail) throw Object.assign(new Error("System limit for number of file watchers reached"), { code: "ENOSPC" });
        return realWatcher(paths, options);
      },
    });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    expect(monitor.getPackageFolderWatchStatus(rootPath)).toEqual({
      state: "UNAVAILABLE",
      message: expect.stringContaining("ENOSPC"),
    });

    fail = false;
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    expect(monitor.getPackageFolderWatchStatus(rootPath)?.state).toBe("WATCHING");
  });

  it("reports UNAVAILABLE for a root whose definition folder cannot be listed, and re-arms once it can", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    await fs.chmod(path.join(rootPath, "agents"), 0o000);
    const recorded = recordingSink();
    monitor = new AgentPackageFolderWatcher({ sink: recorded.sink });
    try {
      await monitor.syncPackageFolders([rootAt(rootPath)]);
      expect(monitor.getPackageFolderWatchStatus(rootPath)).toEqual({ state: "UNAVAILABLE", message: expect.stringContaining("EACCES") });
    } finally {
      await fs.chmod(path.join(rootPath, "agents"), 0o755);
    }
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    expect(monitor.getPackageFolderWatchStatus(rootPath)?.state).toBe("WATCHING");
  });

  it("reports UNAVAILABLE when a running watcher fails", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(rootPath, { recursive: true });
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const fake: PackageFolderWatch = {
      on: ((event: string, listener: (...args: unknown[]) => void) => {
        (listeners[event] ??= []).push(listener);
        return fake;
      }) as PackageFolderWatch["on"],
      getWatched: () => ({}),
      close: async () => undefined,
    };
    const recorded = recordingSink();
    monitor = new AgentPackageFolderWatcher({ sink: recorded.sink, createWatcher: () => fake });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    listeners.error?.forEach((listener) => listener(Object.assign(new Error("too many open files"), { code: "EMFILE" })));
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "UNAVAILABLE");
    expect(recorded.roots).toContain(rootPath);
  });

  it("stops watching a removed root and releases it", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
    const recorded = recordingSink();
    monitor = new AgentPackageFolderWatcher({ sink: recorded.sink });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    await monitor.whenReady();
    await monitor.syncPackageFolders([]);
    expect(monitor.getPackageFolderWatchStatus(rootPath)).toBeNull();

    await fs.writeFile(path.join(rootPath, "agents", "a", "agent.md"), "x");
    await settleQuietly();
    expect(recorded.folders).toEqual([]);
  });
});

describe("AgentPackageFolderWatcher catch-up request", () => {
  /** A watch the test drives by hand: the OS gives no event for what it dropped, so none is emitted. */
  class FakeWatch implements PackageFolderWatch {
    private readonly listeners = new Map<string, Array<(...args: any[]) => void>>();
    on(event: string, listener: (...args: any[]) => void): this {
      this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
      return this;
    }
    /** What the watch holds; tests fill it to say which folders chokidar knows. */
    watched: Record<string, string[]> = {};
    getWatched(): Record<string, string[]> { return this.watched; }
    close = vi.fn(async () => undefined);
    emit(event: string, ...args: unknown[]): void {
      for (const listener of this.listeners.get(event) ?? []) listener(...args);
    }
  }

  const armWith = async (rootPath: string, options: { catchUpDelayMs?: number } = {}) => {
    const recorded = recordingSink();
    const watches: FakeWatch[] = [];
    monitor = new AgentPackageFolderWatcher({
      sink: recorded.sink,
      createWatcher: () => { const watch = new FakeWatch(); watches.push(watch); return watch; },
      logger: { warn: () => undefined },
      ...options,
    });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    return { recorded, watches };
  };
  /** Lets pending file-system work finish while the timers stay fake. */
  const untilIdle = async (done: () => boolean) => {
    for (let turn = 0; turn < 200 && !done(); turn += 1) await new Promise((resolve) => setImmediate(resolve));
    expect(done()).toBe(true);
  };

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  /** Moves the fake clock, then lets the catch-up's file-system work finish (the real event loop still runs). */
  const advance = async (ms: number) => {
    await vi.advanceTimersByTimeAsync(ms);
    for (let turn = 0; turn < 50; turn += 1) await new Promise((resolve) => setImmediate(resolve));
  };

  /** Runs the catch-up of the newest watch and lets its file-system work finish while timers stay fake. */
  const catchUp = async (watch: FakeWatch) => {
    watch.emit("ready");
    await advance(PACKAGE_CATCH_UP_DELAY_MS);
  };
  const agentFolderOnDisk = async (rootPath: string, name: string) => {
    await fs.mkdir(path.join(rootPath, "agents", name), { recursive: true });
    await fs.writeFile(path.join(rootPath, "agents", name, "agent.md"), "x");
  };
  const watching = (rootPath: string, ...folders: string[]) => Object.fromEntries([
    path.join(rootPath, "agents"), ...folders.map((folder) => path.join(rootPath, folder)),
  ].map((directory) => [directory, []]));

  it("asks once, after the delay, when a watch is armed (default 300 ms)", async () => {
    expect(PACKAGE_CATCH_UP_DELAY_MS).toBe(300);
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath);

    watches[0]!.emit("ready");
    await advance(PACKAGE_CATCH_UP_DELAY_MS - 1);
    expect(recorded.reconciles).toEqual([]);
    await advance(1);
    expect(recorded.reconciles).toEqual([rootPath]);
    await advance(5_000);
    expect(recorded.reconciles).toEqual([rootPath]);
  });

  it("asks once per quiet period after added or removed folders, however many there are", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath, { catchUpDelayMs: 100 });
    const watch = watches[0]!;
    watch.emit("ready");
    await advance(100);
    expect(recorded.reconciles).toHaveLength(1);

    for (let index = 0; index < 25; index += 1) {
      watch.emit("all", "addDir", path.join(rootPath, "agents", `a${index}`));
      await advance(40);
    }
    watch.emit("all", "unlinkDir", path.join(rootPath, "agents", "a0"));
    await advance(99);
    expect(recorded.reconciles).toHaveLength(1);
    await advance(1);
    expect(recorded.reconciles).toHaveLength(2);
    await advance(1_000);
    expect(recorded.reconciles).toHaveLength(2);
    expect(recorded.folders).toContain("agent:a1");
  });

  it("keeps file events on their own folder report and asks for nothing", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath);

    watches[0]!.emit("all", "change", path.join(rootPath, "agents", "a", "agent.md"));
    watches[0]!.emit("all", "add", path.join(rootPath, "agents", "a", "agent-config.json"));
    await advance(5_000);
    expect(recorded.folders).toEqual(["agent:a", "agent:a"]);
    expect(recorded.reconciles).toEqual([]);
  });

  it("asks for nothing after close()", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath);
    watches[0]!.emit("ready");
    await monitor!.close();
    await advance(5_000);
    expect(recorded.reconciles).toEqual([]);
  });

  it("asks for nothing once the package folder is missing", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath);
    watches[0]!.emit("ready");
    await fs.rm(rootPath, { recursive: true });
    watches[0]!.emit("all", "unlinkDir", rootPath);
    await untilIdle(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "FOLDER_MISSING");
    await advance(5_000);
    expect(recorded.reconciles).toEqual([]);
  });

  it("asks for nothing once the watch is UNAVAILABLE", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath);
    watches[0]!.emit("ready");
    watches[0]!.emit("error", Object.assign(new Error("too many open files"), { code: "EMFILE" }));
    await untilIdle(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "UNAVAILABLE");
    await advance(5_000);
    expect(recorded.reconciles).toEqual([]);
  });

  it("re-arms quietly once when a definition folder on disk is not in the watch, then reconciles after the new ready", async () => {
    const rootPath = path.join(base, "pkg");
    await agentFolderOnDisk(rootPath, "scout");
    await fs.mkdir(path.join(rootPath, "agent-teams", "squad", "agents", "lead"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath);
    // chokidar knows the kind folder but never heard of scout, squad or squad's local agent.
    watches[0]!.watched = watching(rootPath);

    await catchUp(watches[0]!);
    expect(watches).toHaveLength(2);
    expect(watches[0]!.close).toHaveBeenCalled();
    expect(recorded.roots).toEqual([]);
    // The store is re-read at once; the repaired watch's catch-up re-reads again (quietly).
    expect(recorded.reconciles).toEqual([rootPath]);

    // The new watch covers everything that exists: its catch-up only reconciles.
    watches[1]!.watched = watching(rootPath, "agents/scout", "agent-teams", "agent-teams/squad",
      "agent-teams/squad/agents", "agent-teams/squad/agents/lead");
    watches[1]!.watched[path.join(rootPath, "agent-teams")] = [];
    await catchUp(watches[1]!);
    expect(watches).toHaveLength(2);
    expect(recorded.reconciles).toEqual([rootPath, rootPath]);
    expect(recorded.roots).toEqual([]);
  });

  it("repairs a folder that stays unwatched only once, warns, and reconciles on every catch-up", async () => {
    const rootPath = path.join(base, "pkg");
    await agentFolderOnDisk(rootPath, "stubborn");
    const warn = vi.fn();
    const recorded = recordingSink();
    const watches: FakeWatch[] = [];
    monitor = new AgentPackageFolderWatcher({
      sink: recorded.sink,
      createWatcher: () => { const watch = new FakeWatch(); watches.push(watch); return watch; },
      logger: { warn },
    });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    watches[0]!.watched = watching(rootPath);

    await catchUp(watches[0]!);
    expect(watches).toHaveLength(2);
    watches[1]!.watched = watching(rootPath);
    await catchUp(watches[1]!);
    await catchUp(watches[1]!);
    expect(watches).toHaveLength(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("AGENT_PACKAGE_FOLDER_UNWATCHED"), [path.join(rootPath, "agents", "stubborn")]);
    expect(recorded.reconciles).toEqual([rootPath, rootPath, rootPath]);
  });

  it("allows another repair after a folder is added or removed", async () => {
    const rootPath = path.join(base, "pkg");
    await agentFolderOnDisk(rootPath, "stubborn");
    const { watches } = await armWith(rootPath);
    watches[0]!.watched = watching(rootPath);
    await catchUp(watches[0]!);
    expect(watches).toHaveLength(2);
    watches[1]!.watched = watching(rootPath);

    watches[1]!.emit("all", "addDir", path.join(rootPath, "agents", "other"));
    await advance(PACKAGE_CATCH_UP_DELAY_MS);
    expect(watches).toHaveLength(3);
  });

  it("does not re-arm when every definition folder on disk is watched, and ignores unwatched layouts", async () => {
    const rootPath = path.join(base, "pkg");
    await agentFolderOnDisk(rootPath, "scout");
    // Not part of the layout: skills, hidden and _-prefixed folders, files.
    await fs.mkdir(path.join(rootPath, "agents", "scout", "skills", "s"), { recursive: true });
    await fs.mkdir(path.join(rootPath, "agents", "_template"), { recursive: true });
    await fs.mkdir(path.join(rootPath, "agents", ".git"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath);
    watches[0]!.watched = watching(rootPath, "agents/scout");

    await catchUp(watches[0]!);
    expect(watches).toHaveLength(1);
    expect(recorded.reconciles).toEqual([rootPath]);
  });

  it("checks that the package folder is still there first: a folder renamed away is reported missing, with no coverage repair", async () => {
    const rootPath = path.join(base, "pkg");
    await agentFolderOnDisk(rootPath, "scout");
    const { recorded, watches } = await armWith(rootPath);
    watches[0]!.watched = watching(rootPath);
    // The presence watch's own event was lost: only the catch-up can notice the rename.
    await fs.rename(rootPath, path.join(base, "moved"));

    await catchUp(watches[0]!);
    expect(monitor!.getPackageFolderWatchStatus(rootPath)?.state).toBe("FOLDER_MISSING");
    expect(recorded.roots).toEqual([rootPath]);
    expect(recorded.reconciles).toEqual([]);
    expect(watches).toHaveLength(1);
  });

  it("drops the request of a watch that was re-armed and asks again for the new watch", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const { recorded, watches } = await armWith(rootPath);
    watches[0]!.emit("ready");

    const staged = path.join(base, "staged");
    await fs.mkdir(path.join(staged, "agents", "b"), { recursive: true });
    await fs.rename(rootPath, path.join(base, "backup"));
    await fs.rename(staged, rootPath);
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    expect(watches).toHaveLength(2);
    expect(watches[0]!.close).toHaveBeenCalled();

    await advance(5_000);
    expect(recorded.reconciles).toEqual([]);
    watches[1]!.watched = watching(rootPath, "agents/b");
    watches[0]!.emit("ready");
    watches[1]!.emit("ready");
    await advance(PACKAGE_CATCH_UP_DELAY_MS);
    expect(recorded.reconciles).toEqual([rootPath]);
  });
});

import chokidar from "chokidar";
const realWatcher = (paths: string[], options: { ignored: (filePath: string) => boolean }): PackageFolderWatch =>
  chokidar.watch(paths, { ignoreInitial: true, ignored: options.ignored }) as unknown as PackageFolderWatch;
