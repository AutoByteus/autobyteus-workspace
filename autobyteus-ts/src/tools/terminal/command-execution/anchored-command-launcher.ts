import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { PassThrough } from 'node:stream';
import { type NonInteractiveShellInvocation } from './non-interactive-shell-resolver.js';
import { type OwnedCommandGroup, type CommandStopOutcome } from './process-identity.js';
import { AnchorControlDecoder, parseAnchorFrame, type AnchorFrame } from './anchor-control-protocol.js';
import { POSIX_COMMAND_ANCHOR_SCRIPT } from './posix-command-anchor-script.js';
import { WSL_COMMAND_ANCHOR_SCRIPT } from './wsl-command-anchor-script.js';
export type StopReason = 'tool-timeout' | 'tool-abort' | 'host-shutdown' | 'explicit-stop';
export type CommandCompletion = { kind: 'result'; code: number | null; signal: string | null } |
  { kind: 'interrupted'; reason: StopReason } | { kind: 'failed'; reason: string; message: string };
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  void promise.catch(() => {}); // STARTED may fail before its caller has passed the READY gate.
  return { promise, resolve, reject };
}
/** Exactly-once command settlement, distinct from scope-owned cleanup confirmation. */
export class AnchoredCommandHandle {
  readonly stdout = new PassThrough();
  readonly stderr = new PassThrough();
  private readonly readyLatch = deferred<number>();
  private readonly startedLatch = deferred<number>();
  private readonly completionLatch = deferred<CommandCompletion>();
  private readonly exitLatch = deferred<void>();
  readonly ready = this.readyLatch.promise;
  readonly started = this.startedLatch.promise;
  readonly completion = this.completionLatch.promise;
  readonly exited = this.exitLatch.promise;
  group?: OwnedCommandGroup;
  commandPid?: number;
  stopReason?: StopReason;
  completed?: CommandCompletion;
  startCommitted = false;
  anchorExited = false;
  private anchorPid?: number;
  private lost = false;
  private lossTimer?: NodeJS.Timeout;
  private decoder?: AnchorControlDecoder;
  private readonly nonce = randomBytes(16).toString('hex');
  readonly child: ChildProcess;
  constructor(readonly invocation: NonInteractiveShellInvocation) {
    const target = invocation.processTarget;
    this.child = target.kind === 'host'
      ? spawn(process.execPath, ['-e', POSIX_COMMAND_ANCHOR_SCRIPT], {
        cwd: invocation.cwd, env: { ...invocation.env, ...(process.versions.electron ? { ELECTRON_RUN_AS_NODE: '1' } : {}) },
        detached: true, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })
      : spawn(target.wslExecutable, ['-d', target.distro, '--cd', invocation.wslCwd!, '--exec',
        'setsid', '--wait', 'bash', '--noprofile', '--norc', '-c', WSL_COMMAND_ANCHOR_SCRIPT,
        'autobyteus-anchor', this.nonce, invocation.executable, ...invocation.args],
        { env: invocation.env, stdio: ['pipe', 'pipe', 'pipe'] });
    if (target.kind === 'wsl') this.decoder = new AnchorControlDecoder(this.nonce, frame => this.frame(frame));
    this.child.stdout?.on('data', (bytes: Buffer) => !this.stdout.writableEnded && this.stdout.write(bytes));
    this.child.stderr?.on('data', (bytes: Buffer) => !this.stderr.writableEnded && this.stderr.write(this.decoder ? this.decoder.push(bytes) : bytes));
    this.child.on('message', value => { const frame = parseAnchorFrame(value); if (frame) this.frame(frame); });
    this.child.once('error', error => { this.anchorExited = true; this.exitLatch.resolve(); this.fail(error.message); });
    this.child.once('exit', () => { this.anchorExited = true; this.exitLatch.resolve(); this.controlLost(); });
    this.child.once('disconnect', () => this.controlLost());
    this.child.stdin?.on('error', error => this.fail(error.message));
  }
  private frame(frame: AnchorFrame): void {
    if (frame.kind === 'READY') {
      if (this.anchorPid !== undefined || this.lost) return;
      if (this.invocation.processTarget.kind === 'host' && frame.pid !== this.child.pid) return this.fail('Anchor PID mismatch');
      this.anchorPid = frame.pid;
      this.readyLatch.resolve(frame.pid);
    } else if (frame.kind === 'STARTED') {
      if (!this.startCommitted || this.commandPid !== undefined || this.completed) return;
      this.commandPid = frame.pid;
      this.startedLatch.resolve(frame.pid);
    } else if (frame.kind === 'RESULT') {
      if (this.startCommitted && this.commandPid !== undefined) this.settle({ kind: 'result', code: frame.code, signal: frame.signal });
    } else if (frame.kind === 'SPAWN_FAILED') this.fail(frame.message);
  }
  private settle(outcome: CommandCompletion): void {
    if (this.completed) return;
    this.completed = outcome;
    clearTimeout(this.lossTimer);
    this.completionLatch.resolve(outcome);
    if (this.commandPid === undefined) this.startedLatch.reject(new Error('Command ended before STARTED'));
  }
  private fail(message: string): void {
    const error = new Error(message.slice(0, 512));
    this.readyLatch.reject(error); this.startedLatch.reject(error);
    this.settle({ kind: 'failed', reason: 'control-failure', message: error.message });
  }
  private controlLost(): void {
    if (this.lost) return;
    this.lost = true;
    this.readyLatch.reject(new Error('Anchor control lost'));
    this.startedLatch.reject(new Error('Anchor control lost before STARTED'));
    this.lossTimer = setTimeout(() => {
      if (!this.stopReason) this.fail('Anchor exited or control disconnected before command result');
      // Expected stops settle through bounded scope.finishStop, never pipe close.
    }, 50);
  }
  start(): void {
    if (this.startCommitted || this.stopReason || this.lost || !this.group) throw new Error('Command launch cancelled or unverified');
    this.startCommitted = true;
    this.send('START');
  }
  private send(kind: 'START' | 'RELEASE'): void {
    if (this.invocation.processTarget.kind === 'wsl') {
      this.child.stdin!.write(`${this.nonce}:${kind}\n`);
    } else if (this.child.connected) {
      this.child.send({ kind, ...(kind === 'START' ? { executable: this.invocation.executable,
        args: this.invocation.args, cwd: this.invocation.cwd, env: this.invocation.env } : {}) },
      error => { if (error) this.fail(error.message); });
    } else this.fail('Anchor control disconnected');
  }
  noteStopRequested(reason: StopReason): void { this.stopReason ??= reason; }
  finishStop(outcome: CommandStopOutcome): void {
    if (outcome.outcome === 'unconfirmed') this.settle({ kind: 'failed', reason: 'cleanup-unconfirmed', message: outcome.reason });
    else this.settle({ kind: 'interrupted', reason: this.stopReason ?? 'explicit-stop' });
  }
  cancelGate(): void {
    this.readyLatch.reject(new Error('Command launch cancelled'));
    this.startedLatch.reject(new Error('Command launch cancelled'));
    if (this.child.connected) this.child.disconnect();
    this.child.stdin?.end();
  }
  release(): void { this.send('RELEASE'); }
  flushOutput(): void {
    if (this.decoder && !this.stderr.writableEnded) { const bytes = this.decoder.flush(); if (bytes.length) this.stderr.write(bytes); }
  }
  dispose(): void {
    clearTimeout(this.lossTimer); this.flushOutput();
    this.child.stdout?.destroy(); this.child.stderr?.destroy(); this.child.stdin?.destroy();
    this.stdout.end(); this.stderr.end();
  }
}
export class AnchoredCommandLauncher {
  launch(invocation: NonInteractiveShellInvocation): AnchoredCommandHandle { return new AnchoredCommandHandle(invocation); }
}
