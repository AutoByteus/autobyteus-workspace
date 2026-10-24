import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import type { AgentPackageDefinitionKind, RegisteredPackageRoot } from "../domain/agent-package-definition-types.js";
import { errorText, kindFoldersUnreadableError } from "../domain/definition-files.js";
import { findDefinitionFolderForPath, isWatchedPackagePath, listWatchedLayoutDirectories } from "./agent-package-layout.js";

export type PackageFolderWatchState = "WATCHING" | "FOLDER_MISSING" | "UNAVAILABLE";
export type PackageFolderWatchStatus = Readonly<{ state: PackageFolderWatchState; message: string | null }>;

/** The part of the reloader the watcher reports to. It never reads definitions itself. */
export type PackageFolderChangeSink = Readonly<{
  markFolderChanged(kind: AgentPackageDefinitionKind, folderId: string): void;
  markPackageFolderChanged(rootPath: string): void;
  /** Ask for a quiet re-read of the package's definition folders; announces only what really changed. */
  reconcilePackageFolder(rootPath: string): void;
}>;

/**
 * How long a package folder must stay free of added or removed folders (and of a fresh arming) before the watcher
 * asks the reloader for a catch-up re-read. The OS drops events while a directory watch starts (measured: up to
 * ~60 ms after chokidar's `ready`) and while chokidar adds a watch for a new folder; 300 ms is five times that.
 */
export const PACKAGE_CATCH_UP_DELAY_MS = 300;

export type PackageFolderWatch = {
  on(event: "all", listener: (eventName: string, filePath: string) => void): unknown;
  on(event: "error", listener: (error: unknown) => void): unknown;
  on(event: "ready", listener: () => void): unknown;
  /** The directories the watch holds (keys) and their entries, as chokidar reports them. */
  getWatched(): Record<string, string[]>;
  close(): Promise<void>;
};
export type PackageFolderWatchFactory = (
  paths: string[],
  options: { ignored: (filePath: string, stats?: fs.Stats) => boolean },
) => PackageFolderWatch;
/** A one-level watch of a directory's entries; `entryName` is null when the platform does not report it. */
export type ParentFolderWatchFactory = (
  directory: string,
  onChange: (entryName: string | null) => void,
  onError: (error: unknown) => void,
) => { close(): void };

const defaultWatcherFactory: PackageFolderWatchFactory = (paths, options) =>
  chokidar.watch(paths, { ignoreInitial: true, persistent: true, ignored: options.ignored }) as unknown as PackageFolderWatch;

const defaultParentFolderWatchFactory: ParentFolderWatchFactory = (directory, onChange, onError) => {
  const watcher = fs.watch(directory, { persistent: true }, (_event, entryName) =>
    onChange(entryName === null || entryName === undefined ? null : String(entryName)));
  watcher.on("error", onError);
  return { close: () => watcher.close() };
};

const MISSING_MESSAGE = "Its definitions keep their last loaded version until the folder returns.";

type PackageFolderEntry = {
  root: RegisteredPackageRoot;
  state: PackageFolderWatchState;
  message: string | null;
  watcher: PackageFolderWatch | null;
  /** While armed: the package folder's parent (detects rename away or replacement). While missing: the nearest existing ancestor. */
  presenceWatch: { close(): void } | null;
  identity: string | null;
  ready: Promise<void>;
  generation: number;
  /** Pending catch-up request; restarted by every arming and every added or removed folder. */
  catchUpTimer: NodeJS.Timeout | null;
  /** The unwatched folders a coverage repair was already made for; reset by a structural event or a real arm. */
  coverageRepairedFor: string | null;
};

/**
 * Watches agent package folders for definition file changes: only the definition layout of each
 * registered package folder (in-process chokidar with a structural allow-list). It reports
 * changed definition folders and package folder transitions to the reloader, and owns each
 * package folder's watch lifecycle and state: WATCHING, FOLDER_MISSING (an ancestor is watched
 * until the folder returns) and UNAVAILABLE (watching failed; manual Reload still works). While a
 * package folder is watched, its parent is watched one level deep, because a folder renamed away
 * or replaced produces no events inside it on every platform.
 */
