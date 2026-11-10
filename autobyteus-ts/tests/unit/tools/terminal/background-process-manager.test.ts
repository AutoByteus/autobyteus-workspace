/** The manager's record of background tasks: outcome, report-once, attribution, platform stops, run end (real processes). */
import { describe, it, expect, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BackgroundProcessManager, backgroundTaskOutcome, type BackgroundTaskState } from '../../../../src/tools/terminal/background-process-manager.js';
import { BackgroundProcessCleanupStep } from '../../../../src/agent/shutdown-steps/background-process-cleanup-step.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';

const runPosix = process.platform === 'win32' ? describe.skip : describe;
const cleanups: Array<() => Promise<unknown>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

async function fixture() {
  const cwd = await mkdtemp(path.join(os.tmpdir(), 'bg-manager-test-'));
  const manager = new BackgroundProcessManager({ ownerId: `bg-manager-test-${process.pid}-${cleanups.length}` });
  cleanups.push(() => rm(cwd, { recursive: true, force: true }), () => manager.scope.close(), () => manager.stopAllForRunEnd());
  return { cwd, manager };
}
async function ended(manager: BackgroundProcessManager, pid: number) {
  for (let i = 0; i < 250; i++) {
    const end = manager.list().find(s => s.task.pid === pid)?.end;
    if (end) return end;
    await new Promise(r => setTimeout(r, 20));
  }
  throw new Error(`no end for ${pid}`);
}

describe('backgroundTaskOutcome', () => {
  it('reads a wait status as an exit code up to 128 and as a signal above (R-2)', () => {
    expect([0, 3, 128].map(backgroundTaskOutcome)).toEqual([{ exitCode: 0 }, { exitCode: 3 }, { exitCode: 128 }]);
    expect([143, 137, 130].map(backgroundTaskOutcome)).toEqual([{ signal: 'SIGTERM' }, { signal: 'SIGKILL' }, { signal: 'SIGINT' }]);
    expect(backgroundTaskOutcome(128 + 90)).toEqual({ signal: 'SIG90' });
  });
});

runPosix('BackgroundProcessManager', () => {
  it('lists running and ended tasks with id, command, cwd, start and end (AC-012) and tells its listener', async () => {
    const { cwd, manager } = await fixture();
    const changes: BackgroundTaskState[] = [];
    manager.onChange(change => changes.push(change));
    const { started } = await manager.run('(sleep 0.2; exit 3) & sleep 30 & echo two', cwd, { background: false });
    expect(started.map(t => [t.command, t.effectiveCwd])).toEqual([[expect.any(String), cwd], [expect.any(String), cwd]]);
    expect(manager.hasRunning()).toBe(true);
    await ended(manager, started[0].pid);
    const listed = manager.list();
    expect(listed.map(s => [s.task.pid, s.end?.outcome ?? null])).toEqual([[started[0].pid, { exitCode: 3 }], [started[1].pid, null]]);
    expect(listed.every(s => !Number.isNaN(Date.parse(s.task.startedAt)))).toBe(true);
    expect(changes.map(c => [c.task.pid, c.end ? 'ended' : 'started'])).toEqual([
      [started[0].pid, 'started'], [started[1].pid, 'started'], [started[0].pid, 'ended']]);
  });

  it('reports each end once: a call takes only ends recorded after its mark, the rest go to the notice', async () => {
    const { cwd, manager } = await fixture();
    const before = manager.markCallStart();
    const { started } = await manager.run('(exit 4) & sleep 0.05; (sleep 0.1; exit 5) & echo x', cwd, { background: false });
    expect(started).toHaveLength(1); // the first job ended before the foreground end: not a task
    await ended(manager, started[0].pid);
    expect(await manager.takeEndsSince(manager.markCallStart())).toEqual([]);
    expect((await manager.takeEndsSince(before)).map(e => [e.pid, e.outcome])).toEqual([[started[0].pid, { exitCode: 5 }]]);
    expect(manager.takeUnreported()).toEqual([]);
    const next = await manager.run('(sleep 0.1; exit 6) & echo y', cwd, { background: false });
    await ended(manager, next.started[0].pid);
    expect(manager.takeUnreported().map(e => e.outcome)).toEqual([{ exitCode: 6 }]);
    expect(await manager.takeEndsSince(before)).toEqual([]);
  });

  it('never reports the ends of a platform stop (host shutdown)', async () => {
    const { cwd, manager } = await fixture();
    const { started } = await manager.run('sleep 30', cwd, { background: true });
    await manager.scope.close();
    expect((await ended(manager, started[0].pid)).outcome).toEqual({ signal: 'SIGTERM' });
    expect(manager.takeUnreported()).toEqual([]);
  });

  it('after run end, a call that was still running registers no task and its group is stopped', async () => {
    const { cwd, manager } = await fixture();
    const pending = manager.run('sleep 0.3; sleep 30 & echo late', cwd, { background: false });
    await new Promise(r => setTimeout(r, 100));
    await manager.stopAllForRunEnd();
    const { started } = await pending;
    expect(started).toEqual([]);
    expect(manager.hasRunning()).toBe(false);
  });

  it('the shutdown step stops the run\'s commands and never fails the shutdown', async () => {
    const { cwd, manager } = await fixture();
    const context = { agentId: 'step-test', _backgroundProcessManager: manager } as unknown as AgentContext;
    await manager.run('sleep 30', cwd, { background: true });
    expect(await new BackgroundProcessCleanupStep().execute(context)).toBe(true);
    expect(manager.hasRunning()).toBe(false);
    const broken = { agentId: 'broken', _backgroundProcessManager: Object.assign(Object.create(BackgroundProcessManager.prototype), {
      stopAllForRunEnd: () => Promise.reject(new Error('boom')) }) } as unknown as AgentContext;
    expect(await new BackgroundProcessCleanupStep().execute(broken)).toBe(true);
  });
});
