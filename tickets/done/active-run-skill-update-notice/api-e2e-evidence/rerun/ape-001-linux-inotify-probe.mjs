// API/E2E temporary probe (Linux): does SkillFolderWatcher release inotify watches when a folder leaves the watch set?
// Usage: node ape-001-linux-inotify-probe.mjs <dist root>
import fs from "node:fs/promises";
import { readdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
const { SkillFolderWatcher } = await import(path.join(process.argv[2], "skill-update-notices/monitor/skill-folder-watcher.js"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** inotify watches held by this process: the "inotify wd:" lines over all inotify fds. */
const inotifyWatches = () => {
  let count = 0;
  for (const fd of readdirSync("/proc/self/fdinfo")) {
    try { count += readFileSync(`/proc/self/fdinfo/${fd}`, "utf8").split("\n").filter((l) => l.startsWith("inotify wd:")).length; } catch {}
  }
  return count;
};
const base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "apar-inotify-")));
const mk = async (name) => {
  const dir = path.join(base, name);
  await fs.mkdir(path.join(dir, "references", "deep"), { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), "---\nname: x\ndescription: d\n---\nx\n");
  for (let i = 0; i < 30; i++) await fs.writeFile(path.join(dir, "references", `r${i}.md`), `ref ${i}\n`);
  return dir;
};
const released = await mk("released");
const kept = await mk("kept");
const settled = [];
const watcher = new SkillFolderWatcher({ settleQuietMs: 200, settleCapMs: 600, logger: { warn: (...a) => console.error("warn", ...a) } });
watcher.onSettledChange((dirs) => settled.push(dirs.map((d) => path.basename(d))));
const out = { platform: `${process.platform} ${os.release()}`, node: process.version, before: inotifyWatches() };
watcher.syncWatchedFolders([released, kept]); await sleep(1500); out.watchingBoth = inotifyWatches();
watcher.syncWatchedFolders([kept]); await sleep(1500); out.watchingKept = inotifyWatches();
await fs.writeFile(path.join(kept, "SKILL.md"), "v2"); await sleep(1500); out.keptChangeReported = settled.some((d) => d.includes("kept"));
watcher.syncWatchedFolders([]); await sleep(1500); out.afterSyncEmpty = inotifyWatches();
watcher.syncWatchedFolders([released]); await sleep(1500); out.afterRewatch = inotifyWatches();
settled.length = 0;
await fs.writeFile(path.join(released, "references", "deep", "new.md"), "n"); await sleep(1500); out.rewatchedChangeReported = settled.some((d) => d.includes("released"));
watcher.syncWatchedFolders([]); await sleep(1500); out.afterSecondSyncEmpty = inotifyWatches();
await watcher.close(); await sleep(500); out.afterClose = inotifyWatches();
await fs.rm(base, { recursive: true, force: true });
console.log(JSON.stringify(out));
