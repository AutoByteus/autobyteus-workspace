import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PackageDefinitionMonitor,
  type DefinitionWatcher,
} from "../../../src/definition-catalog/monitor/package-definition-monitor.js";
import type { RegisteredPackageRoot } from "../../../src/definition-catalog/domain/definition-catalog-types.js";

let base: string;
let monitor: PackageDefinitionMonitor | null = null;

const rootAt = (rootPath: string): RegisteredPackageRoot => ({
  rootPath,
  sourceClass: "external_read_only",
  kindDirs: {
    agents: path.join(rootPath, "agents"),
    "agent-teams": path.join(rootPath, "agent-teams"),
    "agent-orgs": path.join(rootPath, "agent-orgs"),
  },
});

const recordingSink = () => {
  const units: string[] = [];
  const roots: string[] = [];
  return {
    units,
    roots,
    sink: {
      noteUnitChange: (subject: string, unitId: string) => { units.push(`${subject}:${unitId}`); },
      noteRootChanged: (rootPath: string) => { roots.push(rootPath); },
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
  await monitor?.close();
  monitor = null;
  await fs.rm(base, { recursive: true, force: true });
});

describe("PackageDefinitionMonitor", () => {
  it("reports definition changes per unit and ignores skills and other files", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents", "a", "skills", "s"), { recursive: true });
    await fs.mkdir(path.join(rootPath, "agent-teams", "t", "agents"), { recursive: true });
    const recorded = recordingSink();
    monitor = new PackageDefinitionMonitor({ sink: recorded.sink });
    await monitor.syncRoots([rootAt(rootPath)]);
    await monitor.whenReady();
    expect(monitor.getRootWatchStatus(rootPath)).toEqual({ state: "WATCHING", message: null });

    await fs.writeFile(path.join(rootPath, "agents", "a", "skills", "s", "SKILL.md"), "x");
    await fs.writeFile(path.join(rootPath, "agents", "a", "notes.md"), "x");
    await fs.mkdir(path.join(rootPath, "docs"));
    await fs.writeFile(path.join(rootPath, "docs", "readme.md"), "x");
    await settleQuietly();
    expect(recorded.units).toEqual([]);

    await fs.writeFile(path.join(rootPath, "agents", "a", "agent.md"), "x");
    await fs.mkdir(path.join(rootPath, "agent-teams", "t", "agents", "lead"));
    await fs.writeFile(path.join(rootPath, "agent-teams", "t", "agents", "lead", "agent-config.json"), "{}");
    await waitFor(() => recorded.units.includes("agent:a") && recorded.units.includes("agent_team:t"));
    expect(recorded.units.every((unit) => unit === "agent:a" || unit === "agent_team:t")).toBe(true);
  });

  it("moves a root to ROOT_MISSING when it is renamed away and resumes watching when it returns", async () => {
    const rootPath = path.join(base, "pkg");
    const movedPath = path.join(base, "pkg-moved");
    await fs.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
    const recorded = recordingSink();
    monitor = new PackageDefinitionMonitor({ sink: recorded.sink });
    await monitor.syncRoots([rootAt(rootPath)]);
    await monitor.whenReady();
    await settleQuietly(300);

    await fs.rename(rootPath, movedPath);
    await waitFor(() => monitor!.getRootWatchStatus(rootPath)?.state === "ROOT_MISSING");
    expect(recorded.roots).toContain(rootPath);

    recorded.roots.length = 0;
    await fs.rename(movedPath, rootPath);
    await waitFor(() => monitor!.getRootWatchStatus(rootPath)?.state === "WATCHING");
    expect(recorded.roots).toContain(rootPath);
    await monitor.whenReady();
    await settleQuietly(300);

    await fs.writeFile(path.join(rootPath, "agents", "a", "agent.md"), "x");
    await waitFor(() => recorded.units.includes("agent:a"));
  });

  it("re-arms a root whose folder was replaced in place (GitHub update rename swap)", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    const recorded = recordingSink();
    monitor = new PackageDefinitionMonitor({ sink: recorded.sink });
    await monitor.syncRoots([rootAt(rootPath)]);
    await monitor.whenReady();

    const staged = path.join(base, "staged");
    await fs.mkdir(path.join(staged, "agents", "b"), { recursive: true });
    await fs.rename(rootPath, path.join(base, "backup"));
    await fs.rename(staged, rootPath);
    // The update's own full reconcile re-syncs roots; the identity check re-arms the replaced root.
    await monitor.syncRoots([rootAt(rootPath)]);
    await waitFor(() => monitor!.getRootWatchStatus(rootPath)?.state === "WATCHING");
    await monitor.whenReady();
    // macOS directory watches start slightly after chokidar's ready; the re-arm itself also asks
    // the sync for a full reconcile of the root, which covers writes made in that short window.
    expect(recorded.roots).toContain(rootPath);
    await settleQuietly(300);
    recorded.units.length = 0;

    await fs.writeFile(path.join(rootPath, "agents", "b", "agent.md"), "x");
    await waitFor(() => recorded.units.includes("agent:b"));
  });

  it("starts a registered root that is missing as ROOT_MISSING and arms it when it appears", async () => {
    const rootPath = path.join(base, "later", "pkg");
    const recorded = recordingSink();
    monitor = new PackageDefinitionMonitor({ sink: recorded.sink });
    await monitor.syncRoots([rootAt(rootPath)]);
    expect(monitor.getRootWatchStatus(rootPath)?.state).toBe("ROOT_MISSING");

    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    await waitFor(() => monitor!.getRootWatchStatus(rootPath)?.state === "WATCHING");
    expect(recorded.roots).toContain(rootPath);
  });

  it("reports UNAVAILABLE when watching cannot be set up, and re-arms on the next sync", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(rootPath, { recursive: true });
    let fail = true;
    const recorded = recordingSink();
    monitor = new PackageDefinitionMonitor({
      sink: recorded.sink,
      createWatcher: (paths, options) => {
        if (fail) throw Object.assign(new Error("System limit for number of file watchers reached"), { code: "ENOSPC" });
        return realWatcher(paths, options);
      },
    });
    await monitor.syncRoots([rootAt(rootPath)]);
    expect(monitor.getRootWatchStatus(rootPath)).toEqual({
      state: "UNAVAILABLE",
      message: expect.stringContaining("ENOSPC"),
    });

    fail = false;
    await monitor.syncRoots([rootAt(rootPath)]);
    expect(monitor.getRootWatchStatus(rootPath)?.state).toBe("WATCHING");
  });

  it("reports UNAVAILABLE for a root whose definition folder cannot be listed, and re-arms once it can", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents"), { recursive: true });
    await fs.chmod(path.join(rootPath, "agents"), 0o000);
    const recorded = recordingSink();
    monitor = new PackageDefinitionMonitor({ sink: recorded.sink });
    try {
      await monitor.syncRoots([rootAt(rootPath)]);
      expect(monitor.getRootWatchStatus(rootPath)).toEqual({ state: "UNAVAILABLE", message: expect.stringContaining("EACCES") });
    } finally {
      await fs.chmod(path.join(rootPath, "agents"), 0o755);
    }
    await monitor.syncRoots([rootAt(rootPath)]);
    expect(monitor.getRootWatchStatus(rootPath)?.state).toBe("WATCHING");
  });

  it("reports UNAVAILABLE when a running watcher fails", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(rootPath, { recursive: true });
    const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};
    const fake: DefinitionWatcher = {
      on: ((event: string, listener: (...args: unknown[]) => void) => {
        (listeners[event] ??= []).push(listener);
        return fake;
      }) as DefinitionWatcher["on"],
      close: async () => undefined,
    };
    const recorded = recordingSink();
    monitor = new PackageDefinitionMonitor({ sink: recorded.sink, createWatcher: () => fake });
    await monitor.syncRoots([rootAt(rootPath)]);
    listeners.error?.forEach((listener) => listener(Object.assign(new Error("too many open files"), { code: "EMFILE" })));
    await waitFor(() => monitor!.getRootWatchStatus(rootPath)?.state === "UNAVAILABLE");
    expect(recorded.roots).toContain(rootPath);
  });

  it("stops watching a removed root and releases it", async () => {
    const rootPath = path.join(base, "pkg");
    await fs.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
    const recorded = recordingSink();
    monitor = new PackageDefinitionMonitor({ sink: recorded.sink });
    await monitor.syncRoots([rootAt(rootPath)]);
    await monitor.whenReady();
    await monitor.syncRoots([]);
    expect(monitor.getRootWatchStatus(rootPath)).toBeNull();

    await fs.writeFile(path.join(rootPath, "agents", "a", "agent.md"), "x");
    await settleQuietly();
    expect(recorded.units).toEqual([]);
  });
});

import chokidar from "chokidar";
const realWatcher = (paths: string[], options: { ignored: (filePath: string) => boolean }): DefinitionWatcher =>
  chokidar.watch(paths, { ignoreInitial: true, ignored: options.ignored }) as unknown as DefinitionWatcher;
