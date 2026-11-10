// IMP-08 (autobyteus-338 R-0 on Linux): the wrapper probe cases and R-0 list through the real runBash and anchored
// launcher, from autobyteus-ts/dist, on the container's bash and dash. Run (from the worktree root, after
// `pnpm -C autobyteus-ts build`):
//   docker run --rm -v "$PWD:$PWD:ro" -w "$PWD" node:22-bookworm node tickets/in-progress/run-bash-background/evidence/IMP-08-linux-wrapper-harness.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const root = path.resolve('autobyteus-ts/dist/tools/terminal');
const { runBash } = await import(`${root}/tools/run-bash.js`);
const { getBackgroundManager } = await import(`${root}/background-process-context.js`);
const { BackgroundProcessManager } = await import(`${root}/background-process-manager.js`);
const { NonInteractiveShellResolver } = await import(`${root}/command-execution/non-interactive-shell-resolver.js`);

const results = [];
let n = 0;
const ctx = () => ({ workspaceRootPath: mkdtempSync(path.join(os.tmpdir(), 'linux-wrapper-')), agentId: `linux-${n++}` });
const fg = (c, cmd, t = 30) => runBash(c, cmd, null, t, false);
const bg = (c, cmd) => runBash(c, cmd, null, 30, true);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function endOf(m, pid, ms = 5000) {
  for (const deadline = Date.now() + ms; Date.now() < deadline; await sleep(20)) {
    const s = m.list().find(x => x.task.pid === pid); if (s?.end) { m.takeUnreported(); return s.end.outcome; }
  }
  return 'no end';
}
const groupOf = pid => Number(execFileSync('ps', ['-o', 'pgid=', '-p', String(pid)], { encoding: 'utf8' }).trim());
const members = pgid => execFileSync('ps', ['-eo', 'pgid=,stat=,comm='], { encoding: 'utf8' }).split('\n')
  .map(l => l.trim().split(/\s+/)).filter(([g, st]) => Number(g) === pgid && !st?.includes('Z')).map(c => c.slice(2).join(' '));
async function check(name, fn) {
  const c = ctx();
  try { const detail = await fn(c, getBackgroundManager(c)); results.push({ name, ok: true, detail }); }
  catch (error) { results.push({ name, ok: false, error: String(error?.message ?? error) }); }
  finally { const m = getBackgroundManager(c); await m.stopAllForRunEnd(); await m.scope.close(); }
}
const eq = (actual, expected) => { if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`got ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`); return actual; };