export class AgentPackageFolderWatcher {
  private static instance: AgentPackageFolderWatcher | null = null;

  /** The studio process watcher, read by the package service for package folder status. */
  static getProcessInstance(): AgentPackageFolderWatcher | null {
    return AgentPackageFolderWatcher.instance;
  }

  static bindProcessInstance(instance: AgentPackageFolderWatcher): void {
    if (AgentPackageFolderWatcher.instance) throw new Error("The process AgentPackageFolderWatcher is already initialized.");
    AgentPackageFolderWatcher.instance = instance;
  }

  static releaseProcessInstance(instance: AgentPackageFolderWatcher): void {
    if (AgentPackageFolderWatcher.instance === instance) AgentPackageFolderWatcher.instance = null;
  }

  private readonly entries = new Map<string, PackageFolderEntry>();
  private readonly createWatcher: PackageFolderWatchFactory;
  private readonly createParentFolderWatch: ParentFolderWatchFactory;
  private readonly logger: Pick<Console, "warn">;
  private readonly catchUpDelayMs: number;
  private chain: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(private readonly options: Readonly<{
    sink: PackageFolderChangeSink;
    createWatcher?: PackageFolderWatchFactory;
    createParentFolderWatch?: ParentFolderWatchFactory;
    logger?: Pick<Console, "warn">;
    /** Catch-up quiet period; tests shorten it. */
    catchUpDelayMs?: number;
  }>) {
    this.createWatcher = options.createWatcher ?? defaultWatcherFactory;
    this.createParentFolderWatch = options.createParentFolderWatch ?? defaultParentFolderWatchFactory;
    this.logger = options.logger ?? console;
    this.catchUpDelayMs = options.catchUpDelayMs ?? PACKAGE_CATCH_UP_DELAY_MS;
  }

  /** Starts watching new package folders, stops removed ones, re-arms failed or replaced ones. Never waits for watcher readiness. */
  syncPackageFolders(roots: readonly RegisteredPackageRoot[]): Promise<void> {
    return this.serial(async () => {
      const wanted = new Map(roots.map((root) => [root.rootPath, root]));
      for (const [rootPath, entry] of this.entries) {
        if (!wanted.has(rootPath)) {
          this.closeEntry(entry);
          this.entries.delete(rootPath);
        }
      }
      for (const root of wanted.values()) {
        const entry = this.entries.get(root.rootPath);
        if (!entry) {
          const created: PackageFolderEntry = {
            root, state: "WATCHING", message: null, watcher: null, presenceWatch: null, identity: null,
            ready: Promise.resolve(), generation: 0, catchUpTimer: null, coverageRepairedFor: null,
          };
          this.entries.set(root.rootPath, created);
          await this.arm(created);
          continue;
        }
        entry.root = root;
        const identity = await this.identityOf(root.rootPath);
        if (entry.state === "FOLDER_MISSING") {
          if (identity) await this.rearm(entry);
        } else if (!identity) {
          this.becomeMissing(entry);
          this.options.sink.markPackageFolderChanged(root.rootPath);
        } else if (entry.state === "UNAVAILABLE" || identity !== entry.identity) {
          await this.rearm(entry);
        }
      }
    });
  }

  getPackageFolderWatchStatus(rootPath: string): PackageFolderWatchStatus | null {
    const entry = this.entries.get(path.resolve(rootPath)) ?? this.entries.get(rootPath);
    return entry ? Object.freeze({ state: entry.state, message: entry.message }) : null;
  }

  /** Resolves when every current package folder watch has finished its initial scan (tests and probes). */
  async whenReady(): Promise<void> {
    await this.chain;
    await Promise.all([...this.entries.values()].map((entry) => entry.ready));
  }

  close(): Promise<void> {
    this.closed = true;
    return this.serial(async () => {
      for (const entry of this.entries.values()) this.closeEntry(entry);
      this.entries.clear();
    });
  }

