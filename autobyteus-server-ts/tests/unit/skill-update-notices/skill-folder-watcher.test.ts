import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SKILL_SETTLE_CAP_MS,
  DEFAULT_SKILL_SETTLE_QUIET_MS,
  SkillFolderWatcher,
  type SkillFolderWatch,
  type SkillFolderWatchFactory,
} from "../../../src/skill-update-notices/monitor/skill-folder-watcher.js";

/** A fake watch: records add/unwatch and lets the test emit file events. */
const createFakeWatch = () => {
  const state = {
    watch: null as (SkillFolderWatch & { emit(filePath: string): void; added: string[][]; unwatched: string[][] }) | null,
    ignored: null as ((filePath: string, stats?: { isDirectory(): boolean }) => boolean) | null,
    created: 0,
  };
  const factory: SkillFolderWatchFactory = (options) => {
    state.created += 1;
    state.ignored = options.ignored as typeof state.ignored;
    let listener: ((eventName: string, filePath: string) => void) | null = null;
    const watch = {
      added: [] as string[][],
      unwatched: [] as string[][],
      on(event: string, next: (...args: never[]) => void) {
        if (event === "all") listener = next as typeof listener;
        return watch;
      },
      add(paths: string | readonly string[]) { watch.added.push([...(typeof paths === "string" ? [paths] : paths)]); },
      unwatch(paths: string | readonly string[]) { watch.unwatched.push([...(typeof paths === "string" ? [paths] : paths)]); },
      close: vi.fn(async () => undefined),
      emit(filePath: string) { listener?.("change", filePath); },
    };
    state.watch = watch as never;
    return watch as never;
  };
  return { factory, state };
};

const tempDirs: string[] = [];
afterEach(async () => {
  vi.useRealTimers();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("SkillFolderWatcher", () => {
  it("uses 1000 ms quiet and 3000 ms cap by default", () => {
    expect(DEFAULT_SKILL_SETTLE_QUIET_MS).toBe(1000);
    expect(DEFAULT_SKILL_SETTLE_CAP_MS).toBe(3000);
  });

  it("reports a burst of writes once after the quiet period, by skill folder", async () => {
    vi.useFakeTimers();
    const { factory, state } = createFakeWatch();
    const watcher = new SkillFolderWatcher({ createWatch: factory });
    const settled = vi.fn();
    watcher.onSettledChange(settled);
    watcher.syncWatchedFolders(["/skills/code-review", "/skills/deep-research"]);

    state.watch!.emit("/skills/code-review/SKILL.md");
    await vi.advanceTimersByTimeAsync(600);
    state.watch!.emit("/skills/code-review/references/a.md");
    state.watch!.emit("/skills/deep-research/SKILL.md");
    await vi.advanceTimersByTimeAsync(999);
    expect(settled).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(settled).toHaveBeenCalledOnce();
    expect(settled).toHaveBeenCalledWith(["/skills/code-review", "/skills/deep-research"]);
    await watcher.close();
  });

  it("caps a continuous burst at 3000 ms from its first change", async () => {
    vi.useFakeTimers();
    const { factory, state } = createFakeWatch();
    const watcher = new SkillFolderWatcher({ createWatch: factory });
    const settled = vi.fn();
    watcher.onSettledChange(settled);
    watcher.syncWatchedFolders(["/skills/code-review"]);

    for (let elapsed = 0; elapsed < 3000; elapsed += 500) {
      state.watch!.emit("/skills/code-review/SKILL.md");
      await vi.advanceTimersByTimeAsync(500);
    }

    expect(settled).toHaveBeenCalledOnce();
    await watcher.close();
  });

  it("watches only the listed folders, releases unlisted ones and ignores noise and foreign paths", async () => {
    vi.useFakeTimers();
    const { factory, state } = createFakeWatch();
    const watcher = new SkillFolderWatcher({ createWatch: factory });
    const settled = vi.fn();
    watcher.onSettledChange(settled);

    watcher.syncWatchedFolders([]);
    expect(state.created).toBe(0); // nothing used, nothing watched
    watcher.syncWatchedFolders(["/skills/a", "/skills/b"]);
    watcher.syncWatchedFolders(["/skills/b", "/skills/c"]);
    expect(watcher.watchedFolders()).toEqual(["/skills/b", "/skills/c"]);
    expect(state.watch!.added).toEqual([["/skills/a", "/skills/b"], ["/skills/c"]]);
    expect(state.watch!.unwatched).toEqual([["/skills/a"]]);

    const dir = { isDirectory: () => true };
    const file = { isDirectory: () => false };
    expect(state.ignored!("/skills/b/node_modules", dir)).toBe(true);
    expect(state.ignored!("/skills/b/.git", dir)).toBe(true);
    expect(state.ignored!("/skills/b/notes.md.swp", file)).toBe(true);
    expect(state.ignored!("/skills/b/SKILL.md", file)).toBe(false);
    expect(state.ignored!("/skills", dir)).toBe(false); // a parent chokidar must traverse

    state.watch!.emit("/skills/a/SKILL.md"); // released
    state.watch!.emit("/elsewhere/file.md");
    await vi.advanceTimersByTimeAsync(5000);
    expect(settled).not.toHaveBeenCalled();
    await watcher.close();
    expect(state.watch).not.toBeNull();
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
});