await check('1 plain command exit 3', async c => { const r = await fg(c, 'echo out; echo err >&2; exit 3'); return eq([r.stdout, r.stderr, r.exitCode, r.backgroundTasksStarted], ['out\n', 'err\n', 3, []]); });
await check('2 set -e + failing & job reports 3', async (c, m) => { const r = await fg(c, 'set -e; (sleep 0.2; exit 3) & echo started'); eq([r.stdout, r.exitCode], ['started\n', 0]); return eq(await endOf(m, r.backgroundTasksStarted[0].pid), { exitCode: 3 }); });
await check('3 set -e failing foreground rc 1', async c => { const r = await fg(c, 'set -e; false; echo not-reached'); return eq([r.stdout, r.stderr, r.exitCode], ['', '', 1]); });
await check('4 set -x only user trace', async c => { const r = await fg(c, 'set -x; echo hi'); return eq([r.stdout, r.stderr, r.exitCode], ['hi\n', '+ echo hi\n', 0]); });
await check('5 user EXIT trap stops server (R-7)', async c => { const r = await fg(c, 'sleep 30 & P=$!; trap "kill $P" EXIT; echo checks-done'); return eq(r.backgroundTasksEnded.map(e => e.outcome), [{ signal: 'SIGTERM' }]); });
await check('6 exec >/dev/null 2>&1 then a job', async (c, m) => { const r = await fg(c, 'exec >/dev/null 2>&1; (sleep 0.3; exit 4) & echo hidden'); eq([r.stdout, r.stderr], ['', '']); return eq(await endOf(m, r.backgroundTasksStarted[0].pid), { exitCode: 4 }); });
await check('7 two jobs 3 and 7', async (c, m) => { const r = await fg(c, '(sleep 0.3; exit 3) & (sleep 0.8; exit 7) & echo started'); return eq([await endOf(m, r.backgroundTasksStarted[0].pid), await endOf(m, r.backgroundTasksStarted[1].pid)], [{ exitCode: 3 }, { exitCode: 7 }]); });
await check('8 background form kill <pid> leaves nothing, reported in place', async c => {
  const s = await bg(c, 'npm_like() { sleep 100; }; npm_like & sleep 101'); const g = groupOf(s.pid); await sleep(300);
  const before = members(g).filter(x => x === 'sleep').length; const k = await fg(c, `kill ${s.pid}`); await sleep(500);
  return eq([before, k.backgroundTasksEnded.map(e => e.outcome), members(g).filter(x => x === 'sleep')], [2, [{ signal: 'SIGTERM' }], []]);
});
await check('10 kill of & job reported in the kill result', async c => { const r = await fg(c, 'sleep 30 & echo started'); const k = await fg(c, `kill ${r.backgroundTasksStarted[0].pid}`); return eq(k.backgroundTasksEnded.map(e => e.outcome), [{ signal: 'SIGTERM' }]); });
await check('11 & job with children: kill <pid> stops that process only; run end stops the rest', async (c, m) => {
  const r = await fg(c, '(sh -c "sleep 105 & sleep 106") & echo started'); const g = groupOf(r.backgroundTasksStarted[0].pid); await sleep(300);
  await fg(c, `kill ${r.backgroundTasksStarted[0].pid}`); await sleep(300); const left = members(g).filter(x => x === 'sleep').length;
  await m.stopAllForRunEnd(); return eq([left, members(g)], [2, []]);
});
await check('12 strict mode IFS=newline-tab two jobs', async (c, m) => { const r = await fg(c, "set -euo pipefail; IFS=$'\\n\\t'; (sleep 0.3; exit 3) & (sleep 0.6; exit 7) & echo started"); return eq(await Promise.all(r.backgroundTasksStarted.map(t => endOf(m, t.pid))), [{ exitCode: 3 }, { exitCode: 7 }]); });
await check('R-0 bytes identical apart from frames', async c => { const r = await fg(c, "printf 'a\\nb'; printf 'x' >&2"); return eq([r.stdout, r.stderr], ['a\nb', 'x']); });
await check('R-0 exit N, quoting, cd, pipeline, heredoc', async c => eq([(await fg(c, 'exit 42')).exitCode, (await fg(c, `echo "a  b" 'c$d'`)).stdout, (await fg(c, 'cd / && pwd')).stdout, (await fg(c, "printf 'a\\nb\\n' | wc -l")).stdout.trim(), (await fg(c, "cat <<'EOF'\nx $HOME\nEOF")).stdout], [42, 'a  b c$d\n', '/\n', '2', 'x $HOME\n']));
await check('R-0 a & b & wait: no tasks', async c => { const r = await fg(c, '(sleep 0.1; echo a) & (sleep 0.2; echo b) & wait; echo done'); return eq([r.stdout, r.backgroundTasksStarted], ['a\nb\ndone\n', []]); });
await check('R-0 user functions jobs/kill/wait/printf/test/echo', async (c, m) => { const r = await fg(c, 'jobs() { echo fake; }; kill() { :; }; wait() { :; }; printf() { :; }; test() { return 1; }; echo() { :; }; (sleep 0.2; exit 3) & builtin echo started'); eq(r.stdout, 'started\n'); return eq(await endOf(m, r.backgroundTasksStarted[0].pid), { exitCode: 3 }); });
await check('R-0 user EXIT trap sees $? and exits with it', async (c, m) => { const r = await fg(c, "trap 'rc=$?; echo trap-rc=$rc >&2; exit $rc' EXIT; (sleep 0.2; exit 3) & (exit 4)"); eq([r.stderr, r.exitCode], ['trap-rc=4\n', 4]); return eq(await endOf(m, r.backgroundTasksStarted[0].pid), { exitCode: 3 }); });
await check('R-0 exec cmd falls back to shell exit', async c => { const r = await fg(c, "exec sh -c 'echo replaced; exit 6'"); return eq([r.stdout, r.exitCode, r.backgroundTasksStarted], ['replaced\n', 6, []]); });
await check('R-0 timeout and Stop: whole group stopped, no wrapper output', async (c, m) => {
  const r = await fg(c, 'echo before >&2; sleep 5', 1);
  const ctl = new AbortController(); const p = runBash(c, 'sleep 30 & sleep 5', null, 30, false, { signal: ctl.signal }); setTimeout(() => ctl.abort(), 300); const s = await p;
  return eq([r.timedOut, r.exitCode, r.stderr.replace('tool-timeout\n', ''), s.timedOut, s.exitCode, s.stderr.replace('tool-abort\n', ''), s.backgroundTasksStarted, m.hasRunning()],
    [true, null, 'before\n', true, null, '', [], false]);
});
await check('CR-001 ~/.bash_logout read as often as the plain login shell, same exit code', async (c0) => {
  const home = mkdtempSync(path.join(os.tmpdir(), 'logout-')); const marker = path.join(home, 'logout-runs');
  writeFileSync(path.join(home, '.bash_logout'), `echo ran >> '${marker}'\n`);
  const env = { ...process.env, HOME: home }; const c = Object.assign(c0, { customData: { terminalChildEnvironment: () => env } });
  const reads = () => existsSync(marker) ? readFileSync(marker, 'utf8').split('\n').filter(Boolean).length : 0;
  const rows = [];
  for (const command of ['echo hi', '(sleep 0.2; exit 3) & echo started', 'exit 3', 'set -e; false; echo no', "trap 'exit 4' EXIT; true", "trap 'echo t' EXIT; (sleep 0.2; exit 3) & exit 5"]) {
    rmSync(marker, { force: true }); const plain = spawnSync('bash', ['--noprofile', '--norc', '-lc', command], { env, encoding: 'utf8' }); await sleep(600); const plainReads = reads();
    rmSync(marker, { force: true }); const wrapped = await fg(c, command); await sleep(600);
    eq([command, wrapped.exitCode, reads()], [command, plain.status, plainReads]); rows.push([command, plain.status, plainReads]);
  }
  rmSync(home, { recursive: true, force: true }); return rows;
});
await check('R-0 empty and comment-only commands', async c => eq([(await fg(c, '')).exitCode, (await fg(c, '# note')).exitCode, (await fg(c, '')).stderr], [0, 0, '']));
await check('R-6 jobs do not inherit fds 62/63 (bash 4+)', async c => { const r = await fg(c, 'sleep 3 & ls /proc/$!/fd | tr "\\n" " "'); return eq(r.stdout.trim().split(' ').filter(fd => ['62', '63'].includes(fd)), []); });
await check('background output file and tail', async (c, m) => { const s = await bg(c, 'echo one; sleep 0.2; echo two; exit 2'); const o = await endOf(m, s.pid); return eq([o, readFileSync(s.outputFile, 'utf8')], [{ exitCode: 2 }, 'one\ntwo\n']); });
{
  const c = ctx();
  const m = new BackgroundProcessManager({ ownerId: 'linux-sh', resolver: () => new NonInteractiveShellResolver({ env: { PATH: '/nonexistent' } }) });
  try {
    const sh = execFileSync('readlink', ['-f', '/bin/sh'], { encoding: 'utf8' }).trim();
    const { started } = await m.run('echo from-sh; exit 5', c.workspaceRootPath, { background: true });
    const outcome = await endOf(m, started[0].pid);
    const f = await m.run('(exit 3) & echo unwrapped', c.workspaceRootPath, { background: false });
    results.push({ name: `sh fallback (${sh}): background form exit 5; foreground unwrapped`, ok: JSON.stringify([outcome, f.call.stdout, f.started]) === JSON.stringify([{ exitCode: 5 }, 'unwrapped\n', []]), detail: [outcome, f.call.stdout, f.started] });
  } catch (error) { results.push({ name: 'sh fallback', ok: false, error: String(error) }); }
  finally { await m.stopAllForRunEnd(); await m.scope.close(); }
}
const bash = execFileSync('bash', ['-c', 'echo $BASH_VERSION'], { encoding: 'utf8' }).trim();
console.log(JSON.stringify({ bash, node: process.version, kernel: os.release(), passed: results.filter(r => r.ok).length, failed: results.filter(r => !r.ok).length }, null, 0));
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.ok ? (r.name.startsWith('CR-001') ? ` [command, exit code, logout reads]: ${JSON.stringify(r.detail)}` : '') : `: ${r.error ?? JSON.stringify(r.detail)}`}`);
process.exit(results.every(r => r.ok) ? 0 : 1);
