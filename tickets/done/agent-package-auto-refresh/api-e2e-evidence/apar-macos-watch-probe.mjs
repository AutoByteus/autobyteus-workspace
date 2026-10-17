// API/E2E temporary probe (AC-014, QR-001, QR-002) for macOS: drives the built PackageDefinitionMonitor over
// copies of the user's two real packages and counts the live fs.watch handles it opens (chokidar 4 uses one
// fs.watch per watched directory or file), what they point at, and the process CPU while idle.
// Usage: node apar-macos-watch-probe.mjs <server dist dir> <package root>...
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import path from "node:path";

const live = new Map();
const realWatch = fs.watch;
fs.watch = function patchedWatch(target, ...rest) {
  const watcher = realWatch.call(this, target, ...rest);
  const key = Symbol(String(target));
  live.set(key, String(target));
  watcher.once("close", () => live.delete(key));
  return watcher;
};
syncBuiltinESMExports();

const dist = process.argv[2];
const roots = process.argv.slice(3);
const { PackageDefinitionMonitor } = await import(path.join(dist, "definition-catalog/monitor/package-definition-monitor.js"));
const rootAt = (rootPath) => ({ rootPath, sourceClass: "external_read_only", kindDirs: {
  agents: path.join(rootPath, "agents"), "agent-teams": path.join(rootPath, "agent-teams"), "agent-orgs": path.join(rootPath, "agent-orgs") } });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const events = [];
const monitor = new PackageDefinitionMonitor({ sink: { noteUnitChange: (s, u) => events.push(`${s}:${u}`), noteRootChanged: () => undefined } });
const t0 = Date.now();
await monitor.syncRoots(roots.map(rootAt));
await monitor.whenReady();
const readyMs = Date.now() - t0;
await sleep(1500);
const watched = [...live.values()];
const countBy = (predicate) => watched.filter(predicate).length;
const treeDirs = (dir) => { let n = 0; for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) n += 1 + treeDirs(path.join(dir, e.name)); return n; };
// Idle CPU over 30 s with the watchers armed (no polling expected).
const cpu0 = process.cpuUsage(); const wall0 = Date.now();
await sleep(30_000);
const cpu = process.cpuUsage(cpu0); const wallMs = Date.now() - wall0;
const result = {
  platform: `${process.platform} ${process.arch} node ${process.version}`,
  roots, readyMs,
  liveFsWatchHandles: watched.length,
  watchedUnderSkills: countBy((p) => p.split(path.sep).includes("skills")),
  watchedGitOrNodeModules: countBy((p) => /(^|\/)(\.git|node_modules)(\/|$)/.test(p)),
  watchedOutsideKindDirs: countBy((p) => !roots.some((r) => ["agents", "agent-teams", "agent-orgs"].some((k) => p === path.join(r, k) || p.startsWith(path.join(r, k) + path.sep))) && !roots.some((r) => p === path.dirname(r))),
  definitionTreeDirsTotal: roots.reduce((sum, r) => sum + ["agents", "agent-teams", "agent-orgs"].reduce((s, k) => s + (fs.existsSync(path.join(r, k)) ? 1 + treeDirs(path.join(r, k)) : 0), 0), 0),
  idleCpu: { userMs: Math.round(cpu.user / 1000), systemMs: Math.round(cpu.system / 1000), wallMs, percent: +(((cpu.user + cpu.system) / 1000) / wallMs * 100).toFixed(3) },
  eventsWhileIdle: events.length,
  sampleWatched: watched.slice(0, 8),
};
await monitor.close();
await sleep(200);
result.liveAfterClose = live.size;
console.log(JSON.stringify(result, null, 2));
