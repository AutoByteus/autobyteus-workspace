// Probe (not part of any suite). Copy to autobyteus-server-ts/tests/ in a worktree with dependencies and run:
//   SRN_MEMORY_COPY=/tmp/srn/shadow/memory SRN_OUT=/tmp/srn/isolated-report.json pnpm exec vitest run tests/zz-isolated-run.probe.test.ts --no-watch
// Runs the migration through the real runner (two stub prerequisites: the layout migrations need traces, which are not copied)
// against an isolated COPY of real manifests, and reports counts only. Touches no other data directory.
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { it, expect } from "vitest";
import { AppDataMigrationRegistry } from "../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../src/app-data-migrations/app-data-migration-runner.js";
import { RawTraceManifestRuntimeNamesMigration } from "../src/app-data-migrations/migrations/raw-trace-manifest-runtime-names/raw-trace-manifest-runtime-names-migration.js";

const copy = process.env.SRN_MEMORY_COPY!;
const out = process.env.SRN_OUT!;
const MAP: Record<string, string> = { CODEX: "codex_app_server", CLAUDE: "claude_agent_sdk", ANTIGRAVITY: "antigravity_cli", GROK_BUILD: "grok_build", AUTOBYTEUS: "autobyteus" };

const walk = async (dir: string): Promise<string[]> => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(async (e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]))).flat();
const family = (rel: string): string => rel.startsWith("imports/") ? "imports" : rel.split("/")[0]!;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

const snapshot = async () => {
  const files = (await walk(copy)).sort();
  const map = new Map<string, { text: string; mtime: number }>();
  for (const file of files) map.set(path.relative(copy, file), { text: await fs.readFile(file, "utf-8"), mtime: (await fs.stat(file)).mtimeMs });
  return map;
};
const census = (snap: Map<string, { text: string }>) => {
  const counts: Record<string, Record<string, number>> = {};
  let manifests = 0;
  for (const [rel, { text }] of snap) {
    if (!rel.endsWith("/raw_traces_manifest.json")) continue;
    manifests += 1;
    const fam = family(rel);
    for (const segment of JSON.parse(text).segments) {
      const key = String(segment.runtime_kind ?? "(none)");
      counts[fam] ??= {};
      counts[fam][key] = (counts[fam][key] ?? 0) + 1;
    }
  }
  return { manifests, counts };
};

it("converts the isolated copy of real manifests", async () => {
  const before = await snapshot();
  const stubs = ["20260617_raw_trace_rotation_layout", "20260707_raw_trace_active_file_name"].map((id) => ({
    id, displayName: id, description: id, requiredOnStartup: true,
    execute: async () => ({ status: "SUCCEEDED" as const, summary: { scannedCount: 0, migratedCount: 0, skippedCount: 0, failedCount: 0, details: [] } }),
  }));
  const records = new Map<string, any>();
  const repo = {
    getRecord: async (id: string) => records.get(id) ?? null, listRecords: async () => [...records.values()],
    markRunning: async (i: any) => { const r = { ...i, status: "RUNNING", attempts: (records.get(i.migrationId)?.attempts ?? 0) + 1, completedAt: null, summary: null, errorMessage: null, logPath: null }; records.set(i.migrationId, r); return r; },
    complete: async (i: any) => { const r = { ...records.get(i.migrationId), ...i }; records.set(i.migrationId, r); return r; },
    markFailed: async (i: any) => { const r = { ...records.get(i.migrationId), ...i, status: "FAILED" }; records.set(i.migrationId, r); return r; },
  };
  const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry([...stubs, new RawTraceManifestRuntimeNamesMigration(copy)]), repo as any, { logsDir: path.join(path.dirname(copy), "logs") });
  const started = Date.now();
  const first = (await runner.runPending()).at(-1)!;
  const seconds = (Date.now() - started) / 1000;
  const mid = await snapshot();
  // Second start: a fresh runner and record store would re-run it; the migration itself must change nothing.
  const direct = await new RawTraceManifestRuntimeNamesMigration(copy).execute();
  const after = await snapshot();

  // Expected content: the source document with only the old labels replaced.
  let expectedMismatches = 0, importsChanged = 0, otherFilesChanged = 0, ownChanged = 0, ownUnchanged = 0;
  for (const [rel, snap] of before) {
    const now = mid.get(rel)!;
    if (rel.endsWith("/raw_traces_manifest.json") && !rel.startsWith("imports/")) {
      const doc = JSON.parse(snap.text);
      for (const s of doc.segments) if (typeof s.runtime_kind === "string" && MAP[s.runtime_kind]) s.runtime_kind = MAP[s.runtime_kind];
      if (JSON.stringify(doc) !== now.text) expectedMismatches += 1;
      if (now.text !== snap.text) ownChanged += 1; else ownUnchanged += 1;
    } else if (now.text !== snap.text) { if (rel.startsWith("imports/")) importsChanged += 1; else otherFilesChanged += 1; }
  }
  const secondChanged = [...mid].filter(([rel, v]) => after.get(rel)!.text !== v.text || after.get(rel)!.mtime !== v.mtime).length;
  const leftoverTemp = [...after.keys()].filter((rel) => rel.endsWith(".tmp")).length;
  const report = {
    status: first.status, seconds, summary: first.summary, errorMessage: first.errorMessage,
    censusBefore: census(before), censusAfter: census(mid),
    filesCompared: before.size, ownManifestsChanged: ownChanged, ownManifestsUnchanged: ownUnchanged, contentDiffersFromExpected: expectedMismatches,
    importsChanged, otherFilesChanged, secondRunStatus: direct.status, secondRunMigrated: direct.summary.migratedCount, secondRunFilesChanged: secondChanged, leftoverTemp,
    importsHash: sha([...before].filter(([r]) => r.startsWith("imports/")).map(([r, v]) => r + v.text).join("")),
  };
  await fs.writeFile(out, JSON.stringify(report, null, 2));
  expect(report.contentDiffersFromExpected).toBe(0);
}, 300_000);
