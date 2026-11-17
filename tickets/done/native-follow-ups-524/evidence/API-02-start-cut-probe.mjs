// API-02 (autobyteus-524, API/E2E): starts cut short through the real `runBash`, while a burst of B other calls makes
// starts slow (SCN-A1, SCN-A2): (a) K calls with timeout_seconds T: a start that misses T must say
// "Command did not start within T s"; (b) K calls aborted (the run's Stop) S ms after they begin: each must end as the
// Stop (timedOut true, stderr 'tool-abort'), never "did not start". Everything else in the burst must succeed.
// Usage: node API-02-start-cut-probe.mjs <root> [B=200] [K=10] [T=2] [S=1500]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [root, b = '200', k = '10', t = '2', s = '1500'] = process.argv.slice(2);
const { runBash } = await import(pathToFileURL(path.join(root, 'autobyteus-ts/dist/tools/terminal/tools/run-bash.js')).href);
const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'run-bash-cut-'));
const ctx = { workspaceRootPath: ws };
const loadBefore = os.loadavg().map((v) => Math.round(v));
const summarize = (r, ms) => ({ ms, exitCode: r.exitCode, timedOut: r.timedOut, stdout: r.stdout, stderr: r.stderr.trim().slice(0, 140) });
const burst = Array.from({ length: Number(b) }, async (_, i) => { const st = Date.now(); const r = await runBash(ctx, `printf ok-${i}`, ws); return { ok: r.exitCode === 0 && r.stdout === `ok-${i}`, ...summarize(r, Date.now() - st) }; });
const short = Array.from({ length: Number(k) }, async (_, i) => { const st = Date.now(); const r = await runBash(ctx, `printf short-${i}`, ws, Number(t)); return { i, ...summarize(r, Date.now() - st) }; });
const aborted = Array.from({ length: Number(k) }, async (_, i) => {
  const c = new AbortController(); setTimeout(() => c.abort(), Number(s)); const st = Date.now();
  const r = await runBash(ctx, `printf stop-${i}; sleep 5`, ws, 30, false, { signal: c.signal }); return { i, ...summarize(r, Date.now() - st) };
});
const [burstR, shortR, abortR] = await Promise.all([Promise.all(burst), Promise.all(short), Promise.all(aborted)]);
fs.rmSync(ws, { recursive: true, force: true });
const kinds = (rows) => { const o = {}; for (const r of rows) { const key = r.exitCode === 0 ? 'exit 0' : r.stderr || `exit ${r.exitCode}`; o[key] = (o[key] ?? 0) + 1; } return o; };
console.log(JSON.stringify({ loadBefore, loadAfter: os.loadavg().map((v) => Math.round(v)),
  burst: { calls: burstR.length, failed: burstR.filter((r) => !r.ok).length, maxMs: Math.max(...burstR.map((r) => r.ms)) },
  shortTimeout: { T: Number(t), outcomes: kinds(shortR), didNotStartWithinT: shortR.filter((r) => r.stderr.includes(`did not start within ${t} s`)).length, maxMs: Math.max(...shortR.map((r) => r.ms)) },
  stopDuringStart: { afterMs: Number(s), outcomes: kinds(abortR), endedAsStop: abortR.filter((r) => r.timedOut && /tool-abort/.test(r.stderr)).length,
    saidDidNotStart: abortR.filter((r) => /did not start/.test(r.stderr)).length, maxMs: Math.max(...abortR.map((r) => r.ms)), sample: abortR.slice(0, 2) } }));
process.exit(0);
