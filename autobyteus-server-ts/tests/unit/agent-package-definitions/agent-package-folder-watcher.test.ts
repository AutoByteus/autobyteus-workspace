import { statSync, type Stats } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgentPackageFolderWatcher,
  PACKAGE_CATCH_UP_DELAY_MS,
  type PackageFolderChangeSink,
  type PackageFolderWatch,
  type PackageFolderWatchFactory,
  type ParentFolderWatchFactory,
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

/*
 * The OS side of the monitor is owned by the test (autobyteus-526 SR-002). Each test makes the real folder change on
 * disk, then reports the event the OS would through these fakes, injected through the monitor's `createWatcher` and
 * `createParentFolderWatch` options. No test here waits for OS event delivery, whose latency on a busy Mac is many
 * seconds; real delivery is covered by tests/integration/agent-package-definitions/package-auto-refresh.integration.test.ts.
 */

/** A package folder watch (chokidar's part): records what it watches and its close; the test emits its events. */
class FakeWatch implements PackageFolderWatch {
  private readonly listeners = new Map<string, Array<(...args: any[]) => void>>();
  closed = false;
  constructor(
    readonly paths: string[] = [],
    readonly ignored: (filePath: string, stats?: Stats) => boolean = () => false,
  ) {}
  on(event: string, listener: (...args: any[]) => void): this {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }
  /** What the watch holds; tests fill it to say which folders chokidar knows. */
  watched: Record<string, string[]> = {};
  getWatched(): Record<string, string[]> { return this.watched; }
  close = vi.fn(async () => { this.closed = true; });
  emit(event: string, ...args: unknown[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

/** A one-level watch of a directory's entries (fs.watch's part). */
class FakeParentWatch {
  closed = false;
  constructor(
    readonly directory: string,
    readonly onChange: (entryName: string | null) => void,
    readonly onError: (error: unknown) => void,
  ) {}
  close = vi.fn(() => { this.closed = true; });
}

const statsOf = (filePath: string): Stats | undefined => {
  try { return statSync(filePath); } catch { return undefined; }
};

/**
 * The fakes of both event sources and the test's way to report what the OS would. `readyOnCreate` makes each new
 * package folder watch report `ready` after its (empty) initial scan, as chokidar does.
 */
const fakeOs = (options: { readyOnCreate?: boolean } = {}) => {
  const watches: FakeWatch[] = [];
  const parents: FakeParentWatch[] = [];
  /** chokidar reports a path under a watched path unless its `ignored` excludes the path or a folder on the way to it. */
  const covers = (watch: FakeWatch, filePath: string): boolean => watch.paths.some((watchedPath) => {
    const relative = path.relative(watchedPath, filePath);
    if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
    for (let current = filePath; current !== watchedPath; current = path.dirname(current)) {
      if (watch.ignored(current, statsOf(current))) return false;
    }
    return true;
  });
  const createWatcher: PackageFolderWatchFactory = (paths, watchOptions) => {
    const watch = new FakeWatch(paths.map((watchedPath) => path.resolve(watchedPath)), watchOptions.ignored);
    watches.push(watch);
    if (options.readyOnCreate) setImmediate(() => { if (!watch.closed) watch.emit("ready"); });
    return watch;
  };
  const createParentFolderWatch: ParentFolderWatchFactory = (directory, onChange, onError) => {
    const watch = new FakeParentWatch(directory, onChange, onError);
    parents.push(watch);
    return watch;
  };
  return {
    watches,
    parents,
    createWatcher,
    createParentFolderWatch,
    /** The OS reports a file event (add, change, unlink, addDir, unlinkDir) to every open watch that covers the path. */
    reportFile(event: string, filePath: string): void {
      for (const watch of [...watches]) if (!watch.closed && covers(watch, filePath)) watch.emit("all", event, filePath);
    },
    /** The OS reports a changed entry of a directory to every open one-level watch of that directory. */
    reportEntry(directory: string, entryName: string | null): void {
      for (const parent of [...parents]) if (!parent.closed && parent.directory === directory) parent.onChange(entryName);
    },
  };
};

/** A monitor whose OS event sources are the test's fakes. */
const monitorWithFakeOs = (
  sink: PackageFolderChangeSink,
  options: { readyOnCreate?: boolean; createWatcher?: (fakes: ReturnType<typeof fakeOs>) => PackageFolderWatchFactory } = {},
) => {
  const fakes = fakeOs({ readyOnCreate: options.readyOnCreate ?? true });
  monitor = new AgentPackageFolderWatcher({
    sink,
    createWatcher: options.createWatcher?.(fakes) ?? fakes.createWatcher,
    createParentFolderWatch: fakes.createParentFolderWatch,
  });
  return fakes;
};

/** Waits for the monitor's own asynchronous work (folder stats, its serial queue); no OS event is waited for. */
const waitFor = async (predicate: () => boolean, timeoutMs = 2_000): Promise<void> => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error("Timed out waiting for the monitor.");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};
/** Lets the monitor finish what the reported events started, before checking that something did NOT happen. */
const settle = async () => {
  await monitor?.whenReady();
  for (let turn = 0; turn < 20; turn += 1) await new Promise((resolve) => setImmediate(resolve));
};

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
    const fakes = monitorWithFakeOs(recorded.sink);
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    await monitor!.whenReady();
    expect(monitor!.getPackageFolderWatchStatus(rootPath)).toEqual({ state: "WATCHING", message: null });

    const skillFile = path.join(rootPath, "agents", "a", "skills", "s", "SKILL.md");
    const notesFile = path.join(rootPath, "agents", "a", "notes.md");
    const docsFolder = path.join(rootPath, "docs");
    const docsFile = path.join(docsFolder, "readme.md");
    await fs.writeFile(skillFile, "x");
    fakes.reportFile("add", skillFile);
    await fs.writeFile(notesFile, "x");
    fakes.reportFile("add", notesFile);
    await fs.mkdir(docsFolder);
    fakes.reportFile("addDir", docsFolder);
    await fs.writeFile(docsFile, "x");
    fakes.reportFile("add", docsFile);
    await settle();
    expect(recorded.folders).toEqual([]);

    const agentFile = path.join(rootPath, "agents", "a", "agent.md");
    const leadFolder = path.join(rootPath, "agent-teams", "t", "agents", "lead");
    const leadConfig = path.join(leadFolder, "agent-config.json");
    await fs.writeFile(agentFile, "x");
    fakes.reportFile("add", agentFile);
    await fs.mkdir(leadFolder);
    fakes.reportFile("addDir", leadFolder);
    await fs.writeFile(leadConfig, "{}");
    fakes.reportFile("add", leadConfig);
    await waitFor(() => recorded.folders.includes("agent:a") && recorded.folders.includes("agent_team:t"));
    expect(recorded.folders.every((folder) => folder === "agent:a" || folder === "agent_team:t")).toBe(true);
  });

  it("moves a root to FOLDER_MISSING when it is renamed away and resumes watching when it returns", async () => {
    const rootPath = path.join(base, "pkg");
    const movedPath = path.join(base, "pkg-moved");
    await fs.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
    const recorded = recordingSink();
    const fakes = monitorWithFakeOs(recorded.sink);
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    await monitor!.whenReady();

    await fs.rename(rootPath, movedPath);
    fakes.reportEntry(base, "pkg");
    fakes.reportEntry(base, "pkg-moved");
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "FOLDER_MISSING");
    expect(recorded.roots).toContain(rootPath);

    recorded.roots.length = 0;
    await fs.rename(movedPath, rootPath);
    fakes.reportEntry(base, "pkg-moved");
    fakes.reportEntry(base, "pkg");
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "WATCHING");
    expect(recorded.roots).toContain(rootPath);
    await monitor!.whenReady();

    const agentFile = path.join(rootPath, "agents", "a", "agent.md");
    await fs.writeFile(agentFile, "x");
    fakes.reportFile("add", agentFile);
    await waitFor(() => recorded.folders.includes("agent:a"));
  });

  it("re-arms a root whose folder was replaced in place (GitHub update rename swap)", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const recorded = recordingSink();
    const fakes = monitorWithFakeOs(recorded.sink);
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    await monitor!.whenReady();

    const staged = path.join(base, "staged");
    await fs.mkdir(path.join(staged, "agents", "b"), { recursive: true });
    await fs.rename(rootPath, path.join(base, "backup"));
    await fs.rename(staged, rootPath);
    // The update's own full reconcile re-syncs roots; the identity check re-arms the replaced root. (The parent
    // watch's events for the swap are not reported: this case proves the sync's identity check on its own.)
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "WATCHING");
    await monitor!.whenReady();
    // The re-arm itself also asks the sync for a full reconcile of the root, which covers writes made while the
    // new OS watches start.
    expect(recorded.roots).toContain(rootPath);
    recorded.folders.length = 0;

    const agentFile = path.join(rootPath, "agents", "b", "agent.md");
    await fs.writeFile(agentFile, "x");
    fakes.reportFile("add", agentFile);
    await waitFor(() => recorded.folders.includes("agent:b"));
  });

  it("starts a registered root that is missing as FOLDER_MISSING and arms it when it appears", async () => {
    const rootPath = path.join(base, "later", "pkg");
    const recorded = recordingSink();
    const fakes = monitorWithFakeOs(recorded.sink);
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    expect(monitor!.getPackageFolderWatchStatus(rootPath)?.state).toBe("FOLDER_MISSING");

    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    // The nearest existing ancestor is watched while the root is missing.
    fakes.reportEntry(base, "later");
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "WATCHING");
    expect(recorded.roots).toContain(rootPath);
  });

  it("reports UNAVAILABLE when watching cannot be set up, and re-arms on the next sync", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(rootPath, { recursive: true });
    let fail = true;
    const recorded = recordingSink();
    monitorWithFakeOs(recorded.sink, {
      createWatcher: (fakes) => (paths, options) => {
        if (fail) throw Object.assign(new Error("System limit for number of file watchers reached"), { code: "ENOSPC" });
        return fakes.createWatcher(paths, options);
      },
    });
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    expect(monitor!.getPackageFolderWatchStatus(rootPath)).toEqual({
      state: "UNAVAILABLE",
      message: expect.stringContaining("ENOSPC"),
    });

    fail = false;
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    expect(monitor!.getPackageFolderWatchStatus(rootPath)?.state).toBe("WATCHING");
  });

  it("reports UNAVAILABLE for a root whose definition folder cannot be listed, and re-arms once it can", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    await fs.chmod(path.join(rootPath, "agents"), 0o000);
    const recorded = recordingSink();
    monitorWithFakeOs(recorded.sink);
    try {
      await monitor!.syncPackageFolders([rootAt(rootPath)]);
      expect(monitor!.getPackageFolderWatchStatus(rootPath)).toEqual({ state: "UNAVAILABLE", message: expect.stringContaining("EACCES") });
    } finally {
      await fs.chmod(path.join(rootPath, "agents"), 0o755);
    }
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    expect(monitor!.getPackageFolderWatchStatus(rootPath)?.state).toBe("WATCHING");
  });

  it("reports UNAVAILABLE when a running watcher fails", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(rootPath, { recursive: true });
    const recorded = recordingSink();
    const fakes = monitorWithFakeOs(recorded.sink, { readyOnCreate: false });
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    fakes.watches[0]!.emit("error", Object.assign(new Error("too many open files"), { code: "EMFILE" }));
    await waitFor(() => monitor!.getPackageFolderWatchStatus(rootPath)?.state === "UNAVAILABLE");
    expect(recorded.roots).toContain(rootPath);
  });

  it("stops watching a removed root and releases it", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
    const recorded = recordingSink();
    const fakes = monitorWithFakeOs(recorded.sink);
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    await monitor!.whenReady();
    await monitor!.syncPackageFolders([]);
    expect(monitor!.getPackageFolderWatchStatus(rootPath)).toBeNull();
    expect(fakes.watches[0]!.close).toHaveBeenCalledOnce();
    expect(fakes.parents[0]!.close).toHaveBeenCalledOnce();

    const agentFile = path.join(rootPath, "agents", "a", "agent.md");
    await fs.writeFile(agentFile, "x");
    fakes.reportFile("add", agentFile);
    await settle();
    expect(recorded.folders).toEqual([]);
  });
});

