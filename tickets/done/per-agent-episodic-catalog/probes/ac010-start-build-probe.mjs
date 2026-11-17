// AC-010 probe (autobyteus-493, implementation-scoped): times the episodic catalog's start pass on a copy of a memory
// folder and checks that it writes nothing outside `<memory>/episodic/`.
//
// Usage (from the worktree, after `pnpm -C autobyteus-server-ts build`):
//   node tickets/in-progress/per-agent-episodic-catalog/probes/ac010-start-build-probe.mjs <memory folder copy> <output json>
//
// The memory folder must be a copy (an APFS clone, `cp -cR`), never a live server's folder: the probe writes the
// catalogs into it. It starts no server and runs no migration: it builds the same owners a composition root builds
// (RunFolderDiscovery, WorkJournalService, EpisodicCatalog) over the folder. Task titles are not looked up (the copy
// has no Task records): every run counts as having no Task.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const [memoryArg, outputArg] = process.argv.slice(2);
if (!memoryArg || !outputArg) throw new Error("usage: ac010-start-build-probe.mjs <memory folder copy> <output json>");
const memoryDir = path.resolve(memoryArg);
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../autobyteus-server-ts/dist");
const load = (rel) => import(pathToFileURL(path.join(dist, rel)).href);

const { createEpisodicCatalog } = await load("agent-episodic-catalog/services/episodic-catalog.js");
const { EpisodicCatalogStore } = await load("agent-episodic-catalog/store/episodic-catalog-store.js");
const { WorkJournalService } = await load("agent-work-journal/services/work-journal-service.js");

/** Every file outside `episodic/`: path → size and modification time. */
const listing = async () => {
  const files = new Map();
  const walk = async (dir) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (dir === memoryDir && entry.name === "episodic") continue;
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) { const stat = await fs.stat(full); files.set(full, `${stat.size}:${stat.mtimeMs}`); }
    }
  };
  await walk(memoryDir);
  return files;
};

const passEnded = () => new Promise((resolve) => {
  const original = EpisodicCatalogStore.prototype.writeIndex;
  EpisodicCatalogStore.prototype.writeIndex = async function (markdown) {
    const written = await original.call(this, markdown);
    resolve(written);
    return written;
  };
});

const before = await listing();
const timePass = async (label) => {
  const ended = passEnded();
  const catalog = createEpisodicCatalog({ memoryDir, journals: new WorkJournalService(), tasks: { currentTaskOf: () => null } });
  const startedAt = performance.now();
  catalog.start({ taskTitles: { taskTitleOf: async () => null } });
  const startReturnedMs = performance.now() - startedAt;
  const indexWritten = await ended;
  const passMs = performance.now() - startedAt;
  await catalog.stop();
  return { label, startReturnedMs: Math.round(startReturnedMs * 10) / 10, passMs: Math.round(passMs), indexWritten };
};

const episodicDir = path.join(memoryDir, "episodic");
const catalogFiles = async () => {
  const names = (await fs.readdir(episodicDir, { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const stats = await Promise.all(names.map((name) => fs.stat(path.join(episodicDir, name, "catalog.md")).then((stat) => [name, stat.mtimeMs])));
  return new Map(stats);
};

const first = await timePass("first start (no episodic folder)");
const afterFirst = await catalogFiles();
const second = await timePass("second start (no changes)");
const afterSecond = await catalogFiles();
const rewritten = [...afterSecond].filter(([name, mtime]) => afterFirst.get(name) !== mtime).map(([name]) => name);
const after = await listing();
const changedOutside = [...new Set([...before.keys(), ...after.keys()])].filter((file) => before.get(file) !== after.get(file));

const index = await fs.readFile(path.join(episodicDir, "index.md"), "utf-8");
const rows = index.split("\n").filter((line) => line.startsWith("- "));
const runCount = rows.reduce((sum, row) => sum + Number(/ · (\d+) runs? · /.exec(row)?.[1] ?? 0), 0);
const result = {
  node: process.version, memoryDir, filesOutsideEpisodic: before.size, passes: [first, second],
  catalogs: afterSecond.size, indexRows: rows.length, catalogedRuns: runCount,
  rewrittenAtSecondStart: rewritten, changedOutsideEpisodic: changedOutside.length, changedOutsideSample: changedOutside.slice(0, 5),
};
await fs.writeFile(outputArg, `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
