import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import chokidar from "chokidar";
import type { DefinitionSubject, RegisteredPackageRoot } from "../domain/definition-catalog-types.js";
import { classifyDefinitionUnit, isWatchedDefinitionPath } from "./definition-structure-paths.js";

export type RootWatchState = "WATCHING" | "ROOT_MISSING" | "UNAVAILABLE";
export type RootWatchStatus = Readonly<{ state: RootWatchState; message: string | null }>;

/** The part of the sync the monitor reports to. It never reads definitions itself. */
export type DefinitionChangeSink = Readonly<{
  noteUnitChange(subject: DefinitionSubject, unitId: string): void;
  noteRootChanged(rootPath: string): void;
}>;

export type DefinitionWatcher = {
  on(event: "all", listener: (eventName: string, filePath: string) => void): unknown;
  on(event: "error", listener: (error: unknown) => void): unknown;
  on(event: "ready", listener: () => void): unknown;
  close(): Promise<void>;
};
export type DefinitionWatcherFactory = (
  paths: string[],
  options: { ignored: (filePath: string, stats?: fs.Stats) => boolean },
) => DefinitionWatcher;
/** A one-level watch of a directory's entries; `entryName` is null when the platform does not report it. */
export type AncestorWatcherFactory = (
  directory: string,
  onChange: (entryName: string | null) => void,
  onError: (error: unknown) => void,
) => { close(): void };

const defaultWatcherFactory: DefinitionWatcherFactory = (paths, options) =>
  chokidar.watch(paths, { ignoreInitial: true, persistent: true, ignored: options.ignored }) as unknown as DefinitionWatcher;

const defaultAncestorWatcherFactory: AncestorWatcherFactory = (directory, onChange, onError) => {
  const watcher = fs.watch(directory, { persistent: true }, (_event, entryName) =>
    onChange(entryName === null || entryName === undefined ? null : String(entryName)));
  watcher.on("error", onError);
  return { close: () => watcher.close() };
};

const MISSING_MESSAGE = "Its definitions keep their last loaded version until the folder returns.";

type RootEntry = {
  root: RegisteredPackageRoot;
  state: RootWatchState;
  message: string | null;
  watcher: DefinitionWatcher | null;
  /** While armed: the root's parent folder (detects rename away or replacement). While missing: the nearest existing ancestor. */
  presenceWatch: { close(): void } | null;
  identity: string | null;
  ready: Promise<void>;
  generation: number;
};

const errorText = (error: unknown): string => {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  const message = error instanceof Error ? error.message : String(error);
  return code && !message.includes(code) ? `${code}: ${message}` : message;
};

/**
 * Watches only the definition structure of each registered package root (in-process chokidar
 * with a structural allow-list) and reports changed units and root transitions to the sync.
 * Owns each root's watch lifecycle and its state: WATCHING, ROOT_MISSING (an ancestor is watched
 * until the root returns) and UNAVAILABLE (watching failed; manual Reload still works). While a
 * root is armed its parent folder is watched one level deep, because a root renamed away or
 * replaced produces no events inside the root on every platform.
 */
export class PackageDefinitionMonitor {
  private static instance: PackageDefinitionMonitor | null = null;

  /** The studio process monitor, read by the package service for root status. */
  static getProcessInstance(): PackageDefinitionMonitor | null {
    return PackageDefinitionMonitor.instance;
  }

  static bindProcessInstance(instance: PackageDefinitionMonitor): void {
    if (PackageDefinitionMonitor.instance) throw new Error("The process PackageDefinitionMonitor is already initialized.");
    PackageDefinitionMonitor.instance = instance;
  }

  static releaseProcessInstance(instance: PackageDefinitionMonitor): void {
    if (PackageDefinitionMonitor.instance === instance) PackageDefinitionMonitor.instance = null;
  }

  private readonly entries = new Map<string, RootEntry>();
  private readonly createWatcher: DefinitionWatcherFactory;
  private readonly createAncestorWatcher: AncestorWatcherFactory;
  private readonly logger: Pick<Console, "warn">;
  private chain: Promise<void> = Promise.resolve();
  private closed = false;

