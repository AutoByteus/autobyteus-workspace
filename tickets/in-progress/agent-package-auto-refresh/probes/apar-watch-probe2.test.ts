import { it, expect } from "vitest";
import chokidar from "chokidar";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
const DEF_FILES = new Set(["agent.md", "agent-config.json", "team.md", "team-config.json", "org.md", "org-config.json"]);
const ignored = (p: string, stats?: import("node:fs").Stats) => {
  const base = path.basename(p);
  if (["skills", ".git", "node_modules"].includes(base)) return true;
  if (stats?.isFile()) return !DEF_FILES.has(base);
  return false;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const fdCount = () => Number(execSync(`lsof -p ${process.pid} 2>/dev/null | wc -l`).toString().trim());
it("missing root and fd cost", async () => {
  const out: Record<string, unknown> = {};
  const events: string[] = [];
  const missingRoot = "/tmp/apar-probe-data/missing-root/deeper";
  await fs.rm("/tmp/apar-probe-data/missing-root", { recursive: true, force: true });
  const before = fdCount();
  const w = chokidar.watch([
    ...["agents", "agent-teams", "agent-orgs"].map((k) => path.join("/tmp/apar-probe-data/pkg", k)),
    ...["agents", "agent-teams", "agent-orgs"].map((k) => path.join(missingRoot, k)),
  ], { ignoreInitial: true, ignored });
  w.on("all", (e, p) => events.push(`${e} ${p.replace("/tmp/apar-probe-data/", "")}`));
  w.on("error", (e) => events.push(`error ${String(e)}`));
  await new Promise<void>((r) => w.on("ready", () => r()));
  out.fdBefore = before; out.fdAfterReady = fdCount();
  out.watchedDirs = Object.keys(w.getWatched()).length;
  await fs.mkdir(path.join(missingRoot, "agents", "x"), { recursive: true });
  await fs.writeFile(path.join(missingRoot, "agents", "x", "agent.md"), "x");
  await sleep(1500);
  out.missingRootCreatedEvents = events.splice(0);
  await fs.writeFile("/tmp/apar-probe-data/pkg/agents/apar-x.tmp", "x"); await fs.mkdir("/tmp/apar-probe-data/pkg/agents/apar-y"); await fs.writeFile("/tmp/apar-probe-data/pkg/agents/apar-y/agent.md", "x");
  await sleep(800);
  out.existingPkgEventsWhileMissingRootWatched = events.splice(0);
  await fs.rm("/tmp/apar-probe-data/pkg/agents/apar-y", { recursive: true }); await fs.rm("/tmp/apar-probe-data/pkg/agents/apar-x.tmp");
  // separate watcher for a missing root only, nearest ancestor existing one level up
  await fs.rm("/tmp/apar-probe-data/missing-root", { recursive: true, force: true });
  await fs.mkdir("/tmp/apar-probe-data/missing-root");
  const w2 = chokidar.watch(path.join("/tmp/apar-probe-data/missing-root/pkg2", "agents"), { ignoreInitial: true, ignored });
  const ev2: string[] = []; w2.on("all", (e, p) => ev2.push(`${e} ${p.replace("/tmp/apar-probe-data/", "")}`));
  await new Promise<void>((r) => w2.on("ready", () => r()));
  await fs.mkdir("/tmp/apar-probe-data/missing-root/pkg2/agents/z", { recursive: true }); await fs.writeFile("/tmp/apar-probe-data/missing-root/pkg2/agents/z/agent.md", "x");
  await sleep(1200);
  out.rootMissingOneLevelThenCreated = ev2.splice(0);
  await w2.close();
  await w.close();
  out.fdAfterClose = fdCount();
  await fs.rm("/tmp/apar-probe-data/missing-root", { recursive: true, force: true });
  console.log("APAR_WATCH2_RESULT", JSON.stringify(out, null, 2));
  expect(true).toBe(true);
}, 30000);