  private serial(operation: () => Promise<void>): Promise<void> {
    const run = this.chain.then(operation);
    this.chain = run.catch((error) => this.logger.warn("AGENT_PACKAGE_FOLDER_WATCHER_FAILED", error));
    return run;
  }

  private async identityOf(rootPath: string): Promise<string | null> {
    try {
      const stats = await fsPromises.stat(rootPath);
      return stats.isDirectory() ? `${stats.dev}:${stats.ino}` : null;
    } catch {
      return null;
    }
  }

  private async rearm(entry: PackageFolderEntry): Promise<void> {
    entry.coverageRepairedFor = null;
    this.closeEntry(entry);
    await this.arm(entry);
    this.options.sink.markPackageFolderChanged(entry.root.rootPath);
  }

  private async arm(entry: PackageFolderEntry): Promise<void> {
    const { root } = entry;
    const identity = await this.identityOf(root.rootPath);
    if (!identity) {
      this.becomeMissing(entry);
      return;
    }
    entry.identity = identity;
    // A kind folder that cannot be listed is not watched; Settings shows the package as not auto-refreshing.
    const unreadable = await kindFoldersUnreadableError(root);
    if (unreadable) {
      this.becomeUnavailable(entry, unreadable);
      return;
    }
    const generation = ++entry.generation;
    const ancestorsOfKindDirs = new Set<string>([path.resolve(root.rootPath)]);
    for (const kindDir of Object.values(root.kindDirs)) {
      for (let current = path.dirname(path.resolve(kindDir)); ; current = path.dirname(current)) {
        ancestorsOfKindDirs.add(current);
        if (current === path.dirname(current)) break;
      }
    }
    let watcher: PackageFolderWatch;
    try {
      watcher = this.createWatcher(Object.values(root.kindDirs), {
        ignored: (filePath, stats) => !ancestorsOfKindDirs.has(path.resolve(filePath))
          && !isWatchedPackagePath(root, filePath, stats ? stats.isDirectory() : undefined),
      });
    } catch (error) {
      this.becomeUnavailable(entry, error);
      return;
    }
    entry.watcher = watcher;
    entry.state = "WATCHING";
    entry.message = null;
    entry.ready = new Promise<void>((resolve) => {
      watcher.on("ready", () => resolve());
      watcher.on("error", () => resolve());
    });
    // "ready" does not mean the OS watches are live: ask for a catch-up re-read once the watch has settled.
    watcher.on("ready", () => {
      if (generation === entry.generation && !this.closed) this.scheduleCatchUp(entry);
    });
    watcher.on("all", (eventName, filePath) => {
      if (generation === entry.generation && !this.closed) this.handleEvent(entry, eventName, filePath);
    });
    watcher.on("error", (error) => {
      if (generation !== entry.generation || this.closed) return;
      void this.serial(() => this.checkPackageFolder(entry, error));
    });
    this.watchPresence(entry, generation);
  }

  /** Watches the package folder's parent for the folder's own entry being renamed, removed or replaced. */
  private watchPresence(entry: PackageFolderEntry, generation: number): void {
    const rootPath = path.resolve(entry.root.rootPath);
    const parent = path.dirname(rootPath);
    const rootName = path.basename(rootPath);
    if (parent === rootPath) return;
    try {
      entry.presenceWatch = this.createParentFolderWatch(parent, (entryName) => {
        if (this.closed || generation !== entry.generation) return;
        if (entryName !== null && entryName !== rootName) return;
        void this.serial(() => this.checkPackageFolder(entry, null, "presence"));
      }, (error) => this.logger.warn(`AGENT_PACKAGE_FOLDER_PRESENCE_WATCH_FAILED:${parent}`, error));
    } catch (error) {
      this.logger.warn(`AGENT_PACKAGE_FOLDER_PRESENCE_WATCH_FAILED:${parent}`, error);
    }
  }

