// API-01 (autobyteus-524, API/E2E): N `run_bash` calls at once through the built library's real `runBash`
// (the agent's entry), on the real OS. Reports failures by stderr kind and the per-call latency distribution,
// with the machine's load average before and after. AC-001 / QR-001 / K-1.
// Usage: node API-01-burst-latency-probe.mjs <root> <N>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [root, n = '60'] = process.argv.slice(2);
const { runBash } = await import(pathToFileURL(path.join(root, 'autobyteus-ts/dist/tools/terminal/tools/run-bash.js')).href);
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'run-bash-burst-'));
const loadBefore = os.loadavg().map((v) => Math.round(v));
const t0 = Date.now();
const results = await Promise.all(Array.from({ length: Number(n) }, async (_, i) => {
  const s = Date.now();
  const r = await runBash({ workspaceRootPath: workspace }, `printf ok-${i}`, workspace);
  return { i, ms: Date.now() - s, exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr.trim().slice(0, 160) };
}));
fs.rmSync(workspace, { recursive: true, force: true });
const failed = results.filter((r) => r.exitCode !== 0 || r.stdout !== `ok-${r.i}`);
const kinds = {}; for (const r of failed) kinds[r.stderr] = (kinds[r.stderr] ?? 0) + 1;
const ms = results.filter((r) => !failed.includes(r)).map((r) => r.ms).sort((a, b) => a - b);
const pct = (p) => ms.length ? ms[Math.min(ms.length - 1, Math.floor(p * ms.length))] : null;
console.log(JSON.stringify({ calls: results.length, failed: failed.length, totalMs: Date.now() - t0, loadBefore,
  loadAfter: os.loadavg().map((v) => Math.round(v)), okMs: { p50: pct(0.5), p95: pct(0.95), max: ms.at(-1) ?? null }, failureKinds: kinds }));
process.exit(0);
