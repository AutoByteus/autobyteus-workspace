/**
 * autobyteus-338 R-0: every run_bash call runs through the command wrapper. Each case runs through `runBash` and the
 * real anchored launcher on this machine's bash (macOS bash 3.2, Linux bash 5): the wrapper skeleton probe's 12 cases
 * (`tickets/.../prototype/wrapper-skeleton-probe.sh`) and the design's R-0 regression list.
 * Command: pnpm -C autobyteus-ts exec vitest run tests/integration/tools/terminal/run-bash-wrapper.test.ts
 */
import { describe, it, expect, afterEach } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBash } from '../../../../src/tools/terminal/tools/run-bash.js';
import { getBackgroundManager } from '../../../../src/tools/terminal/background-process-context.js';
import { BackgroundProcessManager } from '../../../../src/tools/terminal/background-process-manager.js';
import { NonInteractiveShellResolver } from '../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
import { TerminalResult, type BackgroundCommandStarted, type BackgroundTaskEnd } from '../../../../src/tools/terminal/types.js';

const suite = process.platform === 'win32' ? describe.skip : describe;
const contexts: Array<{ workspaceRootPath: string; agentId: string }> = [];

function context() {
  const ctx = { workspaceRootPath: mkdtempSync(path.join(os.tmpdir(), 'ab-wrapper-')), agentId: `wrapper-test-${contexts.length}-${process.pid}` };
  contexts.push(ctx);
  return ctx;
}
const managerOf = (ctx: object) => getBackgroundManager(ctx);
async function fg(ctx: object, command: string, timeoutSeconds = 30): Promise<TerminalResult> {
  return await runBash(ctx, command, null, timeoutSeconds, false) as TerminalResult;
}
async function bg(ctx: object, command: string): Promise<BackgroundCommandStarted> {
  return await runBash(ctx, command, null, 30, true) as BackgroundCommandStarted;
}
/** Waits for the task's end and takes it (as the notice would). */
async function endOf(manager: BackgroundProcessManager, pid: number, ms = 5000): Promise<BackgroundTaskEnd> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    const state = manager.list().find(s => s.task.pid === pid);
    if (state?.end) { manager.takeUnreported(); return state.end; }
    await new Promise(r => setTimeout(r, 20));
  }
  throw new Error(`no end for ${pid}`);
}
const groupOf = (pid: number): number => Number(execFileSync('ps', ['-o', 'pgid=', '-p', String(pid)], { encoding: 'utf8' }).trim());
const groupMembers = (pgid: number): string[] => execFileSync('ps', ['-axo', 'pgid=,stat=,comm='], { encoding: 'utf8' })
  .split('\n').map(line => line.trim().split(/\s+/)).filter(([g, stat]) => Number(g) === pgid && !stat?.includes('Z')).map(cols => cols.slice(2).join(' '))
  .filter(name => !name.startsWith('(')); // macOS shows an exiting process as "(name)"
async function until(check: () => boolean, ms = 3000): Promise<boolean> {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (check()) return true; await new Promise(r => setTimeout(r, 25)); }
  return check();
}

afterEach(async () => {
  for (const ctx of contexts.splice(0)) {
    const manager = managerOf(ctx);
    await manager.stopAllForRunEnd();
    await manager.scope.close();
    rmSync(ctx.workspaceRootPath, { recursive: true, force: true });
  }
});