  constructor(private readonly options: Readonly<{
    sink: DefinitionChangeSink;
    createWatcher?: DefinitionWatcherFactory;
    createAncestorWatcher?: AncestorWatcherFactory;
    logger?: Pick<Console, "warn">;
  }>) {
    this.createWatcher = options.createWatcher ?? defaultWatcherFactory;
    this.createAncestorWatcher = options.createAncestorWatcher ?? defaultAncestorWatcherFactory;
    this.logger = options.logger ?? console;
  }

  /** Starts new roots, stops removed ones, re-arms failed or replaced ones. Never waits for watcher readiness. */
  syncRoots(roots: readonly RegisteredPackageRoot[]): Promise<void> {
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
          const created: RootEntry = {
            root, state: "WATCHING", message: null, watcher: null, presenceWatch: null, identity: null,
            ready: Promise.resolve(), generation: 0,
          };
          this.entries.set(root.rootPath, created);
          await this.arm(created);
          continue;
        }
        entry.root = root;
        const identity = await this.identityOf(root.rootPath);
        if (entry.state === "ROOT_MISSING") {
          if (identity) await this.rearm(entry);
        } else if (!identity) {
          this.becomeMissing(entry);
          this.options.sink.noteRootChanged(root.rootPath);
        } else if (entry.state === "UNAVAILABLE" || identity !== entry.identity) {
          await this.rearm(entry);
        }
      }
    });
  }

  getRootWatchStatus(rootPath: string): RootWatchStatus | null {
    const entry = this.entries.get(path.resolve(rootPath)) ?? this.entries.get(rootPath);
    return entry ? Object.freeze({ state: entry.state, message: entry.message }) : null;
  }

  /** Resolves when every current root watcher has finished its initial scan (tests and probes). */
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
    this.chain = run.catch((error) => this.logger.warn("PACKAGE_DEFINITION_MONITOR_FAILED", error));
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

  private async rearm(entry: RootEntry): Promise<void> {
    this.closeEntry(entry);
    await this.arm(entry);
    this.options.sink.noteRootChanged(entry.root.rootPath);
  }

  private async arm(entry: RootEntry): Promise<void> {
    const { root } = entry;
    const identity = await this.identityOf(root.rootPath);
    if (!identity) {
      this.becomeMissing(entry);
      return;
    }
    entry.identity = identity;
    const generation = ++entry.generation;
    const ancestorsOfKindDirs = new Set<string>([path.resolve(root.rootPath)]);
    for (const kindDir of Object.values(root.kindDirs)) {
      for (let current = path.dirname(path.resolve(kindDir)); ; current = path.dirname(current)) {
        ancestorsOfKindDirs.add(current);
        if (current === path.dirname(current)) break;
      }
    }
    let watcher: DefinitionWatcher;
    try {
      watcher = this.createWatcher(Object.values(root.kindDirs), {
        ignored: (filePath, stats) => !ancestorsOfKindDirs.has(path.resolve(filePath))
          && !isWatchedDefinitionPath(root, filePath, stats ? stats.isDirectory() : undefined),
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
    watcher.on("all", (eventName, filePath) => {
      if (generation === entry.generation && !this.closed) this.handleEvent(entry, eventName, filePath);
    });
    watcher.on("error", (error) => {
      if (generation !== entry.generation || this.closed) return;
      void this.serial(() => this.checkRoot(entry, error));
    });
    this.watchPresence(entry, generation);
  }

  /** Watches the root's parent folder for the root's own entry being renamed, removed or replaced. */
  private watchPresence(entry: RootEntry, generation: number): void {
    const rootPath = path.resolve(entry.root.rootPath);
    const parent = path.dirname(rootPath);
    const rootName = path.basename(rootPath);
    if (parent === rootPath) return;
    try {
      entry.presenceWatch = this.createAncestorWatcher(parent, (entryName) => {
        if (this.closed || generation !== entry.generation) return;
        if (entryName !== null && entryName !== rootName) return;
        void this.serial(() => this.checkRoot(entry, null, "presence"));
      }, (error) => this.logger.warn(`PACKAGE_DEFINITION_PRESENCE_WATCH_FAILED:${parent}`, error));
    } catch (error) {
      this.logger.warn(`PACKAGE_DEFINITION_PRESENCE_WATCH_FAILED:${parent}`, error);
    }
  }

  private handleEvent(entry: RootEntry, eventName: string, filePath: string): void {
    const { root } = entry;
    const resolved = path.resolve(filePath);
    const kindDirs = Object.values(root.kindDirs).map((dir) => path.resolve(dir));
    if (eventName === "unlinkDir" && (resolved === path.resolve(root.rootPath) || kindDirs.includes(resolved))) {
      void this.serial(() => this.checkRoot(entry, null));
      return;
    }
    if (eventName === "addDir" && kindDirs.includes(resolved)) {
      this.options.sink.noteRootChanged(root.rootPath);
      return;
    }
    const unit = classifyDefinitionUnit(root, filePath);
    if (unit) this.options.sink.noteUnitChange(unit.subject, unit.unitId);
  }

  /**
   * A kind folder or the root went away, the root's parent changed, or the watcher failed:
   * decide the root's new state. A presence check that finds the same root changes nothing.
   */
  private async checkRoot(entry: RootEntry, error: unknown, trigger: "event" | "presence" = "event"): Promise<void> {
    if (this.entries.get(entry.root.rootPath) !== entry || entry.state === "ROOT_MISSING") return;
    const identity = await this.identityOf(entry.root.rootPath);
    if (!identity) {
      this.becomeMissing(entry);
      this.options.sink.noteRootChanged(entry.root.rootPath);
      return;
    }
    if (identity !== entry.identity) {
      await this.rearm(entry);
      return;
    }
    if (error) {
      this.logger.warn(`PACKAGE_DEFINITION_WATCH_UNAVAILABLE:${entry.root.rootPath}`, error);
      this.becomeUnavailable(entry, error);
    } else if (trigger === "presence") {
      return;
    }
    this.options.sink.noteRootChanged(entry.root.rootPath);
  }

  private becomeUnavailable(entry: RootEntry, error: unknown): void {
    entry.state = "UNAVAILABLE";
    entry.message = `${errorText(error)}. Use Reload after changing this package.`;
    entry.ready = Promise.resolve();
  }

  private becomeMissing(entry: RootEntry): void {
    this.closeWatcher(entry);
    entry.state = "ROOT_MISSING";
    entry.message = MISSING_MESSAGE;
    entry.identity = null;
    entry.ready = Promise.resolve();
    this.watchAncestor(entry);
  }

  /** Watches the nearest existing ancestor (one level) until the root path appears again. */
  private watchAncestor(entry: RootEntry): void {
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
      entry.presenceWatch = this.createAncestorWatcher(directory, onChange, (error) => {
        this.logger.warn(`PACKAGE_DEFINITION_ANCESTOR_WATCH_FAILED:${directory}`, error);
        onChange();
      });
    } catch (error) {
      this.logger.warn(`PACKAGE_DEFINITION_ANCESTOR_WATCH_FAILED:${directory}`, error);
    }
  }

  private async onAncestorChange(entry: RootEntry, watchedDirectory: string): Promise<void> {
    if (this.entries.get(entry.root.rootPath) !== entry || entry.state !== "ROOT_MISSING") return;
    if (await this.identityOf(entry.root.rootPath)) {
      this.closePresenceWatch(entry);
      await this.arm(entry);
      this.options.sink.noteRootChanged(entry.root.rootPath);
      return;
    }
    const relative = path.relative(watchedDirectory, path.resolve(entry.root.rootPath)).split(path.sep)[0]!;
    const next = path.join(watchedDirectory, relative);
    if (!fs.existsSync(watchedDirectory) || fs.existsSync(next)) this.watchAncestor(entry);
  }

  private closeWatcher(entry: RootEntry): void {
    entry.generation += 1;
    const watcher = entry.watcher;
    entry.watcher = null;
    if (watcher) void watcher.close().catch((error) => this.logger.warn("PACKAGE_DEFINITION_WATCH_CLOSE_FAILED", error));
    this.closePresenceWatch(entry);
  }

  private closePresenceWatch(entry: RootEntry): void {
    const presenceWatch = entry.presenceWatch;
    entry.presenceWatch = null;
    try { presenceWatch?.close(); } catch { /* closing is best effort */ }
  }

  private closeEntry(entry: RootEntry): void {
    this.closeWatcher(entry);
  }
}
