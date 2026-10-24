import { AnchoredCommandLauncher, AnchoredCommandHandle, beforeDeadline, type StopReason } from './anchored-command-launcher.js';
import { ProcessGroupObserver } from './process-group-observer.js';
import { type NonInteractiveShellInvocation } from './non-interactive-shell-resolver.js';
import { type CommandStopOutcome, type ObservedProcess } from './process-identity.js';
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
export interface NativeCommandCloseReport { outcomes: CommandStopOutcome[] }
/** Host lifetime, independent of transient agent/output records. */
export class NativeCommandProcessScope {
  private state: 'open' | 'closing' | 'closed' = 'open';
  private readonly retired = new WeakSet<AnchoredCommandHandle>();
  private readonly leases = new Set<AnchoredCommandHandle>();
  private readonly operations = new Map<AnchoredCommandHandle, Promise<CommandStopOutcome>>();
  private closePromise?: Promise<NativeCommandCloseReport>;
  private maintenance?: Promise<void>;
  private timer?: NodeJS.Timeout;
  constructor(private readonly observer = new ProcessGroupObserver(), private readonly launcher = new AnchoredCommandLauncher()) {}
  get isOpen(): boolean { return this.state === 'open'; }
  get size(): number { return this.leases.size; }
  async start(invocation: NonInteractiveShellInvocation, deadline = Date.now() + 1500,
    attach?: (handle: AnchoredCommandHandle) => void): Promise<AnchoredCommandHandle> {
    if (!this.isOpen) throw new Error('Native command scope is shutting down');
    const handle = this.launcher.launch(invocation);
    this.leases.add(handle); // synchronous admission before any readiness wait
    attach?.(handle);
    if (!this.timer) {
      this.timer = setInterval(() => {
        if (this.isOpen && !this.maintenance) this.maintenance = this.retireEmpty().finally(() => { this.maintenance = undefined; });
      }, 1000);
      this.timer.unref();
    }
    try {
      const pid = await beforeDeadline(handle.ready, deadline);
      const group = await this.observer.establish(invocation.processTarget, pid, deadline);
      if (!this.isOpen || handle.stopReason) throw new Error('Command launch cancelled by shutdown');
      handle.group = group;
      handle.start(); // no await between final admission check and START
      await beforeDeadline(handle.started, deadline);
      return handle;
    } catch (error) {
      await this.stop(handle, 'explicit-stop');
      throw error;
    }
  }
  async members(handle: AnchoredCommandHandle, deadline = Date.now() + 500): Promise<ObservedProcess[]> {
    if (this.retired.has(handle)) return [];
    if (!this.leases.has(handle) || !handle.group) throw new Error('Command group is not verified');
    const rows = await this.observer.snapshot(handle.group.target, deadline);
    if (!this.observer.matches(handle.group, rows) || handle.anchorExited) throw new Error('Command anchor identity lost');
    return rows.filter(p => p.processGroupId === handle.group!.anchor.pid && p.pid !== handle.group!.anchor.pid);
  }
  stop(handle: AnchoredCommandHandle, reason: StopReason, deadline = Date.now() + 3000): Promise<CommandStopOutcome> {
    handle.noteStopRequested(reason);
    if (this.retired.has(handle)) return Promise.resolve({ outcome: 'already-exited' });
    if (!this.leases.has(handle)) return Promise.resolve({ outcome: 'unconfirmed', reason: 'Command lease does not belong to this scope' });
    const pending = this.operations.get(handle);
    if (pending) return pending;
    const operation = this.drain(handle, deadline).then(outcome => {
      handle.finishStop(outcome);
      if (outcome.outcome !== 'unconfirmed') this.retire(handle);
      return outcome;
    }).finally(() => this.operations.delete(handle));
    this.operations.set(handle, operation);
    return operation;
  }
  private async drain(handle: AnchoredCommandHandle, deadline: number): Promise<CommandStopOutcome> {
    try {
      if (!handle.startCommitted) {
        handle.cancelGate();
        try { await beforeDeadline(handle.exited, Math.min(deadline, Date.now() + 500)); }
        catch { if (!handle.anchorExited) handle.child.kill('SIGKILL'); await beforeDeadline(handle.exited, deadline); }
        return { outcome: 'already-exited' };
      }
      const group = handle.group!;
      await this.members(handle, deadline);
      await this.observer.signal(group, 'TERM', deadline);
      await sleep(Math.max(0, Math.min(500, deadline - Date.now())));
      const members = await this.members(handle, deadline);
      if (!members.length) {
        handle.release();
        await beforeDeadline(handle.exited, deadline);
      } else {
        await this.observer.signal(group, 'KILL', deadline);
      }
      while (Date.now() < deadline) {
        const rows = await this.observer.snapshot(group.target, deadline);
        if (!rows.some(p => p.processGroupId === group.anchor.pid) && handle.anchorExited) return { outcome: 'stopped' };
        await sleep(Math.min(30, Math.max(0, deadline - Date.now())));
      }
      throw new Error('Command group absence not confirmed before deadline');
    } catch (error) { return { outcome: 'unconfirmed', reason: error instanceof Error ? error.message : String(error) }; }
  }
  private retire(handle: AnchoredCommandHandle): void {
    this.leases.delete(handle); this.retired.add(handle); handle.dispose();
    if (!this.leases.size) { clearInterval(this.timer); this.timer = undefined; }
  }
  async retireCompleted(handle: AnchoredCommandHandle): Promise<void> {
    if (!this.isOpen || this.operations.has(handle) || !handle.completed || handle.stopReason) return;
    const operation = (async (): Promise<CommandStopOutcome> => {
      try {
        const deadline = Date.now() + 500;
        if ((await this.members(handle, deadline)).length) return { outcome: 'unconfirmed', reason: 'Group still active' };
        if (!this.isOpen) return { outcome: 'unconfirmed', reason: 'Host close owns retirement' };
        handle.release();
        await beforeDeadline(handle.exited, deadline);
        this.retire(handle);
        return { outcome: 'already-exited' };
      } catch (error) { return { outcome: 'unconfirmed', reason: String(error) }; }
    })();
    this.operations.set(handle, operation);
    try { await operation; } finally { this.operations.delete(handle); }
  }
  private async retireEmpty(): Promise<void> { await Promise.all([...this.leases].map(h => this.retireCompleted(h))); }
  close(): Promise<NativeCommandCloseReport> {
    if (this.closePromise) return this.closePromise;
    this.state = 'closing'; clearInterval(this.timer);
    const deadline = Date.now() + 3000;
    for (const handle of this.leases) handle.noteStopRequested('host-shutdown');
    this.closePromise = (async () => {
      try {
        await beforeDeadline(Promise.all([this.maintenance, ...this.operations.values()]), deadline);
      } catch (error) {
        const outcomes: CommandStopOutcome[] = [...this.leases].map(handle => {
          const outcome = { outcome: 'unconfirmed' as const, reason: String(error) };
          handle.finishStop(outcome); return outcome;
        });
        this.state = 'closed'; return { outcomes };
      }
      const outcomes = await Promise.all([...this.leases].map(h => this.stop(h, 'host-shutdown', deadline)));
      this.state = 'closed'; return { outcomes };
    })();
    return this.closePromise;
  }
}
