import { it, expect } from "vitest";
import chokidar from "chokidar";
import fs from "node:fs/promises";
import path from "node:path";

const DEF_FILES = new Set(["agent.md", "agent-config.json", "team.md", "team-config.json", "org.md", "org-config.json"]);
const IGNORED_DIRS = new Set(["skills", ".git", "node_modules"]);
const ignored = (p: string, stats?: import("node:fs").Stats) => {
  const base = path.basename(p);
  if (IGNORED_DIRS.has(base)) return true;
  if (stats?.isFile()) return !DEF_FILES.has(base);
  return false;
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

it("probe chokidar scope, latency and missing roots", async () => {
  const root = "/tmp/apar-probe-data/pkg";
  const out: Record<string, unknown> = {};
  const events: Array<{ t: number; e: string; p: string }> = [];
  const t0 = Date.now();
  const w = chokidar.watch(["agents", "agent-teams", "agent-orgs", "missing-kind"].map((k) => path.join(root, k)), { ignoreInitial: true, ignored, awaitWriteFinish: false });
  w.on("all", (e, p) => events.push({ t: Date.now(), e, p: path.relative(root, p) }));
  await new Promise<void>((r) => w.on("ready", () => r()));
  out.readyMs = Date.now() - t0;
  const watched = w.getWatched();
  out.watchedDirs = Object.keys(watched).length;
  out.watchedEntries = Object.values(watched).reduce((n, v) => n + v.length, 0);
  out.skillsDirsWatched = Object.keys(watched).filter((d) => d.includes(`${path.sep}skills`)).length;
  // create agent
  let s = Date.now();
  await fs.mkdir(path.join(root, "agents", "probe-new"));
  await fs.writeFile(path.join(root, "agents", "probe-new", "agent.md"), "---\nname: x\ndescription: y\n---\n");
  await fs.writeFile(path.join(root, "agents", "probe-new", "agent-config.json"), "{}");
  await sleep(600);
  out.createEvents = events.splice(0).map((x) => `${x.t - s}ms ${x.e} ${x.p}`);
  // skill content edit inside an agent
  const anySkill = (await fs.readdir(path.join(root, "agents"), { withFileTypes: true })).map((d) => path.join(root, "agents", d.name, "skills")).find((d) => require("node:fs").existsSync(d));
  if (anySkill) { await fs.writeFile(path.join(anySkill, "probe.txt"), "x"); await fs.mkdir(path.join(anySkill, "probe-skill")); await fs.writeFile(path.join(anySkill, "probe-skill", "SKILL.md"), "x"); }
  await sleep(600);
  out.skillEditEvents = events.splice(0).map((x) => `${x.e} ${x.p}`);
  if (anySkill) { await fs.rm(path.join(anySkill, "probe.txt")); await fs.rm(path.join(anySkill, "probe-skill"), { recursive: true }); }
  await sleep(300); events.splice(0);
  // non-definition file
  await fs.writeFile(path.join(root, "agents", "probe-new", "notes.md"), "x");
  await sleep(500);
  out.nonDefinitionFileEvents = events.splice(0).map((x) => `${x.e} ${x.p}`);
  // edit
  s = Date.now();
  await fs.writeFile(path.join(root, "agents", "probe-new", "agent.md"), "---\nname: x2\ndescription: y\n---\n");
  await sleep(500);
  out.editEvents = events.splice(0).map((x) => `${x.t - s}ms ${x.e} ${x.p}`);
  // delete folder
  await fs.rm(path.join(root, "agents", "probe-new"), { recursive: true });
  await sleep(600);
  out.deleteEvents = events.splice(0).map((x) => `${x.e} ${x.p}`);
  // missing kind folder created later
  await fs.mkdir(path.join(root, "missing-kind", "a"), { recursive: true });
  await fs.writeFile(path.join(root, "missing-kind", "a", "agent.md"), "x");
  await sleep(800);
  out.missingThenCreatedEvents = events.splice(0).map((x) => `${x.e} ${x.p}`);
  // remove whole kind dir and recreate
  await fs.rm(path.join(root, "missing-kind"), { recursive: true });
  await sleep(500);
  out.kindDirRemovedEvents = events.splice(0).map((x) => `${x.e} ${x.p}`);
  await fs.mkdir(path.join(root, "missing-kind", "b"), { recursive: true });
  await fs.writeFile(path.join(root, "missing-kind", "b", "agent.md"), "x");
  await sleep(800);
  out.kindDirRecreatedEvents = events.splice(0).map((x) => `${x.e} ${x.p}`);
  await fs.rm(path.join(root, "missing-kind"), { recursive: true, force: true });
  await w.close();
  console.log("APAR_WATCH_RESULT", JSON.stringify(out, null, 2));
  expect(true).toBe(true);
}, 30000);