  private handleEvent(entry: PackageFolderEntry, eventName: string, filePath: string): void {
    const { root } = entry;
    const resolved = path.resolve(filePath);
    const kindDirs = Object.values(root.kindDirs).map((dir) => path.resolve(dir));
    // Adding or removing a folder rebuilds directory watches, the moment the OS drops other folders' events.
    if (eventName === "addDir" || eventName === "unlinkDir") {
      entry.coverageRepairedFor = null;
      this.scheduleCatchUp(entry);
    }
    if (eventName === "unlinkDir" && (resolved === path.resolve(root.rootPath) || kindDirs.includes(resolved))) {
      void this.serial(() => this.checkPackageFolder(entry, null));
      return;
    }
    if (eventName === "addDir" && kindDirs.includes(resolved)) {
      this.options.sink.markPackageFolderChanged(root.rootPath);
      return;
    }
    const folder = findDefinitionFolderForPath(root, filePath);
    if (folder) this.options.sink.markFolderChanged(folder.kind, folder.folderId);
  }

  /** Restarts the entry's catch-up timer; when it fires with the same watch still armed, the reloader is asked once. */
  private scheduleCatchUp(entry: PackageFolderEntry): void {
    this.clearCatchUp(entry);
    const generation = entry.generation;
    const timer = setTimeout(() => {
      entry.catchUpTimer = null;
      if (this.closed || generation !== entry.generation || entry.state !== "WATCHING") return;
      if (this.entries.get(entry.root.rootPath) !== entry) return;
      void this.serial(() => this.runCatchUp(entry, generation));
    }, this.catchUpDelayMs);
    timer.unref?.();
    entry.catchUpTimer = timer;
  }

  private isStillArmed(entry: PackageFolderEntry, generation: number): boolean {
    return !this.closed && generation === entry.generation && entry.state === "WATCHING" && this.entries.get(entry.root.rootPath) === entry;
  }

  /**
   * The catch-up: first check the watch itself (the package folder is still the same folder; every definition folder
   * on disk is watched), then ask the reloader to re-read the package. The OS can drop the event that would have made
   * chokidar watch a new folder, and a folder it does not watch never reports an edit.
   */
  private async runCatchUp(entry: PackageFolderEntry, generation: number): Promise<void> {
    try {
      await this.checkPackageFolder(entry, null, "presence");
      if (!this.isStillArmed(entry, generation)) return;
      // Re-read now even when the watch needs a repair: the store must not wait for the repaired watch's own catch-up.
      this.options.sink.reconcilePackageFolder(entry.root.rootPath);
      await this.repairCoverage(entry);
    } catch (error) {
      this.logger.warn(`AGENT_PACKAGE_FOLDER_CATCH_UP_FAILED:${entry.root.rootPath}`, error);
    }
  }

  /**
   * Re-arms the watch, without announcing anything, when a definition folder exists on disk that the watch does not
   * hold. One repair per set of unwatched folders: a folder that stays unwatched (for example an unreadable one) is
   * logged and left alone. The re-armed watch's `ready` schedules the next catch-up.
   */
  private async repairCoverage(entry: PackageFolderEntry): Promise<void> {
    const watched = new Set(Object.keys(entry.watcher?.getWatched() ?? {}).map((directory) => path.resolve(directory)));
    const unwatched = (await listWatchedLayoutDirectories(entry.root)).filter((directory) => !watched.has(directory)).sort();
    if (unwatched.length === 0) return;
    const key = unwatched.join("\n");
    if (entry.coverageRepairedFor === key) {
      this.logger.warn(`AGENT_PACKAGE_FOLDER_UNWATCHED:${entry.root.rootPath}`, unwatched);
      return;
    }
    entry.coverageRepairedFor = key;
    this.closeWatcher(entry);
    await this.arm(entry);
  }

  private clearCatchUp(entry: PackageFolderEntry): void {
    if (entry.catchUpTimer) clearTimeout(entry.catchUpTimer);
    entry.catchUpTimer = null;
  }

