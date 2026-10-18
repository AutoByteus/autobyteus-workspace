// Usage: node main.mjs <depsDir> <modelDir> <dataDir>
import { Worker } from "node:worker_threads"; import fs from "node:fs"; import path from "node:path";
const [depsDir, modelDir, dataDir] = process.argv.slice(2);
const texts = [];
for (const p of fs.readdirSync(path.join(dataDir, "projects"))) { const td = path.join(dataDir, "projects", p, "tasks"); if (!fs.existsSync(td)) continue;
  for (const t of fs.readdirSync(td)) { const f = path.join(td, t, "task.json"); try { texts.push(JSON.parse(fs.readFileSync(f, "utf8")).description); } catch {} } }
const sample = texts.slice(0, 60);
for (const threads of [1, 4]) {
  const r = await new Promise((res, rej) => { const w = new Worker(new URL("./embed-worker.mjs", import.meta.url), { workerData: { depsDir, modelDir, threads, texts: sample } }); w.once("message", (m) => { res(m); w.terminate(); }); w.once("error", rej); });
  console.log(JSON.stringify(r));
}
