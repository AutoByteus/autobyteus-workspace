import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const worktree = "/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis";
const memoryDir = "/Users/normy/.autobyteus/server-data/memory";
const sourceFile = path.join(worktree, "autobyteus-server-ts/src/run-history/services/root-run-package-readiness-index.ts");
const builtFile = path.join(worktree, "autobyteus-server-ts/dist/run-history/services/root-run-package-readiness-index.js");
const digest = async (file) => createHash("sha256").update(await fs.readFile(file)).digest("hex");

const reads = { calls: 0, bytes: 0, rawTraceCalls: 0, rawTraceBytes: 0 };
const originalReadFile = fs.readFile.bind(fs);
fs.readFile = async (...args) => {
  const result = await originalReadFile(...args);
  const bytes = typeof result === "string" ? Buffer.byteLength(result) : result.byteLength;
  reads.calls += 1;
  reads.bytes += bytes;
  if (/raw_traces_(?:active|\d+)\.jsonl$/.test(String(args[0]))) {
    reads.rawTraceCalls += 1;
    reads.rawTraceBytes += bytes;
  }
  return result;
};

const module = await import(pathToFileURL(builtFile).href);
const { RootRunPackageReadinessIndex, resetRootRunPackageReadinessIndex } = module;
const stages = { listFamilyEntries: [], inspectTeam: [], inspectOrg: [] };
for (const name of Object.keys(stages)) {
  const original = RootRunPackageReadinessIndex.prototype[name];
  RootRunPackageReadinessIndex.prototype[name] = async function (...args) {
    const started = performance.now();
    try { return await original.apply(this, args); }
    finally { stages[name].push(performance.now() - started); }
  };
}
const stats = (values) => {
  const sum = values.reduce((total, value) => total + value, 0);
  return { count: values.length, totalMs: Number(sum.toFixed(3)) };
};

resetRootRunPackageReadinessIndex(memoryDir);
const index = new RootRunPackageReadinessIndex(memoryDir);
const started = performance.now();
await index.rebuild();
const durationMs = performance.now() - started;

process.stdout.write(`${JSON.stringify({
  ticket: "APP-STARTUP-LATENCY-20260918-001",
  evidenceKind: "implementation-scoped fresh-process read-only readiness observation",
  run: Number(process.env.PROBE_RUN ?? 0),
  baseRevision: "4e84b76a918253da22fd4a382c653cb47744dc6c",
  candidateSourceSha256: await digest(sourceFile),
  candidateBuiltSha256: await digest(builtFile),
  memoryRootRedacted: true,
  writesOrMutationsRequested: false,
  durationMs: Number(durationMs.toFixed(3)),
  admittedTeamCount: index.listAdmitted("agent_team").length,
  admittedOrgCount: index.listAdmitted("agent_org").length,
  diagnosticCount: index.listDiagnostics().length,
  readAggregate: {
    ...reads,
    mebibytes: Number((reads.bytes / 1024 / 1024).toFixed(3)),
    rawTraceMebibytes: Number((reads.rawTraceBytes / 1024 / 1024).toFixed(3)),
  },
  stageAggregates: Object.fromEntries(Object.entries(stages).map(([name, values]) => [name, stats(values)])),
}, null, 2)}\n`);