  /**
   * A kind folder or the package folder went away, its parent changed, or the watcher failed:
   * decide the package folder's new state. A presence check that finds the same folder changes nothing.
   */
  private async checkPackageFolder(entry: PackageFolderEntry, error: unknown, trigger: "event" | "presence" = "event"): Promise<void> {
    if (this.entries.get(entry.root.rootPath) !== entry || entry.state === "FOLDER_MISSING") return;
    const identity = await this.identityOf(entry.root.rootPath);
    if (!identity) {
      this.becomeMissing(entry);
      this.options.sink.markPackageFolderChanged(entry.root.rootPath);
      return;
    }
    if (identity !== entry.identity) {
      await this.rearm(entry);
      return;
    }
    if (error) {
      this.logger.warn(`AGENT_PACKAGE_FOLDER_WATCH_UNAVAILABLE:${entry.root.rootPath}`, error);
      this.becomeUnavailable(entry, error);
    } else if (trigger === "presence") {
      return;
    }
    this.options.sink.markPackageFolderChanged(entry.root.rootPath);
  }

  private becomeUnavailable(entry: PackageFolderEntry, error: unknown): void {
    this.clearCatchUp(entry);
    entry.state = "UNAVAILABLE";
    entry.message = `${errorText(error)}. Use Reload after changing this package.`;
    entry.ready = Promise.resolve();
  }

  private becomeMissing(entry: PackageFolderEntry): void {
    this.closeWatcher(entry);
    entry.state = "FOLDER_MISSING";
    entry.message = MISSING_MESSAGE;
    entry.identity = null;
    entry.ready = Promise.resolve();
    this.watchAncestor(entry);
  }

  /** Watches the nearest existing ancestor (one level) until the package folder appears again. */
  private watchAncestor(entry: PackageFolderEntry): void {
    this.closePresenceWatch(entry);
    const target = path.resolve(entry.root.rootPath);
    let directory = path.dirname(target);
    while (directory !== path.dirname(directory) && !fs.existsSync(directory)) directory = path.dirname(directory);
    const generation = entry.generation;
    const onChange = () => {
      if (this.closed || generation !== entry.generation) return;
      void this.serial(() => this.onAncestorChange(entry, directory));
    };
    try {
      entry.presenceWatch = this.createParentFolderWatch(directory, onChange, (error) => {
        this.logger.warn(`AGENT_PACKAGE_FOLDER_ANCESTOR_WATCH_FAILED:${directory}`, error);
        onChange();
      });
    } catch (error) {
      this.logger.warn(`AGENT_PACKAGE_FOLDER_ANCESTOR_WATCH_FAILED:${directory}`, error);
    }
  }

  private async onAncestorChange(entry: PackageFolderEntry, watchedDirectory: string): Promise<void> {
    if (this.entries.get(entry.root.rootPath) !== entry || entry.state !== "FOLDER_MISSING") return;
    if (await this.identityOf(entry.root.rootPath)) {
      this.closePresenceWatch(entry);
      entry.coverageRepairedFor = null;
      await this.arm(entry);
      this.options.sink.markPackageFolderChanged(entry.root.rootPath);
      return;
    }
    const relative = path.relative(watchedDirectory, path.resolve(entry.root.rootPath)).split(path.sep)[0]!;
    const next = path.join(watchedDirectory, relative);
    if (!fs.existsSync(watchedDirectory) || fs.existsSync(next)) this.watchAncestor(entry);
  }

  private closeWatcher(entry: PackageFolderEntry): void {
    entry.generation += 1;
    this.clearCatchUp(entry);
    const watcher = entry.watcher;
    entry.watcher = null;
    if (watcher) void watcher.close().catch((error) => this.logger.warn("AGENT_PACKAGE_FOLDER_WATCH_CLOSE_FAILED", error));
    this.closePresenceWatch(entry);
  }

  private closePresenceWatch(entry: PackageFolderEntry): void {
    const presenceWatch = entry.presenceWatch;
    entry.presenceWatch = null;
    try { presenceWatch?.close(); } catch { /* closing is best effort */ }
  }

  private closeEntry(entry: PackageFolderEntry): void {
    this.closeWatcher(entry);
  }
}
