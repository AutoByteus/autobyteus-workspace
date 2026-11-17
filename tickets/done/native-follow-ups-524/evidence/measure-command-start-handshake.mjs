// FU-003 measurement (autobyteus-524). Starts N commands at once through the real NativeCommandProcessScope and
// AnchoredCommandLauncher of the built library, with a long start deadline and the `ps` read timeout removed, and
// times each step: anchor ready (pid reported), each `ps` read of the process-group check, and the whole start
// handshake (until START is confirmed). It does not change source: the observer's runner is injectable.
// Usage: node measure-command-start-handshake.mjs <worktree root> <N> [rounds]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFile } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const [root, nArg = '60', roundsArg = '1'] = process.argv.slice(2);
const lib = (p) => pathToFileURL(path.join(root, 'autobyteus-ts/dist/tools/terminal/command-execution', p)).href;
const { NativeCommandProcessScope } = await import(lib('native-command-process-scope.js'));
const { ProcessGroupObserver } = await import(lib('process-group-observer.js'));
const { AnchoredCommandLauncher } = await import(lib('anchored-command-launcher.js'));
const { NonInteractiveShellResolver } = await import(lib('non-interactive-shell-resolver.js'));
const psMs = [];
const timedRunner = (file, args, options) => new Promise((resolve, reject) => {
  const t0 = Date.now();
  execFile(file, args, { ...options, timeout: 0 }, (error, stdout, stderr) => {
    psMs.push(Date.now() - t0); error ? reject(error) : resolve({ stdout, stderr });
  });
});
const pct = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.ceil(p / 100 * s.length) - 1)] : null; };
const summary = (xs) => ({ n: xs.length, p50: pct(xs, 50), p90: pct(xs, 90), p99: pct(xs, 99), max: Math.max(0, ...xs),
  over1500: xs.filter((x) => x > 1500).length, over5000: xs.filter((x) => x > 5000).length, over15000: xs.filter((x) => x > 15000).length, over30000: xs.filter((x) => x > 30000).length });
const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'fu003-measure-'));
const resolver = new NonInteractiveShellResolver();
const readyMs = [], startMs = [], errors = {};
for (let r = 0; r < Number(roundsArg); r += 1) {
  const scope = new NativeCommandProcessScope(new ProcessGroupObserver(timedRunner), new AnchoredCommandLauncher());
  await Promise.all(Array.from({ length: Number(nArg) }, async (_, i) => {
    const t0 = Date.now();
    try {
      const handle = await scope.start(resolver.resolve(`printf ok-${i}`, cwd), Date.now() + 120000,
        (h) => { void h.ready.then(() => readyMs.push(Date.now() - t0), () => {}); });
      startMs.push(Date.now() - t0);
      await handle.completion;
    } catch (e) { const k = String(e?.message ?? e).slice(0, 120); errors[k] = (errors[k] ?? 0) + 1; }
  }));
  await scope.close();
}
fs.rmSync(cwd, { recursive: true, force: true });
const load = os.loadavg().map((x) => x.toFixed(1)).join(' ');
console.log(JSON.stringify({ at: new Date().toISOString(), n: Number(nArg), rounds: Number(roundsArg), cpus: os.cpus().length, loadAfter: load,
  anchorReadyMs: summary(readyMs), psReadMs: summary(psMs), startHandshakeMs: summary(startMs), errors }, null, 1));
process.exit(0);