describe("AgentPackageFolderWatcher catch-up request", () => {
  const armWith = async (rootPath: string, options: { catchUpDelayMs?: number } = {}) => {
    const recorded = recordingSink();
    // The test drives each watch by hand: the OS gives no event for what it dropped, so none is emitted.
    const { watches, createWatcher, createParentFolderWatch } = fakeOs();
    monitor = new AgentPackageFolderWatcher({
      sink: recorded.sink,
      createWatcher,
      createParentFolderWatch,
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

  // autobyteus-524 FU-007: at process exit the watches end without their OS close; any other close releases them.
  const armWithPresence = async (rootPath: string) => {
    const recorded = recordingSink();
    const { watches, parents: presence, createWatcher, createParentFolderWatch } = fakeOs();
    monitor = new AgentPackageFolderWatcher({
      sink: recorded.sink,
      createWatcher,
      createParentFolderWatch,
      logger: { warn: () => undefined },
    });
    await monitor.syncPackageFolders([rootAt(rootPath)]);
    return { recorded, watches, presence };
  };

  it("stops for a process exit without closing its OS watches, handles no event after it, and a later close() does nothing", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
    const { recorded, watches, presence } = await armWithPresence(rootPath);
    expect(watches).toHaveLength(1); expect(presence).toHaveLength(1);
    watches[0]!.emit("ready");

    monitor!.stopForProcessExit();
    watches[0]!.emit("all", "change", path.join(rootPath, "agents", "a", "agent.md"));
    await advance(5_000);
    await monitor!.close();

    expect(watches[0]!.close).not.toHaveBeenCalled();
    expect(presence[0]!.close).not.toHaveBeenCalled();
    expect([recorded.folders, recorded.reconciles, recorded.roots]).toEqual([[], [], []]);
    expect(monitor!.getPackageFolderWatchStatus(rootPath)).toBeNull();
  });

  it("closes its OS watches on close() without a process-exit stop", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const { watches, presence } = await armWithPresence(rootPath);
    await monitor!.close();
    expect(watches[0]!.close).toHaveBeenCalledOnce();
    expect(presence[0]!.close).toHaveBeenCalledOnce();
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
    const { watches, createWatcher, createParentFolderWatch } = fakeOs();
    monitor = new AgentPackageFolderWatcher({ sink: recorded.sink, createWatcher, createParentFolderWatch, logger: { warn } });
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