suite('run_bash command wrapper: probe cases', () => {
  it('1 plain command, exit 3: output bytes and exit code unchanged', async () => {
    const r = await fg(context(), 'echo out; echo err >&2; exit 3');
    expect([r.stdout, r.stderr, r.exitCode, r.backgroundTasksStarted]).toEqual(['out\n', 'err\n', 3, []]);
  });

  it('2 set -e with a failing & job: the job is a task and its exit code 3 is reported', async () => {
    const ctx = context();
    const r = await fg(ctx, 'set -e; (sleep 0.2; exit 3) & echo started');
    expect([r.stdout, r.exitCode]).toEqual(['started\n', 0]);
    expect(r.backgroundTasksStarted).toHaveLength(1);
    expect((await endOf(managerOf(ctx), r.backgroundTasksStarted[0].pid)).outcome).toEqual({ exitCode: 3 });
  });

  it('3 set -e with a failing foreground command returns its code 1', async () => {
    const r = await fg(context(), 'set -e; false; echo not-reached');
    expect([r.stdout, r.stderr, r.exitCode]).toEqual(['', '', 1]);
  });

  it('4 set -x shows only the user\'s trace lines', async () => {
    const r = await fg(context(), 'set -x; echo hi');
    expect([r.stdout, r.stderr, r.exitCode]).toEqual(['hi\n', '+ echo hi\n', 0]);
  });

  it('5 a user EXIT trap stops its server at command end (started and ended in the same result, R-7)', async () => {
    const r = await fg(context(), 'sleep 30 & P=$!; trap "kill $P" EXIT; echo checks-done');
    expect([r.stdout, r.exitCode]).toEqual(['checks-done\n', 0]);
    expect(r.backgroundTasksEnded.map(e => e.outcome)).toEqual([{ signal: 'SIGTERM' }]);
  });

  it('6 exec >/dev/null 2>&1 keeps the wrapper\'s channels; the job is still reported', async () => {
    const ctx = context();
    const r = await fg(ctx, 'exec >/dev/null 2>&1; (sleep 0.3; exit 4) & echo hidden');
    expect([r.stdout, r.stderr, r.exitCode]).toEqual(['', '', 0]);
    expect((await endOf(managerOf(ctx), r.backgroundTasksStarted[0].pid)).outcome).toEqual({ exitCode: 4 });
  });

  it('7 two & jobs report exit codes 3 and 7', async () => {
    const ctx = context();
    const r = await fg(ctx, '(sleep 0.3; exit 3) & (sleep 0.8; exit 7) & echo started');
    const [a, b] = r.backgroundTasksStarted;
    expect((await endOf(managerOf(ctx), a.pid)).outcome).toEqual({ exitCode: 3 });
    expect((await endOf(managerOf(ctx), b.pid)).outcome).toEqual({ exitCode: 7 });
  });

  it('8 background form: kill <pid> stops everything the command started, reported in the kill\'s own result', async () => {
    const ctx = context();
    const started = await bg(ctx, 'npm_like() { sleep 100; }; npm_like & sleep 101');
    expect(started.status).toBe('running');
    const pgid = groupOf(started.pid);
    await until(() => groupMembers(pgid).filter(c => c.includes('sleep')).length === 2);
    const kill = await fg(ctx, `kill ${started.pid}`);
    expect(kill.exitCode).toBe(0);
    expect(kill.backgroundTasksEnded.map(e => [e.pid, e.outcome])).toEqual([[started.pid, { signal: 'SIGTERM' }]]);
    expect(await until(() => groupMembers(pgid).every(c => !c.includes('sleep')))).toBe(true);
    expect(managerOf(ctx).takeUnreported()).toEqual([]);
  });

  it('10 kill of an & job: its end is reported in the kill\'s result as a signal', async () => {
    const ctx = context();
    const r = await fg(ctx, 'sleep 30 & echo started');
    const pid = r.backgroundTasksStarted[0].pid;
    const kill = await fg(ctx, `kill ${pid}`);
    expect(kill.backgroundTasksEnded.map(e => [e.pid, e.outcome])).toEqual([[pid, { signal: 'SIGTERM' }]]);
  });

  it('11 plain & job with children: kill <pid> stops that process only; run end stops the rest (DEC-012)', async () => {
    const ctx = context();
    const r = await fg(ctx, '(sh -c "sleep 105 & sleep 106") & echo started');
    const pid = r.backgroundTasksStarted[0].pid;
    const pgid = groupOf(pid);
    await until(() => groupMembers(pgid).filter(c => c.includes('sleep')).length === 2);
    await fg(ctx, `kill ${pid}`);
    expect(groupMembers(pgid).filter(c => c.includes('sleep'))).toHaveLength(2);
    expect(await managerOf(ctx).stopAllForRunEnd()).toEqual([]);
    expect(groupMembers(pgid)).toEqual([]);
  });

  it('12 bash strict mode with IFS=newline-tab and two jobs reports 3 and 7', async () => {
    const ctx = context();
    const r = await fg(ctx, "set -euo pipefail; IFS=$'\\n\\t'; (sleep 0.3; exit 3) & (sleep 0.6; exit 7) & echo started");
    expect([r.stdout, r.exitCode, r.backgroundTasksStarted.length]).toEqual(['started\n', 0, 2]);
    const ends = await Promise.all(r.backgroundTasksStarted.map(t => endOf(managerOf(ctx), t.pid)));
    expect(ends.map(e => e.outcome)).toEqual([{ exitCode: 3 }, { exitCode: 7 }]);
  });
});

