/**
 * API-14 (autobyteus-253, API/E2E): temporary probe of the SR-002 watch self-check with REAL chokidar.
 * Not a committed test (a copy is kept in the ticket's evidence/probes/). Run:
 *   pnpm -C autobyteus-server-ts exec vitest run tests/tmp-probe/api253-watcher-coverage.test.ts --no-watch --reporter=verbose
 * Cases:
 *   A  realistic layout, root given through a symlinked prefix (/var → /private/var): one arm, no repair, no warning;
 *      an empty agent folder is watched (its first file is reported).
 *   A2 same layout through the real path (control).
 *   B  the first chokidar watch is made to miss agents/scout (as after a lost addDir): one reconcile, one quiet
 *      repair (second arm, no markPackageFolderChanged), then an edit inside scout is reported.
 *   C  scout can never be watched: exactly one repair, then AGENT_PACKAGE_FOLDER_UNWATCHED, no third arm.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import chokidar from "chokidar";
import { afterEach, describe, expect, it } from "vitest";
import {
  AgentPackageFolderWatcher,
  type PackageFolderWatch,
  type PackageFolderWatchFactory,
} from "../../src/agent-package-definitions/monitor/agent-package-folder-watcher.js";
import { listWatchedLayoutDirectories } from "../../src/agent-package-definitions/monitor/agent-package-layout.js";
import type { RegisteredPackageRoot } from "../../src/agent-package-definitions/domain/agent-package-definition-types.js";

const results: Record<string, unknown> = {};
let monitor: AgentPackageFolderWatcher | null = null;
const cleanup: string[] = [];

const rootAt = (rootPath: string): RegisteredPackageRoot => ({
  rootPath,
  sourceClass: "registered_package",
  kindDirs: {
    agents: path.join(rootPath, "agents"),
    "agent-teams": path.join(rootPath, "agent-teams"),
    "agent-orgs": path.join(rootPath, "agent-orgs"),
  },
});
const write = async (file: string, content = "x\n") => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, content);
};
const waitFor = async (predicate: () => boolean, label: string, timeoutMs = 5000) => {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error(`timed out: ${label}`);
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return Date.now() - started;
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const harness = (missOn: (call: number, filePath: string) => boolean) => {
  const folders: string[] = [];
  const roots: string[] = [];
  const reconciles: string[] = [];
  const warns: string[] = [];
  const watches: PackageFolderWatch[] = [];
  const createWatcher: PackageFolderWatchFactory = (paths, options) => {
    const call = watches.length + 1;
    const watch = chokidar.watch(paths, {
      ignoreInitial: true, persistent: true,
      ignored: (filePath: string, stats?: import("node:fs").Stats) => missOn(call, filePath) || options.ignored(filePath, stats),
    }) as unknown as PackageFolderWatch;
    watches.push(watch);
    return watch;
  };
  monitor = new AgentPackageFolderWatcher({
    createWatcher,
    logger: { warn: (message: string) => { warns.push(String(message)); } },
    sink: {
      markFolderChanged: (kind, folderId) => { folders.push(`${kind}:${folderId}`); },
      markPackageFolderChanged: (rootPath) => { roots.push(rootPath); },
      reconcilePackageFolder: (rootPath) => { reconciles.push(rootPath); },
    },
  });
  return { folders, roots, reconciles, warns, watches };
};

const realisticLayout = async (root: string) => {
  await write(path.join(root, "agents", "planner", "agent.md"));
  await write(path.join(root, "agents", "planner", "agent-config.json"), "{}");
  await write(path.join(root, "agents", "planner", "skills", "research", "SKILL.md"));
  await fs.mkdir(path.join(root, "agents", "empty-agent"), { recursive: true });
  await fs.mkdir(path.join(root, "agents", "_template", "inner"), { recursive: true });
  await fs.mkdir(path.join(root, "agents", ".hidden"), { recursive: true });
  await write(path.join(root, "agent-teams", "crew", "team.md"));
  await write(path.join(root, "agent-teams", "crew", "team-config.json"), "{}");
  await write(path.join(root, "agent-teams", "crew", "agents", "lead", "agent.md"));
  await fs.mkdir(path.join(root, "agent-teams", "crew", "docs"), { recursive: true });
  await write(path.join(root, "agent-orgs", "acme", "org.md"));
  await write(path.join(root, "agent-orgs", "acme", "agents", "ceo", "agent.md"));
  await write(path.join(root, "agent-orgs", "acme", "agent-teams", "board", "team.md"));
  await write(path.join(root, "agent-orgs", "acme", "agent-teams", "board", "agents", "member", "agent.md"));
  await write(path.join(root, "README.md"));
};

afterEach(async () => {
  await monitor?.close();
  monitor = null;
});

describe("API-14 SR-002 watch self-check with real chokidar", { timeout: 30_000 }, () => {
  for (const variant of ["A-symlinked-prefix", "A2-real-path"] as const) {
    it(`${variant}: a realistic layout needs no repair and the empty agent folder is watched`, async () => {
      const made = await fs.mkdtemp(path.join(os.tmpdir(), "api253-cov-"));
      cleanup.push(made);
      const rootPath = variant === "A2-real-path" ? await fs.realpath(made) : made;
      const real = await fs.realpath(made);
      await realisticLayout(rootPath);
      const h = harness(() => false);
      await monitor!.syncPackageFolders([rootAt(rootPath)]);
      await monitor!.whenReady();
      await waitFor(() => h.reconciles.length >= 1, "first catch-up");
      await sleep(800);
      const watchedKeys = Object.keys(h.watches[0]!.getWatched()).sort();
      const listed = (await listWatchedLayoutDirectories(rootAt(rootPath))).sort();
      const earlyFolderEvents = [...h.folders];
      const mark = h.folders.length;
      await write(path.join(rootPath, "agents", "empty-agent", "agent.md"));
      const reportedMs = await waitFor(() => h.folders.slice(mark).includes("agent:empty-agent"), "empty-agent first file");
      results[variant] = {
        rootPath, realPath: real, prefixIsSymlinked: rootPath !== real,
        arms: h.watches.length, reconciles: h.reconciles.length, packageChanged: h.roots.length, warns: h.warns,
        listed: listed.map((entry) => path.relative(rootPath, entry)),
        listedButNotWatched: listed.filter((entry) => !watchedKeys.includes(entry)).map((entry) => path.relative(rootPath, entry)),
        watchedKeySample: watchedKeys.slice(0, 3), earlyFolderEvents, emptyAgentFirstFileReportedMs: reportedMs,
      };
      if (variant === "A-symlinked-prefix") expect(rootPath).not.toBe(real);
      expect(h.watches.length).toBe(1);
      expect(h.reconciles.length).toBe(1);
      expect(h.roots).toEqual([]);
      expect(h.warns).toEqual([]);
    });
  }

  it("B: a folder the first watch missed is repaired once, quietly, and its later edit is reported", async () => {
    const rootPath = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "api253-cov-")));
    cleanup.push(rootPath);
    await write(path.join(rootPath, "agents", "planner", "agent.md"));
    await write(path.join(rootPath, "agents", "scout", "agent.md"));
    const scout = path.join(rootPath, "agents", "scout");
    const missed = (call: number, filePath: string) => call === 1 && (filePath === scout || filePath.startsWith(`${scout}${path.sep}`));
    const h = harness(missed);
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    await monitor!.whenReady();
    const firstWatchHasScout = Object.keys(h.watches[0]!.getWatched()).includes(scout);
    const firstCatchUpMs = await waitFor(() => h.reconciles.length >= 1, "first catch-up");
    const repairMs = await waitFor(() => h.watches.length === 2, "coverage repair re-arm");
    await monitor!.whenReady();
    await waitFor(() => h.reconciles.length >= 2, "catch-up of the repaired watch");
    // Let events FSEvents may replay to a new stream (files written just before arming) drain first.
    await sleep(1500);
    const secondWatchHasScout = Object.keys(h.watches[1]!.getWatched()).includes(scout);
    const eventsBeforeEdit = [...h.folders];
    const mark = h.folders.length;
    await write(path.join(scout, "agent.md"), "edited\n");
    const editMs = await waitFor(() => h.folders.slice(mark).includes("agent:scout"), "scout edit reported");
    results.B = { firstWatchHasScout, secondWatchHasScout, arms: h.watches.length, reconciles: h.reconciles.length,
      packageChanged: h.roots.length, warns: h.warns, firstCatchUpMs, repairMs, eventsBeforeEdit, editReportedMs: editMs, eventsAfterEdit: h.folders.slice(mark) };
    expect(firstWatchHasScout).toBe(false);
    expect(secondWatchHasScout).toBe(true);
    expect(h.watches.length).toBe(2);
    expect(h.reconciles.length).toBe(2);
    expect(h.roots).toEqual([]);
    expect(h.warns).toEqual([]);
  });

  it("C: a folder that can never be watched is repaired once, then warned about, never re-armed again", async () => {
    const rootPath = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "api253-cov-")));
    cleanup.push(rootPath);
    await write(path.join(rootPath, "agents", "planner", "agent.md"));
    await write(path.join(rootPath, "agents", "scout", "agent.md"));
    const scout = path.join(rootPath, "agents", "scout");
    const h = harness((_call, filePath) => filePath === scout || filePath.startsWith(`${scout}${path.sep}`));
    await monitor!.syncPackageFolders([rootAt(rootPath)]);
    await monitor!.whenReady();
    await waitFor(() => h.watches.length === 2, "one repair");
    await monitor!.whenReady();
    await waitFor(() => h.warns.some((warn) => warn.startsWith("AGENT_PACKAGE_FOLDER_UNWATCHED:")), "unwatched warning");
    await sleep(1500);
    const mark = h.folders.length;
    await write(path.join(scout, "agent.md"), "edited\n");
    await write(path.join(rootPath, "agents", "planner", "agent.md"), "edited\n");
    await waitFor(() => h.folders.slice(mark).includes("agent:planner"), "planner edit reported (the watch is live)");
    await sleep(1000);
    const scoutEditReported = h.folders.slice(mark).includes("agent:scout");
    results.C = { arms: h.watches.length, reconciles: h.reconciles.length, packageChanged: h.roots.length, warns: h.warns,
      eventsAfterEdits: h.folders.slice(mark), scoutEditReported };
    expect(scoutEditReported).toBe(false);
    expect(h.watches.length).toBe(2);
    expect(h.reconciles.length).toBe(2);
    expect(h.roots).toEqual([]);
    expect(h.warns.filter((warn) => warn.startsWith("AGENT_PACKAGE_FOLDER_UNWATCHED:"))).toHaveLength(1);
  });

  it("writes the results", async () => {
    for (const dir of cleanup) await fs.rm(dir, { recursive: true, force: true });
    const out = process.env["API253_PROBE_OUT"];
    if (out) await fs.writeFile(out, `${JSON.stringify(results, null, 2)}\n`);
    console.log(`API253_PROBE_RESULTS ${JSON.stringify(results)}`);
  });
});
