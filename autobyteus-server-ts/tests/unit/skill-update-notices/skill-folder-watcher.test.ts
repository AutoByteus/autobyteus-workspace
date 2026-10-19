import { readdirSync } from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SKILL_SETTLE_CAP_MS,
  DEFAULT_SKILL_SETTLE_QUIET_MS,
  SkillFolderWatcher,
  type SkillFolderWatchFactory,
} from "../../../src/skill-update-notices/monitor/skill-folder-watcher.js";

type FakeWatch = {
  dir: string;
  ignored: (filePath: string, stats?: { isDirectory(): boolean }) => boolean;
  close: ReturnType<typeof vi.fn>;
  emit(filePath: string): void;
};

/** A fake per-folder watch factory: records each folder's watch and lets the test emit file events. */
const createFakeWatches = () => {
  const created: FakeWatch[] = [];
  const factory: SkillFolderWatchFactory = (dir, options) => {
    let listener: ((eventName: string, filePath: string) => void) | null = null;
    const watch: FakeWatch & { on(event: string, next: (...args: never[]) => void): unknown } = {
      dir,
      ignored: options.ignored as FakeWatch["ignored"],
      close: vi.fn(async () => undefined),
      emit(filePath: string) { listener?.("change", filePath); },
      on(event: string, next: (...args: never[]) => void) {
        if (event === "all") listener = next as typeof listener;
        return watch;
      },
    };
    created.push(watch);
    return watch as never;
  };
  /** The open (not closed) watch of a folder. */
  const of = (dir: string) => created.find((watch) => watch.dir === dir && watch.close.mock.calls.length === 0)!;
  return { factory, created, of };
};

/** Open file descriptors of this process (macOS: one per watched file or folder; Linux: one inotify fd). */
const openDescriptors = (): number | null => {
  const dir = process.platform === "linux" ? "/proc/self/fd" : process.platform === "darwin" ? "/dev/fd" : null;
  return dir ? readdirSync(dir).length : null;
};

const tempDirs: string[] = [];
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

const write = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
};

