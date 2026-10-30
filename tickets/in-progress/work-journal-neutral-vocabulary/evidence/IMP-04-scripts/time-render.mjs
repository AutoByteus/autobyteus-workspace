// Times rendering every journal from scratch: node time-render.mjs <dist dir> <memory dir copy> [limit]
import fs from "node:fs";
import path from "node:path";
const [dist, memoryDir, limitArg] = process.argv.slice(2);
const { WorkJournalService } = await import(path.join(dist, "agent-work-journal/services/work-journal-service.js"));
const runs = [];
const walk = (dir) => {
  let entries; try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  if (entries.some((e) => e.name === "raw_traces_active.jsonl" || e.name === "raw_traces_archive")) {
    let runtimeKind = null;
    try { runtimeKind = JSON.parse(fs.readFileSync(path.join(dir, "run_metadata.json"), "utf8")).runtimeKind ?? null; } catch {}
    runs.push({ runId: path.basename(dir), memoryDir: dir, runtimeKind });
  }
  for (const e of entries) if (e.isDirectory() && e.name !== "work_journal" && e.name !== "imports" && e.name !== "raw_traces_archive") walk(path.join(dir, e.name));
};
walk(path.resolve(memoryDir));
runs.sort((a, b) => a.memoryDir.localeCompare(b.memoryDir));
const subset = limitArg ? runs.filter((_r, i) => i % Math.ceil(runs.length / Number(limitArg)) === 0) : runs;
for (const run of subset) fs.rmSync(path.join(run.memoryDir, "work_journal"), { recursive: true, force: true });
const service = new WorkJournalService();
const started = process.hrtime.bigint();
let failed = 0;
for (const run of subset) { try { await service.ensureCurrent(run); } catch { failed += 1; } }
const ms = Number(process.hrtime.bigint() - started) / 1e6;
console.log(JSON.stringify({ runs: subset.length, failed, seconds: Math.round(ms / 100) / 10 }));
