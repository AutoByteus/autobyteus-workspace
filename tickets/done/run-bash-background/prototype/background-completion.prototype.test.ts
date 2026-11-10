/**
 * autobyteus-338 prototype (Solution Designer, 2026-11-09). NOT production code.
 *
 * Run (it must sit under autobyteus-ts/tests to be collected; copy it there, run, delete the copy):
 *   cp tickets/in-progress/run-bash-background/prototype/background-completion.prototype.test.ts \
 *      autobyteus-ts/tests/prototype-338.test.ts
 *   (cd autobyteus-ts && pnpm exec vitest --run tests/prototype-338.test.ts --reporter=verbose)
 *   rm autobyteus-ts/tests/prototype-338.test.ts
 *
 * What it shows, on the real anchored launcher, process scope and `ps` observer (no fakes):
 *   P1  a command started in the background by the existing scope reports its exit code and output
 *       when it ends: everything a completion notice needs is already in `handle.completion`;
 *       today's manager discards the code (records only status 'exited').
 *   P2  several commands ending at about the same time become one batched notice (exit code + last lines).
 *   P3  a shell `&` child adopted by today's run_bash has no exit code: only a `ps` refresh says it ended.
 *   P4  dropping the per-agent manager (what a run Terminate does today) leaves the command running;
 *       only the host scope's close() stops it.
 *   P5  stopping by id works on a command started this way (the "stop" capability without a stop tool).
 */
import { describe, it, expect } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NativeCommandProcessScope } from '../src/tools/terminal/command-execution/native-command-process-scope.js';
import { NonInteractiveShellResolver } from '../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
import { ProcessGroupObserver } from '../src/tools/terminal/command-execution/process-group-observer.js';
import type { AnchoredCommandHandle, CommandCompletion } from '../src/tools/terminal/command-execution/anchored-command-launcher.js';
import { OutputBuffer } from '../src/tools/terminal/output-buffer.js';
import { BackgroundProcessManager } from '../src/tools/terminal/background-process-manager.js';
import { ShellCommandExecutor } from '../src/tools/terminal/command-execution/shell-command-executor.js';

type Finished = { id: string; command: string; completion: CommandCompletion; tail: string; ms: number };

/** Prototype of "run_bash with run_in_background": start, return an id at once, report the end. */
class BackgroundCommandsPrototype {
  private next = 0;
  readonly running = new Map<string, { handle: AnchoredCommandHandle; command: string }>();
  constructor(private readonly scope: NativeCommandProcessScope, private readonly onFinished: (f: Finished) => void,
    private readonly resolver = new NonInteractiveShellResolver()) {}
  async start(command: string, cwd: string): Promise<{ id: string; pid: number }> {
    const output = new OutputBuffer(1_000_000);
    const startedAt = Date.now();
    const handle = await this.scope.start(this.resolver.resolve(command, cwd), undefined, (h) => {
      h.stdout.on('data', (b: Buffer) => output.append(b)); h.stderr.on('data', (b: Buffer) => output.append(b));
    });
    const id = `bg-${++this.next}`;
    this.running.set(id, { handle, command });
    void handle.completion.then((completion) => {
      this.running.delete(id);
      this.onFinished({ id, command, completion, tail: output.getLines(5), ms: Date.now() - startedAt });
      void this.scope.retireCompleted(handle);
    });
    return { id, pid: handle.commandPid! };
  }
  lastStopReason: string | undefined;
  async stop(id: string) {
    const entry = this.running.get(id);
    if (!entry) return 'not_found';
    this.lastStopReason = 'explicit-stop';
    return (await this.scope.stop(entry.handle, 'explicit-stop')).outcome;
  }
}

