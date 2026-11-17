// API-01 cause probe (autobyteus-515, API/E2E; FU-003). Runs N `run_bash` calls at once through the built library
// (`runBash`, the same entry the failing tests use) and reports each call's exit code and stderr. A call whose launch
// misses NativeCommandProcessScope.start's 1500 ms deadline (anchor ready + process-group check by `ps`) returns
// exit code null, empty stdout and "Command did not start: Command control deadline exceeded" in stderr.
// Usage: node API-01-run-bash-start-deadline-probe.mjs <root> <N>
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [root, n = '40'] = process.argv.slice(2);
const { runBash } = await import(pathToFileURL(path.join(root, 'autobyteus-ts/dist/tools/terminal/tools/run-bash.js')).href);
const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'run-bash-deadline-probe-'));
const started = Date.now();
const results = await Promise.all(Array.from({ length: Number(n) }, async (_, i) => {
  const t0 = Date.now();
  const r = await runBash({ workspaceRootPath: workspace }, `printf ok-${i}`, workspace);
  return { i, ms: Date.now() - t0, exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr.trim().slice(0, 200) };
}));
fs.rmSync(workspace, { recursive: true, force: true });
const failed = results.filter((r) => r.exitCode !== 0 || r.stdout !== `ok-${r.i}`);
const stderrKinds = {};
for (const r of failed) stderrKinds[r.stderr] = (stderrKinds[r.stderr] ?? 0) + 1;
console.log(JSON.stringify({ root, calls: results.length, failed: failed.length, totalMs: Date.now() - started,
  failedSample: failed.slice(0, 3), stderrKinds, okMsMax: Math.max(0, ...results.filter((r) => !failed.includes(r)).map((r) => r.ms)) }, null, 2));
process.exit(0);
