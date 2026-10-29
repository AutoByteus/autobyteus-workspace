// Probe (not committed): render Work Journals for every run in the ISOLATED COPY with the real service.
import fs from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { WorkJournalService } from "../src/agent-work-journal/services/work-journal-service.js";
import { RuntimeKind } from "../src/runtime-management/runtime-kind-enum.js";

const ROOT = "/tmp/wjs-copy/memory";
const OUT = "/tmp/wjs-probe/render-stats.jsonl";
const isRunDir = (d: string) => fs.readdirSync(d).some((f) => /^raw_traces_(active|\d+)\.jsonl$/.test(f));

const teamRuntime = new Map<string, string>();
const collectTrees = (dir: string) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) collectTrees(p);
    else if (e.name === "team_run_execution_tree.json") {
      const walk = (x: any, def?: string) => {
        if (!x || typeof x !== "object") return;
        const d = x.defaultLaunchConfiguration?.runtimeKind ?? def;
        if (x.agentRunId) teamRuntime.set(x.agentRunId, x.launchConfiguration?.runtimeKind ?? d ?? "");
        for (const v of Object.values(x)) walk(v, d);
      };
      try { walk(JSON.parse(fs.readFileSync(p, "utf-8"))); } catch {}
    }
  }
};
const runtimeOf = (dir: string): RuntimeKind => {
  const id = path.basename(dir);
  let kind = "";
  try { kind = JSON.parse(fs.readFileSync(path.join(dir, "run_metadata.json"), "utf-8")).runtimeKind ?? ""; } catch {}
  kind ||= teamRuntime.get(id) ?? "";
  return (Object.values(RuntimeKind) as string[]).includes(kind) ? kind as RuntimeKind : RuntimeKind.AUTOBYTEUS;
};
const runDirs: string[] = [];
const find = (dir: string, depth: number) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "work_journal") continue;
    const p = path.join(dir, e.name);
    if (isRunDir(p)) runDirs.push(p);
    if (depth < 5) find(p, depth + 1);
  }
};

it("renders journals in the copy", async () => {
  for (const fam of ["agents", "agent_teams", "agent_orgs"]) { collectTrees(path.join(ROOT, fam)); find(path.join(ROOT, fam), 0); }
  const service = new WorkJournalService();
  fs.writeFileSync(OUT, "");
  let i = 0;
  for (const dir of runDirs) {
    const existed = fs.existsSync(path.join(dir, "work_journal"));
    const t = Date.now();
    let bytes = 0, files = 0, error: string | null = null;
    try {
      const pkg = await service.ensureCurrent({ runId: path.basename(dir), memoryDir: dir, runtimeKind: runtimeOf(dir) });
      for (const f of pkg.files) { bytes += fs.statSync(f.path).size; files++; }
    } catch (e) { error = String(e).slice(0, 120); }
    fs.appendFileSync(OUT, JSON.stringify({ dir: path.relative(ROOT, dir), existed, runtime: runtimeOf(dir), ms: Date.now() - t, bytes, files, error }) + "\n");
    if (++i % 200 === 0) console.log(i, "/", runDirs.length);
  }
});