/** Prototype of the batched completion notice: completions within `windowMs` of the first become one message. */
class CompletionNoticeBatcher {
  private pending: Finished[] = [];
  private timer: NodeJS.Timeout | null = null;
  readonly notices: string[] = [];
  constructor(private readonly windowMs: number) {}
  add(f: Finished): void {
    this.pending.push(f);
    this.timer ??= setTimeout(() => this.flush(), this.windowMs);
  }
  private flush(): void {
    this.timer = null;
    const lines = this.pending.map((f) => {
      const how = f.completion.kind === 'result'
        ? `exit code ${f.completion.code}${f.completion.signal ? ` (signal ${f.completion.signal})` : ''}`
        : f.completion.kind === 'interrupted' ? `stopped (${f.completion.reason})` : `failed: ${f.completion.message}`;
      return `- ${f.id} \`${f.command}\` ended, ${how}. Last lines:\n${f.tail.trimEnd().split('\n').map((l) => `    ${l}`).join('\n')}`;
    });
    this.pending = [];
    this.notices.push([`[Background commands finished: ${lines.length}]`, ...lines].join('\n'));
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const runIntegration = process.platform === 'win32' ? describe.skip : describe;

runIntegration('autobyteus-338 prototype', () => {
  it('P1+P2: exit code and output tail at completion; simultaneous ends batch into one notice', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'p338-'));
    const scope = new NativeCommandProcessScope();
    const batcher = new CompletionNoticeBatcher(1000); // 300 ms split these three ends into two notices (evidence log, run 1)
    const finished: Finished[] = [];
    const bg = new BackgroundCommandsPrototype(scope, (f) => { finished.push(f); batcher.add(f); });
    try {
      const t0 = Date.now();
      const a = await bg.start('for i in 1 2 3; do echo "build step $i"; sleep 0.2; done; echo "build ok"', dir);
      const b = await bg.start('sleep 0.7; echo "tests: 2 failed" >&2; exit 3', dir);
      const c = await bg.start('sleep 0.75; echo lint clean', dir);
      const startMs = Date.now() - t0;
      expect(a.pid).toBeGreaterThan(0);
      await sleep(2200);
      console.log(`[P1] three background starts took ${startMs} ms in total; ids ${a.id},${b.id},${c.id}`);
      for (const f of finished) console.log(`[P1] ${f.id} ended after ${f.ms} ms:`, JSON.stringify(f.completion));
      console.log(`[P2] notices delivered: ${batcher.notices.length}\n${batcher.notices.join('\n---\n')}`);
      expect(finished.map((f) => f.completion)).toEqual(expect.arrayContaining([
        { kind: 'result', code: 0, signal: null }, { kind: 'result', code: 3, signal: null }]));
      expect(finished.find((f) => f.id === b.id)!.tail).toContain('tests: 2 failed');
      expect(batcher.notices.length).toBe(1);
    } finally { await scope.close(); await rm(dir, { recursive: true, force: true }); }
  });

  it('P3: a shell `&` child adopted by run_bash today has no exit code, only a ps-refreshed status', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'p338-'));
    const manager = new BackgroundProcessManager();
    try {
      const result = await new ShellCommandExecutor().execute('(sleep 0.5; exit 7) &', dir, { backgroundManager: manager });
      console.log('[P3] run_bash result:', JSON.stringify(result));
      const pid = result.backgroundProcesses[0]?.pid;
      expect(pid).toBeGreaterThan(0);
      await sleep(1200);
      const out = await manager.getOutput(pid!);
      console.log('[P3] after the child ended:', JSON.stringify(out), '(exit code 7 is not recorded anywhere)');
      expect(out.status).toBe('exited');
    } finally { await manager.scope.close(); await rm(dir, { recursive: true, force: true }); }
  });

  it('P4: dropping the per-agent manager leaves the command running until the host scope closes', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'p338-'));
    const scope = new NativeCommandProcessScope();
    const observer = new ProcessGroupObserver();
    let manager: BackgroundProcessManager | null = new BackgroundProcessManager(undefined, undefined, undefined, scope);
    try {
      const info = await manager.startCommand('sleep 30', dir);
      manager = null; // a terminated run's context (and its _backgroundProcessManager) is dropped; nothing calls stopAll()
      await sleep(300);
      const aliveAfterDrop = await observer.isProcessRunning(info.pid);
      const report = await scope.close();
      const aliveAfterClose = await observer.isProcessRunning(info.pid);
      console.log(`[P4] pid ${info.pid}: alive after the manager is dropped=${aliveAfterDrop}; scope.close()=${JSON.stringify(report)}; alive after close=${aliveAfterClose}`);
      expect(aliveAfterDrop).toBe(true);
      expect(aliveAfterClose).toBe(false);
    } finally { await scope.close(); await rm(dir, { recursive: true, force: true }); }
  });

  it('P5: stop by id', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'p338-'));
    const scope = new NativeCommandProcessScope();
    const finished: Finished[] = [];
    const bg = new BackgroundCommandsPrototype(scope, (f) => finished.push(f));
    try {
      const { id } = await bg.start('echo serving; sleep 30', dir);
      await sleep(300);
      const outcome = await bg.stop(id);
      await sleep(100);
      console.log(`[P5] stop(${id}) -> ${outcome}; stopReason=${bg.lastStopReason}; completion: ${JSON.stringify(finished[0]?.completion)}; tail: ${JSON.stringify(finished[0]?.tail)}`);
      expect(outcome).toBe('stopped');
      // The TERM reaches the command before the scope settles the stop: the completion reads as a signal
      // exit. Only the handle's stopReason tells "stopped on request" from "killed by a signal".
      expect(finished[0]?.completion).toEqual({ kind: 'result', code: null, signal: 'SIGTERM' });
    } finally { await scope.close(); await rm(dir, { recursive: true, force: true }); }
  });
});
