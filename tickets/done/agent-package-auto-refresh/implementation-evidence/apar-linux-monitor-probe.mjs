// Linux probe for the package definition monitor (AC-012 sequences and QR-002 watch count).
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const dist = process.argv[2];
const { PackageDefinitionMonitor } = await import(path.join(dist, "definition-catalog/monitor/package-definition-monitor.js"));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rootAt = (rootPath) => ({ rootPath, sourceClass: "external_read_only", kindDirs: {
  agents: path.join(rootPath, "agents"), "agent-teams": path.join(rootPath, "agent-teams"), "agent-orgs": path.join(rootPath, "agent-orgs") } });
const waitFor = async (pred, ms = 5000) => { const s = Date.now(); while (!pred()) { if (Date.now() - s > ms) return false; await sleep(25); } return Date.now() - s; };
const inotifyWatchCount = () => {
  let total = 0;
  for (const fd of fs.readdirSync("/proc/self/fd")) {
    try { if (!fs.readlinkSync(`/proc/self/fd/${fd}`).includes("inotify")) continue; } catch { continue; }
    total += fs.readFileSync(`/proc/self/fdinfo/${fd}`, "utf8").split("\n").filter((l) => l.startsWith("inotify wd:")).length;
  }
  return total;
};
const results = {};
const base = await fsp.mkdtemp(path.join(os.tmpdir(), "apar-linux-"));
const units = [], roots = [];
const sink = { noteUnitChange: (s, u) => units.push(`${s}:${u}`), noteRootChanged: (r) => roots.push(r) };

// AC-012 (1): rename away -> ROOT_MISSING, restore -> WATCHING, edits resume.
{
  const rootPath = path.join(base, "pkg"), moved = path.join(base, "pkg-moved");
  await fsp.mkdir(path.join(rootPath, "agents", "a"), { recursive: true });
  const m = new PackageDefinitionMonitor({ sink });
  await m.syncRoots([rootAt(rootPath)]); await m.whenReady(); await sleep(300);
  await fsp.rename(rootPath, moved);
  const missingMs = await waitFor(() => m.getRootWatchStatus(rootPath)?.state === "ROOT_MISSING");
  await fsp.rename(moved, rootPath);
  const watchingMs = await waitFor(() => m.getRootWatchStatus(rootPath)?.state === "WATCHING");
  await m.whenReady(); await sleep(300); units.length = 0;
  await fsp.writeFile(path.join(rootPath, "agents", "a", "agent.md"), "x");
  const eventMs = await waitFor(() => units.includes("agent:a"));
  results.renameAwayRestore = { missingMs, watchingMs, eventAfterRestoreMs: eventMs };
  await m.close();
}
// AC-012 (2): rename swap (GitHub Update) -> re-armed by the reload's syncRoots identity check.
{
  const rootPath = path.join(base, "gh"), staged = path.join(base, "gh-staged");
  await fsp.mkdir(path.join(rootPath, "agents"), { recursive: true });
  const m = new PackageDefinitionMonitor({ sink });
  await m.syncRoots([rootAt(rootPath)]); await m.whenReady(); await sleep(300);
  await fsp.mkdir(path.join(staged, "agents", "b"), { recursive: true });
  await fsp.rename(rootPath, path.join(base, "gh-backup")); await fsp.rename(staged, rootPath);
  const stateRightAfterSwap = m.getRootWatchStatus(rootPath)?.state;
  await m.syncRoots([rootAt(rootPath)]);
  const watchingMs = await waitFor(() => m.getRootWatchStatus(rootPath)?.state === "WATCHING");
  await m.whenReady(); await sleep(300); units.length = 0;
  await fsp.writeFile(path.join(rootPath, "agents", "b", "agent.md"), "x");
  const eventMs = await waitFor(() => units.includes("agent:b"));
  // An event written to the moved-away backup must not be reported for the root.
  units.length = 0;
  await fsp.mkdir(path.join(base, "gh-backup", "agents", "ghost"), { recursive: true });
  await fsp.writeFile(path.join(base, "gh-backup", "agents", "ghost", "agent.md"), "x");
  await sleep(500);
  results.renameSwap = { stateRightAfterSwap, watchingMs, eventAfterSwapMs: eventMs, backupEventsReported: units.length };
  await m.close();
}
// QR-002: inotify watches for copies of the user's real packages (definition structure only).
{
  const copies = [];
  for (const source of process.argv.slice(3)) {
    const target = path.join(base, "real", path.basename(source));
    for (const kind of ["agents", "agent-teams", "agent-orgs"]) {
      if (fs.existsSync(path.join(source, kind))) await fsp.cp(path.join(source, kind), path.join(target, kind), { recursive: true });
    }
    copies.push(target);
  }
  const before = inotifyWatchCount();
  const m = new PackageDefinitionMonitor({ sink });
  const t0 = Date.now();
  await m.syncRoots(copies.map(rootAt)); await m.whenReady();
  const readyMs = Date.now() - t0;
  const dirs = (dir) => { let n = 0; for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) n += 1 + dirs(path.join(dir, e.name)); return n; };
  results.watchCount = { roots: copies.length, inotifyWatches: inotifyWatchCount() - before, readyMs,
    definitionTreeDirs: copies.reduce((sum, c) => sum + dirs(c), 0),
    statuses: copies.map((c) => m.getRootWatchStatus(c)?.state) };
  const c0 = Date.now(); await m.close(); results.watchCount.closeMs = Date.now() - c0;
  results.watchCount.inotifyWatchesAfterClose = inotifyWatchCount() - before;
}
console.log("APAR_LINUX_PROBE", JSON.stringify({ node: process.version, platform: process.platform, kernel: os.release(), ...results }, null, 2));
await fsp.rm(base, { recursive: true, force: true });
process.exit(0);
