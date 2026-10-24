/** Real task-owned process tests, no provider or app data. Run with clean environment. */
import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { NativeCommandProcessScope } from '../../../../../src/tools/terminal/command-execution/native-command-process-scope.js';
import { NonInteractiveShellResolver } from '../../../../../src/tools/terminal/command-execution/non-interactive-shell-resolver.js';
import { ShellCommandExecutor } from '../../../../../src/tools/terminal/command-execution/shell-command-executor.js';
import { BackgroundProcessManager } from '../../../../../src/tools/terminal/background-process-manager.js';
import { ProcessGroupObserver } from '../../../../../src/tools/terminal/command-execution/process-group-observer.js';
import { AnchorControlDecoder } from '../../../../../src/tools/terminal/command-execution/anchor-control-protocol.js';
const pause = (ms: number) => new Promise(r => setTimeout(r, ms));
const quote = (s: string) => "'" + s.replaceAll("'", "'\\''") + "'";
const suite = process.platform === 'win32' ? describe.skip : describe;
suite('NativeCommandProcessScope', () => {
  async function fixture(run: (scope: NativeCommandProcessScope, manager: BackgroundProcessManager, executor: ShellCommandExecutor, cwd: string) => Promise<void>) {
    const cwd = await mkdtemp(join(tmpdir(), 'ab-owned-scope-'));
    const resolver = new NonInteractiveShellResolver({ env: { PATH: process.env.PATH, HOME: cwd } });
    const scope = new NativeCommandProcessScope();
    const manager = new BackgroundProcessManager(undefined, resolver, undefined, scope);
    try { await run(scope, manager, new ShellCommandExecutor(resolver), cwd); }
    finally { const result = await scope.close(); expect(result.outcomes.every(r => r.outcome !== 'unconfirmed')).toBe(true); await rm(cwd, { recursive: true, force: true }); }
  }
  it('retains fast shell survivors and drains them after the command/agent context ends', async () => fixture(async (scope, manager, executor, cwd) => {
    const result = await executor.execute('sleep 60 & printf "%s" "$!"', cwd, { backgroundManager: manager });
    const pid = Number(result.stdout);
    expect(result.exitCode).toBe(0);
    expect((await manager.listProcesses()).some(p => p.pid === pid)).toBe(true);
    expect(scope.size).toBe(1);
    const report = await scope.close();
    expect(report.outcomes).toEqual([{ outcome: 'stopped' }]);
    expect(await new ProcessGroupObserver().isProcessRunning(pid)).toBe(false);
  }));
  it('forces a TERM-resistant adopted HTTP child, confirms listener release and preserves prior RESULT', async () => fixture(async (scope, manager, executor, cwd) => {
    const code = 'process.on("SIGTERM",()=>{});const s=require("http").createServer((q,r)=>r.end("owned"));s.listen(0,"127.0.0.1",()=>console.log(JSON.stringify({pid:process.pid,port:s.address().port})))';
    const result = await executor.execute(`${quote(process.execPath)} -e ${quote(code)} &`, cwd, { backgroundManager: manager });
    expect(result.exitCode).toBe(0);
    const records = await manager.listProcesses(); expect(records.length).toBeGreaterThan(0);
    let receipt: { pid: number; port: number } | undefined;
    for (let i = 0; i < 100 && !receipt; i++) {
      try { receipt = JSON.parse((await manager.getOutput(records[0].pid)).output); } catch { await pause(10); }
    }
    expect(receipt).toBeDefined(); expect((await fetch(`http://127.0.0.1:${receipt!.port}`)).status).toBe(200);
    const report = await scope.close(); expect(report.outcomes).toEqual([{ outcome: 'stopped' }]);
    expect(await new ProcessGroupObserver().isProcessRunning(receipt!.pid)).toBe(false);
    await expect(fetch(`http://127.0.0.1:${receipt!.port}`)).rejects.toThrow();
    expect(result.exitCode).toBe(0);
    console.log(JSON.stringify({ check: 'owned-survivor', ...receipt, cleanup: report, listenerReleased: true }));
  }));
  it('fails closed on observation denial, then retains the lease for a verified later close', async () => {
    const observer = new ProcessGroupObserver(), scope = new NativeCommandProcessScope(observer);
    const handle = await scope.start(new NonInteractiveShellResolver().resolve('sleep 60', process.cwd()));
    const signal = vi.spyOn(observer, 'signal');
    const failed = vi.spyOn(observer, 'snapshot').mockRejectedValue(new Error('inspection denied'));
    try {
      expect(await scope.stop(handle, 'explicit-stop')).toEqual({ outcome: 'unconfirmed', reason: 'inspection denied' });
      expect(signal).not.toHaveBeenCalled(); expect(scope.size).toBe(1);
      expect((await handle.completion).kind).toBe('failed');
    } finally {
      failed.mockRestore(); signal.mockRestore();
      expect((await scope.close()).outcomes).toEqual([{ outcome: 'stopped' }]);
    }
  });
  it('returns fast/empty/nonzero commands and retires empty anchors', async () => fixture(async (scope, manager, executor, cwd) => {
    for (const command of ['true', 'printf hi; exit 7', '']) {
      const result = await executor.execute(command, cwd, { backgroundManager: manager });
      expect(result.exitCode).toBe(command.includes('7') ? 7 : 0);
      expect(scope.size).toBe(0);
    }
  }));
  it('settles forced timeout without RESULT and keeps partial output', async () => fixture(async (scope, manager, executor, cwd) => {
    const code = 'process.on("SIGTERM",()=>{});process.stdout.write("partial");setInterval(()=>{},1000)';
    const result = await executor.execute(`exec ${quote(process.execPath)} -e ${quote(code)}`, cwd, { backgroundManager: manager, timeoutSeconds: 1 });
    expect(result.timedOut).toBe(true); expect(result.exitCode).toBe(null); expect(result.stdout).toBe('partial');
    expect(scope.size).toBe(0);
  }));
  it('host stop is not a tool timeout and duplicate close shares the promise', async () => fixture(async (scope, manager, executor, cwd) => {
    const command = executor.execute('sleep 60', cwd, { backgroundManager: manager });
    await pause(200);
    const close = scope.close(); expect(scope.close()).toBe(close);
    await close; const result = await command;
    expect(result.timedOut).toBe(false); expect(scope.size).toBe(0);
  }));
  it('cancels an admitted launch and forbids later commands', async () => fixture(async (scope, manager, executor, cwd) => {
    const command = executor.execute('printf SHOULD_NOT_RUN', cwd, { backgroundManager: manager });
    await scope.close(); expect((await command).stdout).toBe('');
    await expect(manager.startCommand('true', cwd)).rejects.toThrow('shutting down');
  }));
  it('drains multiple groups collectively while an unrelated scope survives', async () => fixture(async (scope, manager, executor, cwd) => {
    const other = new NativeCommandProcessScope(); const resolver = new NonInteractiveShellResolver();
    const sentinel = await other.start(resolver.resolve('sleep 60', cwd));
    try {
      await Promise.all(Array.from({ length: 4 }, () => manager.startCommand('sleep 60', cwd)));
      const before = Date.now(); await scope.close(); expect(Date.now() - before).toBeLessThan(3000);
      expect((await other.members(sentinel)).length).toBeGreaterThan(0);
    } finally { await other.close(); }
  }));
});
it('WSL framing preserves no-newline stderr, split frames and invalid control-like bytes', () => {
  const frames: unknown[] = []; const decoder = new AnchorControlDecoder('nonce', f => frames.push(f));
  const chunks = ['user', '\x1enon', 'ce:READY:42\x1fmore', '\x1enonce:INVALID\x1f', 'tail'];
  const output = Buffer.concat([...chunks.map(c => decoder.push(Buffer.from(c))), decoder.flush()]).toString();
  expect(output).toBe('usermore\x1enonce:INVALID\x1ftail'); expect(frames).toEqual([{ kind: 'READY', pid: 42 }]);
});
