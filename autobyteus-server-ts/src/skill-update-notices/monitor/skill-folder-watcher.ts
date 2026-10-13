import path from "node:path";
import type fs from "node:fs";
import chokidar from "chokidar";
import { SkillFolderIgnore } from "../providers/skill-folder-ignore.js";

export const DEFAULT_SKILL_SETTLE_QUIET_MS = 1000;
export const DEFAULT_SKILL_SETTLE_CAP_MS = 3000;

export type SkillFolderWatch = {
  on(event: "all", listener: (eventName: string, filePath: string) => void): unknown;
  on(event: "error", listener: (error: unknown) => void): unknown;
  add(paths: string | readonly string[]): unknown;
  unwatch(paths: string | readonly string[]): unknown;
  close(): Promise<void>;
};

export type SkillFolderWatchFactory = (
  options: { ignored: (filePath: string, stats?: fs.Stats) => boolean },
) => SkillFolderWatch;

const defaultWatchFactory: SkillFolderWatchFactory = (options) =>
  chokidar.watch([], { ignoreInitial: true, persistent: true, ignored: options.ignored }) as unknown as SkillFolderWatch;

type SettledListener = (skillDirs: readonly string[]) => void;

/**
 * Watches the folders of the skills used by current runs (only those, no polling) and reports
 * the folders that changed once writes settle: 1000 ms of quiet, capped at 3000 ms from the first
 * change of a burst. Noise (REQ-010) is never watched. A deleted skill folder is reported as its
 * folder. Handles are released when a folder is no longer used.
 */
export class SkillFolderWatcher {
  private readonly quietMs: number;
  private readonly capMs: number;
  private readonly createWatch: SkillFolderWatchFactory;
  private readonly logger: Pick<Console, "warn">;
  private watch: SkillFolderWatch | null = null;
  private readonly watched = new Map<string, SkillFolderIgnore>();
  private readonly pending = new Set<string>();
  private readonly listeners = new Set<SettledListener>();
  private timer: NodeJS.Timeout | null = null;
  private firstPendingAt: number | null = null;
  private closed = false;

  constructor(options: Readonly<{
    settleQuietMs?: number;
    settleCapMs?: number;
    createWatch?: SkillFolderWatchFactory;
    logger?: Pick<Console, "warn">;
  }> = {}) {
    this.quietMs = options.settleQuietMs ?? DEFAULT_SKILL_SETTLE_QUIET_MS;
    this.capMs = Math.max(options.settleCapMs ?? DEFAULT_SKILL_SETTLE_CAP_MS, this.quietMs);
    this.createWatch = options.createWatch ?? defaultWatchFactory;
    this.logger = options.logger ?? console;
  }

  onSettledChange(listener: SettledListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /** The skill folders currently watched. */
  watchedFolders(): string[] {
    return [...this.watched.keys()].sort();
  }

  /** Watches exactly these skill folders: starts new ones, releases the ones no longer listed. */
  syncWatchedFolders(skillDirs: Iterable<string>): void {
    if (this.closed) return;
    const wanted = new Set([...skillDirs].map((dir) => path.resolve(dir)));
    const removed = [...this.watched.keys()].filter((dir) => !wanted.has(dir));
    const added = [...wanted].filter((dir) => !this.watched.has(dir));
    for (const dir of removed) this.watched.delete(dir);
    for (const dir of added) this.watched.set(dir, new SkillFolderIgnore(dir));
    if (removed.length > 0) this.watch?.unwatch(removed);
    if (added.length === 0) return;
    try {
      this.ensureWatch().add(added);
    } catch (error) {
      this.logger.warn("SKILL_FOLDER_WATCH_FAILED", error);
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
    this.listeners.clear();
    this.watched.clear();
    const watch = this.watch;
    this.watch = null;
    await watch?.close();
  }

  private ensureWatch(): SkillFolderWatch {
    if (this.watch) return this.watch;
    const watch = this.createWatch({
      ignored: (filePath, stats) => {
        const owner = this.owningFolder(filePath);
        return owner ? this.watched.get(owner)!.ignores(filePath, stats?.isDirectory() ?? false) : false;
      },
    });
    watch.on("all", (_eventName, filePath) => this.noteChange(filePath));
    watch.on("error", (error) => this.logger.warn("SKILL_FOLDER_WATCH_ERROR", error));
    this.watch = watch;
    return watch;
  }

  /** The watched skill folder a path belongs to (the deepest one, if folders nest). */
  private owningFolder(filePath: string): string | null {
    const resolved = path.resolve(filePath);
    let owner: string | null = null;
    for (const dir of this.watched.keys()) {
      if (resolved === dir || resolved.startsWith(`${dir}${path.sep}`)) {
        if (!owner || dir.length > owner.length) owner = dir;
      }
    }
    return owner;
  }

  private noteChange(filePath: string): void {
    if (this.closed) return;
    const owner = this.owningFolder(filePath);
    if (!owner) return;
    this.pending.add(owner);
    const now = Date.now();
    this.firstPendingAt ??= now;
    if (this.timer) clearTimeout(this.timer);
    const delay = Math.max(0, Math.min(this.quietMs, this.firstPendingAt + this.capMs - now));
    this.timer = setTimeout(() => this.flush(), delay);
    this.timer.unref?.();
  }

  private flush(): void {
    this.timer = null;
    this.firstPendingAt = null;
    const dirs = [...this.pending].sort();
    this.pending.clear();
    if (dirs.length === 0 || this.closed) return;
    for (const listener of this.listeners) {
      try {
        listener(dirs);
      } catch (error) {
        this.logger.warn("SKILL_FOLDER_CHANGE_LISTENER_FAILED", error);
      }
    }
  }
}