suite('run_bash command wrapper: R-0 regression list', () => {
  it('keeps stdout and stderr bytes identical apart from frames (no trailing newline, lookalike frames)', async () => {
    const r = await fg(context(), "printf 'a\\nb'; printf 'x' >&2; printf '\\036feedfacefeedface:END\\037'");
    expect(r.stdout).toBe('a\nb\x1efeedfacefeedface:END\x1f');
    expect(r.stderr).toBe('x');
  });

  it('exit N, quoting, cd and pipelines behave as before', async () => {
    const ctx = context();
    expect((await fg(ctx, 'exit 42')).exitCode).toBe(42);
    expect((await fg(ctx, `echo "a  b" 'c$d' \\"e\\"`)).stdout).toBe('a  b c$d "e"\n');
    expect((await fg(ctx, 'cd / && pwd')).stdout).toBe('/\n');
    expect((await fg(ctx, "printf 'a\\nb\\n' | wc -l | tr -d ' '")).stdout).toBe('2\n');
  });

  it('heredocs keep their content', async () => {
    const ctx = context();
    const r = await fg(ctx, "cat > h.txt <<'EOF'\nline $HOME\n  indented\nEOF\ncat h.txt");
    expect(r.stdout).toBe('line $HOME\n  indented\n');
  });

  it('a & b & wait: jobs waited for in the foreground are not tasks', async () => {
    const r = await fg(context(), '(sleep 0.1; echo a) & (sleep 0.2; echo b) & wait; echo done');
    expect([r.stdout, r.backgroundTasksStarted]).toEqual(['a\nb\ndone\n', []]);
  });

  it('user functions named jobs, kill, wait, printf, test, echo do not affect the wrapper', async () => {
    const ctx = context();
    const r = await fg(ctx, 'jobs() { echo fake; }; kill() { :; }; wait() { :; }; printf() { :; }; test() { return 1; }; echo() { :; }; (sleep 0.2; exit 3) & builtin echo started');
    expect([r.stdout, r.exitCode, r.backgroundTasksStarted.length]).toEqual(['started\n', 0, 1]);
    expect((await endOf(managerOf(ctx), r.backgroundTasksStarted[0].pid)).outcome).toEqual({ exitCode: 3 });
  });

  it('a user EXIT trap sees the command\'s status and may exit with it; the jobs stay tracked', async () => {
    const ctx = context();
    const r = await fg(ctx, "trap 'rc=$?; echo trap-rc=$rc >&2; exit $rc' EXIT; (sleep 0.2; exit 3) & (exit 4)");
    expect([r.stderr, r.exitCode, r.backgroundTasksStarted.length]).toEqual(['trap-rc=4\n', 4, 1]);
    expect((await endOf(managerOf(ctx), r.backgroundTasksStarted[0].pid)).outcome).toEqual({ exitCode: 3 });
  });

  it('reads ~/.bash_logout of the login shell exactly as often as the plain shell does, with the same exit code (CR-001)', async () => {
    const home = mkdtempSync(path.join(os.tmpdir(), 'ab-logout-'));
    const marker = path.join(home, 'logout-runs');
    writeFileSync(path.join(home, '.bash_logout'), `echo ran >> '${marker}'\n`);
    const env = { ...process.env, HOME: home };
    const ctx = Object.assign(context(), { customData: { terminalChildEnvironment: () => env } });
    const reads = () => existsSync(marker) ? readFileSync(marker, 'utf8').split('\n').filter(Boolean).length : 0;
    const settle = () => new Promise(r => setTimeout(r, 600)); // the & job (0.2 s) has ended, its shell exited
    try {
      for (const command of ['echo hi', '(sleep 0.2; exit 3) & echo started', 'exit 3', 'set -e; false; echo no',
        "trap 'exit 4' EXIT; true", "trap 'echo t' EXIT; (sleep 0.2; exit 3) & exit 5"]) {
        rmSync(marker, { force: true });
        const plain = spawnSync('bash', ['--noprofile', '--norc', '-lc', command], { env, encoding: 'utf8' });
        await settle();
        const plainReads = reads();
        rmSync(marker, { force: true });
        const wrapped = await fg(ctx, command);
        await settle();
        expect([command, wrapped.exitCode, reads()]).toEqual([command, plain.status, plainReads]);
      }
    } finally { rmSync(home, { recursive: true, force: true }); }
  });

  it('exec cmd replaces the wrapper: the call ends at the shell exit, with no task list', async () => {
    const r = await fg(context(), "exec sh -c 'echo replaced; exit 6'");
    expect([r.stdout, r.exitCode, r.backgroundTasksStarted]).toEqual(['replaced\n', 6, []]);
  });

  it('timeout and Stop apply to the foreground part, stop the whole group and add no wrapper output', async () => {
    const ctx = context();
    const r = await fg(ctx, 'echo before >&2; sleep 5', 1);
    expect([r.timedOut, r.exitCode]).toEqual([true, null]);
    expect(r.stderr.replace('tool-timeout\n', '')).toBe('before\n');
    const controller = new AbortController();
    const pending = runBash(ctx, 'sleep 30 & sleep 5', null, 30, false, { signal: controller.signal }) as Promise<TerminalResult>;
    setTimeout(() => controller.abort(), 300);
    const stopped = await pending;
    expect([stopped.timedOut, stopped.exitCode, stopped.backgroundTasksStarted]).toEqual([true, null, []]);
    expect(stopped.stderr.replace('tool-abort\n', '')).toBe('');
    expect(managerOf(ctx).hasRunning()).toBe(false);
  });

  it('large output arrives complete', async () => {
    const r = await fg(context(), 'seq 1 100000');
    expect(r.stdout.split('\n').length).toBe(100001);
    expect(r.stdout.endsWith('99999\n100000\n')).toBe(true);
  });

  it('does not let processes the command starts inherit the wrapper channels on bash 4+', async () => {
    const version = execFileSync('bash', ['-c', 'echo ${BASH_VERSINFO[0]}'], { encoding: 'utf8' }).trim();
    const r = await fg(context(), 'ls /proc/self/fd 2>/dev/null || lsof -p $$ -a -d 0-99 -Fn 2>/dev/null | grep -c ^f');
    if (Number(version) >= 4 && process.platform === 'linux') expect(r.stdout.split(/\s+/)).not.toContain('62');
    expect(r.exitCode).toBe(0);
  });
});

