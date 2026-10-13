import path from "node:path";
import type fs from "node:fs";
import chokidar from "chokidar";
import { SkillFolderIgnore } from "../providers/skill-folder-ignore.js";

export const DEFAULT_SKILL_SETTLE_QUIET_MS = 1000;
export const DEFAULT_SKILL_SETTLE_CAP_MS = 3000;

/** The watch of one skill folder. Closing it releases all of that folder's OS handles. */
export type SkillFolderWatch = {
  on(event: "all", listener: (eventName: string, filePath: string) => void): unknown;
  on(event: "error", listener: (error: unknown) => void): unknown;
  close(): Promise<void>;
};

/** Starts watching one skill folder (recursively, skipping what `ignored` returns true for). */
export type SkillFolderWatchFactory = (
  skillDir: string,
  options: { ignored: (filePath: string, stats?: fs.Stats) => boolean },
) => SkillFolderWatch;

const defaultWatchFactory: SkillFolderWatchFactory = (skillDir, options) =>
  chokidar.watch(skillDir, { ignoreInitial: true, persistent: true, ignored: options.ignored }) as unknown as SkillFolderWatch;

type SettledListener = (skillDirs: readonly string[]) => void;

type WatchedFolder = { readonly ignore: SkillFolderIgnore; readonly watch: SkillFolderWatch | null };

/**
 * Watches the folders of the skills used by current runs (only those, no polling) and reports
 * the folders that changed once writes settle: 1000 ms of quiet, capped at 3000 ms from the first
 * change of a burst. Noise (REQ-010) is never watched. A deleted skill folder is reported as its
 * folder.
 *
 * Each folder has its own watch, closed as soon as no run uses the folder, which releases exactly
 * that folder's OS handles (chokidar's `unwatch` only mutes a folder's nested watches; QR-002).
 * Folders still in use keep their watch, so they never miss a write.
 */
export class SkillFolderWatcher {
  private readonly quietMs: number;
  private readonly capMs: number;
  private readonly createWatch: SkillFolderWatchFactory;
  private readonly logger: Pick<Console, "warn">;
  private readonly watched = new Map<string, WatchedFolder>();
  private readonly closing = new Set<Promise<void>>();
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

  /** Watches exactly these skill folders: starts new ones, closes the ones no longer listed. */
  syncWatchedFolders(skillDirs: Iterable<string>): void {
    if (this.closed) return;
    const wanted = new Set([...skillDirs].map((dir) => path.resolve(dir)));
    for (const [dir, folder] of [...this.watched]) {
      if (wanted.has(dir)) continue;
      this.watched.delete(dir);
      this.pending.delete(dir);
      this.closeWatch(folder.watch);
    }
    for (const dir of wanted) {
      if (!this.watched.has(dir)) this.watched.set(dir, this.startWatch(dir));
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending.clear();
    this.listeners.clear();
    for (const folder of this.watched.values()) this.closeWatch(folder.watch);
    this.watched.clear();
    await Promise.all([...this.closing]);
  }

  private startWatch(skillDir: string): WatchedFolder {
    const ignore = new SkillFolderIgnore(skillDir);
    try {
      const watch = this.createWatch(skillDir, {
        ignored: (filePath, stats) => {
          const owner = this.owningFolder(filePath);
          return owner ? this.watched.get(owner)?.ignore.ignores(filePath, stats?.isDirectory() ?? false) ?? false
            : ignore.ignores(filePath, stats?.isDirectory() ?? false);
        },
      });
      watch.on("all", (_eventName, filePath) => this.noteChange(filePath));
      watch.on("error", (error) => this.logger.warn("SKILL_FOLDER_WATCH_ERROR", error));
      return { ignore, watch };
    } catch (error) {
      this.logger.warn("SKILL_FOLDER_WATCH_FAILED", error);
      return { ignore, watch: null };
    }
  }

  private closeWatch(watch: SkillFolderWatch | null): void {
    if (!watch) return;
    const closing = watch.close()
      .catch((error) => { this.logger.warn("SKILL_FOLDER_WATCH_CLOSE_FAILED", error); })
      .finally(() => { this.closing.delete(closing); });
    this.closing.add(closing);
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
