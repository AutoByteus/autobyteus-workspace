/** Implementation feasibility, not fix acceptance. Clean env; no provider or app. */
import { test, expect } from 'vitest';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NonInteractiveShellResolver } from '../../../../autobyteus-ts/src/tools/terminal/command-execution/non-interactive-shell-resolver';
import { ShellCommandExecutor } from '../../../../autobyteus-ts/src/tools/terminal/command-execution/shell-command-executor';
import { BackgroundProcessManager } from '../../../../autobyteus-ts/src/tools/terminal/background-process-manager';
import { ProcessGroupObserver } from '../../../../autobyteus-ts/src/tools/terminal/command-execution/process-group-observer';
const exec = promisify(execFile);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
const alive = (pid: number) => { try { process.kill(pid, 0); return true; } catch { return false; } };

test('IMP-01: spawn and adoption observations need ownership continuity across leader exit', async () => {
  const root = await mkdtemp(join(tmpdir(), 'ab-imp-anchor-'));
  const resolver = new NonInteractiveShellResolver({ env: { PATH: process.env.PATH, HOME: root } });
  const receipts: Array<{ leader: number; child: number; leaderObserved: boolean; childObserved: boolean; leaderAtAdoption: boolean; childAtAdoption: boolean }> = [];
  const fixtureChildren: number[] = [];
  try {
    for (let i = 0; i < 10; i++) {
      const receipt = join(root, `child-${i}`);
      const invocation = resolver.resolve(`/bin/sleep 60 & printf '%s' "$!" > ${quote(receipt)}`, root);
      const child = spawn(invocation.executable, invocation.args, {
        cwd: invocation.cwd, env: invocation.env, detached: true, stdio: ['ignore', 'pipe', 'pipe']
      });
      const exited = new Promise<void>((resolve, reject) => { child.once('exit', () => resolve()); child.once('error', reject); });
      // First possible asynchronous OS snapshot: no tool-result or 75ms adoption wait.
      const observation = exec('ps', ['-axo', 'pid=,ppid=,pgid=,stat=,lstart='], { timeout: 500 });
      await exited;
      const pid = Number(await readFile(receipt, 'utf8'));
      fixtureChildren.push(pid);
      const { stdout } = await observation;
      const pids = stdout.trim().split('\n').map(line => Number(line.trim().split(/\s+/)[0]));
      const after = await exec('ps', ['-axo', 'pid=,ppid=,pgid=,stat=,lstart='], { timeout: 500 });
      const laterPids = after.stdout.trim().split('\n').map(line => Number(line.trim().split(/\s+/)[0]));
      receipts.push({ leader: child.pid!, child: pid, leaderObserved: pids.includes(child.pid!), childObserved: pids.includes(pid), leaderAtAdoption: laterPids.includes(child.pid!), childAtAdoption: laterPids.includes(pid) });
    }
    const missing = receipts.filter(row => row.leaderObserved && !row.childObserved && !row.leaderAtAdoption && row.childAtAdoption);
    console.log(JSON.stringify({ check: 'IMP-01', receipts, observationsWithoutOverlappingOwnedAnchor: missing.length }));
    expect(missing.length).toBeGreaterThan(0);

    // The supported entry actually returns/adopts that survivor today.
    const manager = new BackgroundProcessManager(undefined, resolver);
    const executor = new ShellCommandExecutor(resolver, new ProcessGroupObserver());
    const receipt = join(root, 'actual-tool-child');
    const result = await executor.execute(`/bin/sleep 60 & printf '%s' "$!" > ${quote(receipt)}`, root, { backgroundManager: manager });
    const pid = Number(await readFile(receipt, 'utf8'));
    fixtureChildren.push(pid);
    const adopted = await manager.listProcesses();
    expect(adopted.some(info => info.pid === pid)).toBe(true);
    expect(alive(pid)).toBe(true);
    console.log(JSON.stringify({ check: 'IMP-01', productionExecutor: true, adoptedPid: pid, adoptedCount: adopted.length, resultReturned: Boolean(result), survivorAlive: alive(pid) }));
  } finally {
    // Receipts are from our private fixture; no port/name/ancestry discovery is authority.
    for (const pid of fixtureChildren) { try { process.kill(pid, 'SIGKILL'); } catch {} }
    for (let i = 0; i < 50 && fixtureChildren.some(alive); i++) await delay(20);
    console.log(JSON.stringify({ check: 'IMP-01', fixtureChildren, cleanupRemaining: fixtureChildren.filter(alive) }));
    await rm(root, { recursive: true, force: true });
  }
}, 15000);