suite('run_bash background tasks', () => {
  it('a background start returns at once with pid, cwd and output file; the file is readable with tail', async () => {
    const ctx = context();
    const t0 = Date.now();
    const started = await bg(ctx, 'echo one; sleep 0.3; echo two; exit 2');
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(started.effectiveCwd).toBe(ctx.workspaceRootPath);
    expect(started.outputFile.startsWith(path.join(os.tmpdir(), 'autobyteus-background-tasks'))).toBe(true);
    const end = await endOf(managerOf(ctx), started.pid);
    expect(end.outcome).toEqual({ exitCode: 2 });
    expect(end.lastLines).toBe('one\ntwo');
    expect((await fg(ctx, `tail -n 1 ${started.outputFile}`)).stdout).toBe('two\n');
  });

  it('output of & jobs after the call returned goes to the call\'s output file', async () => {
    const ctx = context();
    const r = await fg(ctx, '(sleep 0.2; echo later; echo later-err >&2) & echo now');
    expect(r.stdout).toBe('now\n');
    const end = await endOf(managerOf(ctx), r.backgroundTasksStarted[0].pid);
    expect(end.lastLines.split('\n').sort()).toEqual(['later', 'later-err']);
    expect(readFileSync(r.backgroundTasksStarted[0].outputFile, 'utf8').split('\n').filter(Boolean).sort()).toEqual(['later', 'later-err']);
  });

  it('run end stops background commands, records no reportable end and removes the output folder', async () => {
    const ctx = context();
    const started = await bg(ctx, 'sleep 60');
    const manager = managerOf(ctx);
    expect(manager.hasRunning()).toBe(true);
    expect(await manager.stopAllForRunEnd()).toEqual([]);
    expect(manager.hasRunning()).toBe(false);
    expect(manager.takeUnreported()).toEqual([]);
    expect(() => readFileSync(started.outputFile)).toThrow();
  });

  it('the sh fallback runs the background form', async () => {
    const ctx = context();
    const manager = new BackgroundProcessManager({
      ownerId: `${ctx.agentId}-sh`, resolver: () => new NonInteractiveShellResolver({ env: { PATH: '/nonexistent' } }) });
    try {
      const { started } = await manager.run('echo from-sh; exit 5', ctx.workspaceRootPath, { background: true });
      expect((await endOf(manager, started[0].pid)).outcome).toEqual({ exitCode: 5 });
      const fgCall = await manager.run('(exit 3) & echo unwrapped', ctx.workspaceRootPath, { background: false });
      expect([fgCall.call.stdout, fgCall.started]).toEqual(['unwrapped\n', []]);
    } finally { await manager.stopAllForRunEnd(); await manager.scope.close(); }
  });
});