describe("SkillFolderWatcher", () => {
  it("uses 1000 ms quiet and 3000 ms cap by default", () => {
    expect(DEFAULT_SKILL_SETTLE_QUIET_MS).toBe(1000);
    expect(DEFAULT_SKILL_SETTLE_CAP_MS).toBe(3000);
  });

  it("reports a burst of writes once after the quiet period, by skill folder", async () => {
    vi.useFakeTimers();
    const watches = createFakeWatches();
    const watcher = new SkillFolderWatcher({ createWatch: watches.factory });
    const settled = vi.fn();
    watcher.onSettledChange(settled);
    watcher.syncWatchedFolders(["/skills/code-review", "/skills/deep-research"]);

    watches.of("/skills/code-review").emit("/skills/code-review/SKILL.md");
    await vi.advanceTimersByTimeAsync(600);
    watches.of("/skills/code-review").emit("/skills/code-review/references/a.md");
    watches.of("/skills/deep-research").emit("/skills/deep-research/SKILL.md");
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(settled).toHaveBeenCalledOnce();
    expect(settled).toHaveBeenCalledWith(["/skills/code-review", "/skills/deep-research"]);
    await watcher.close();
  });

  it("caps a continuous burst at 3000 ms from its first change", async () => {
    vi.useFakeTimers();
    const watches = createFakeWatches();
    const watcher = new SkillFolderWatcher({ createWatch: watches.factory });
    const settled = vi.fn();
    watcher.onSettledChange(settled);
    watcher.syncWatchedFolders(["/skills/code-review"]);

    for (let elapsed = 0; elapsed < 3000; elapsed += 500) {
      watches.of("/skills/code-review").emit("/skills/code-review/SKILL.md");
      await vi.advanceTimersByTimeAsync(500);
    }

    expect(settled).toHaveBeenCalledOnce();
    await watcher.close();
  });

  it("watches each listed folder with its own watch and closes it as soon as the folder is no longer listed (CR-005)", async () => {
    vi.useFakeTimers();
    const watches = createFakeWatches();
    const watcher = new SkillFolderWatcher({ createWatch: watches.factory });
    const settled = vi.fn();
    watcher.onSettledChange(settled);

    watcher.syncWatchedFolders([]);
    expect(watches.created).toHaveLength(0); // nothing used, nothing watched
    watcher.syncWatchedFolders(["/skills/a", "/skills/b"]);
    const watchA = watches.of("/skills/a");
    const watchB = watches.of("/skills/b");
    watcher.syncWatchedFolders(["/skills/b", "/skills/c"]);
    expect(watcher.watchedFolders()).toEqual(["/skills/b", "/skills/c"]);
    expect(watches.created.map((watch) => watch.dir)).toEqual(["/skills/a", "/skills/b", "/skills/c"]);
    expect(watchA.close).toHaveBeenCalledOnce(); // released, not merely muted
    expect(watchB.close).not.toHaveBeenCalled(); // still used: kept, no watch gap

    // A pending change of a released folder is dropped; one of a folder still used is reported.
    watchB.emit("/skills/b/SKILL.md");
    watchA.emit("/skills/a/SKILL.md");
    await vi.advanceTimersByTimeAsync(1000);
    expect(settled).toHaveBeenCalledWith(["/skills/b"]);

    // Watched again later: a new watch.
    watcher.syncWatchedFolders(["/skills/a", "/skills/b", "/skills/c"]);
    expect(watches.created.filter((watch) => watch.dir === "/skills/a")).toHaveLength(2);
    await watcher.close();
    for (const watch of watches.created) expect(watch.close).toHaveBeenCalledOnce();
  });

  it("ignores noise inside a folder and paths outside every watched folder", async () => {
    vi.useFakeTimers();
    const watches = createFakeWatches();
    const watcher = new SkillFolderWatcher({ createWatch: watches.factory });
    const settled = vi.fn();
    watcher.onSettledChange(settled);
    watcher.syncWatchedFolders(["/skills/b"]);
    const { ignored } = watches.of("/skills/b");

    const dir = { isDirectory: () => true };
    const file = { isDirectory: () => false };
    expect(ignored("/skills/b/node_modules", dir)).toBe(true);
    expect(ignored("/skills/b/.git", dir)).toBe(true);
    expect(ignored("/skills/b/notes.md.swp", file)).toBe(true);
    expect(ignored("/skills/b/SKILL.md", file)).toBe(false);
    expect(ignored("/skills", dir)).toBe(false);

    watches.of("/skills/b").emit("/elsewhere/file.md");
    await vi.advanceTimersByTimeAsync(5000);
    expect(settled).not.toHaveBeenCalled();
    await watcher.close();
  });

  it("reports changes in a real skill folder, and a deleted folder as that folder", async () => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-watcher-")));
    tempDirs.push(root);
    const skillDir = path.join(root, "code-review");
    await fs.mkdir(path.join(skillDir, "node_modules"), { recursive: true });
    await fs.writeFile(path.join(skillDir, "SKILL.md"), "v1");
    const watcher = new SkillFolderWatcher({ settleQuietMs: 150, settleCapMs: 600 });
    const settled = vi.fn();
    watcher.onSettledChange(settled);
    watcher.syncWatchedFolders([skillDir]);
    // chokidar ready; macOS FSEvents may still report the pre-watch write once (harmless in
    // production: the digest diff finds nothing new), so drain it first.
    await new Promise((resolve) => setTimeout(resolve, 700));
    settled.mockClear();

    await fs.writeFile(path.join(skillDir, "node_modules", "x.js"), "noise");
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(settled).not.toHaveBeenCalled();

    await fs.writeFile(path.join(skillDir, "SKILL.md"), "v2");
    await vi.waitFor(() => expect(settled).toHaveBeenCalledWith([skillDir]), { timeout: 3000 });

    settled.mockClear();
    await fs.rm(skillDir, { recursive: true, force: true });
    await vi.waitFor(() => expect(settled).toHaveBeenCalledWith([skillDir]), { timeout: 3000 });
    await watcher.close();
  });

  it("releases a folder's OS handles when no run uses it any more, and still reports changes once it is watched again (CR-005)", async () => {
    const root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "skill-watcher-release-")));
    tempDirs.push(root);
    const released = path.join(root, "released");
    const kept = path.join(root, "kept");
    for (const dir of [released, kept]) {
      await write(path.join(dir, "SKILL.md"), "v1");
      for (let index = 0; index < 20; index += 1) await write(path.join(dir, "references", `r${index}.md`), "r");
    }
    const watcher = new SkillFolderWatcher({ settleQuietMs: 150, settleCapMs: 600 });
    const settled = vi.fn();
    watcher.onSettledChange(settled);
    const baseline = openDescriptors();
    watcher.syncWatchedFolders([released, kept]);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const watchingBoth = openDescriptors();

    watcher.syncWatchedFolders([kept]);
    await new Promise((resolve) => setTimeout(resolve, 500));
    const watchingKept = openDescriptors();
    if (process.platform === "darwin" && baseline !== null) {
      // macOS: one handle per watched file and folder (22 per skill folder here).
      expect(watchingBoth! - baseline).toBeGreaterThanOrEqual(40);
      expect(watchingBoth! - watchingKept!).toBeGreaterThanOrEqual(20);
    }
    settled.mockClear();

    // The folder still used never stopped being watched.
    await fs.writeFile(path.join(kept, "SKILL.md"), "v2");
    await vi.waitFor(() => expect(settled).toHaveBeenCalledWith([kept]), { timeout: 3000 });

    // Watched again: changes are reported again.
    watcher.syncWatchedFolders([released, kept]);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    settled.mockClear();
    await fs.writeFile(path.join(released, "references", "r3.md"), "r3");
    await vi.waitFor(() => expect(settled).toHaveBeenCalledWith([released]), { timeout: 3000 });

    watcher.syncWatchedFolders([]);
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (process.platform === "darwin" && baseline !== null) expect(openDescriptors()).toBeLessThanOrEqual(baseline);
    await watcher.close();
  });
});
