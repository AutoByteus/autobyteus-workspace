import { randomBytes, randomUUID } from 'node:crypto';
import { constants as osConstants } from 'node:os';
import path from 'node:path';
import type { BackgroundTaskEnd, BackgroundTaskOutcome, BackgroundTaskStart } from './types.js';
import { BackgroundOutputLog, backgroundOutputFolder, removeBackgroundOutputFolder } from './background-output-log.js';
import { wrapCommand } from './command-execution/command-wrapper.js';
import { NonInteractiveShellResolver } from './command-execution/non-interactive-shell-resolver.js';
import { NativeCommandProcessScope } from './command-execution/native-command-process-scope.js';
import { ShellCommandExecutor, type ShellCall } from './command-execution/shell-command-executor.js';
import type { AnchoredCommandHandle } from './command-execution/anchored-command-launcher.js';

/** One background task as the platform knows it: its start, and its end once it ended. */
export type BackgroundTaskState = Readonly<{ task: BackgroundTaskStart; end: BackgroundTaskEnd | null }>;
export type BackgroundTaskChangeListener = (change: BackgroundTaskState) => void;

export interface CommandRunOptions {
  /** The background form: the whole command is the one job; the call returns once it started. */
  background: boolean;
  /** Limits a foreground call's foreground part. */
  timeoutSeconds?: number;
  signal?: AbortSignal | null;
}

/** A call up to its foreground end, with the background tasks it left running. */
export type CommandRunOutcome = Readonly<{ call: ShellCall; started: BackgroundTaskStart[] }>;

interface TaskRecord {
  task: BackgroundTaskStart;
  startedMs: number;
  handle: AnchoredCommandHandle;
  log: BackgroundOutputLog;
  end: BackgroundTaskEnd | null;
  /** Order of ends; a call reports the ends recorded after its mark. */
  endSequence: number;
  /** Not yet in a run_bash result or a notice. Ends of a platform stop (run end, app quit) never are. */
  unreported: boolean;
}

const END_SETTLE_MS = 300;
const signalNames = new Map(Object.entries(osConstants.signals).map(([name, number]) => [number, name]));
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

/** A wait status: 0-128 is an exit code, above 128 the signal `status - 128` (R-2). */
export function backgroundTaskOutcome(status: number): BackgroundTaskOutcome {
  if (status <= 128) return { exitCode: status };
  return { signal: signalNames.get(status - 128) ?? `SIG${status - 128}` };
}

const pidExists = (pid: number): boolean => {
  try { process.kill(pid, 0); return true; } catch (error) { return (error as NodeJS.ErrnoException).code === 'EPERM'; }
};

/**
 * The per-agent owner of native commands beyond their call: runs every `run_bash` call through the command
 * wrapper, keeps the background tasks the calls leave (start, end, whether the end was reported), tells its
 * listener about each change, and stops the agent's commands when its run ends.
 */
export class BackgroundProcessManager {
  readonly scope: NativeCommandProcessScope;
  private readonly tasks = new Map<number, TaskRecord>();
  /** Command groups of this agent's calls still owned by the scope after their call returned. */
  private readonly handles = new Set<AnchoredCommandHandle>();
  private readonly logs = new Set<BackgroundOutputLog>();
  private readonly listeners = new Set<BackgroundTaskChangeListener>();
  private readonly ownerId: string;
  private readonly resolver: () => NonInteractiveShellResolver;
  private readonly executor: ShellCommandExecutor;
  private endSequence = 0;
  private runEnded = false;

  constructor(options: Readonly<{
    /** Names the agent's output folder (its agent id). */
    ownerId?: string;
    /** Called per call: the run's child environment is evaluated for each execution. */
    resolver?: () => NonInteractiveShellResolver;
    /** The host scope; a standalone scope when absent (tests, a context without a host). */
    scope?: NativeCommandProcessScope;
    executor?: ShellCommandExecutor;
  }> = {}) {
    this.scope = options.scope ?? new NativeCommandProcessScope();
    this.ownerId = options.ownerId ?? randomUUID();
    this.resolver = options.resolver ?? (() => new NonInteractiveShellResolver());
    this.executor = options.executor ?? new ShellCommandExecutor();
  }

  async run(command: string, cwd: string, options: CommandRunOptions): Promise<CommandRunOutcome> {
    const nonce = randomBytes(16).toString('hex');
    const resolver = this.resolver();
    // The `sh` fallback runs foreground calls unwrapped (no `&` tracking); it supports the background form.
    const wrapped = options.background || resolver.shell() === 'bash';
    const script = wrapped ? wrapCommand(command, options.background ? 'background' : 'foreground', nonce) : command;
    const invocation = { ...resolver.resolve(script, cwd), ...(wrapped ? { wrapperNonce: nonce } : {}) };
    const call = await this.executor.execute(invocation, this.scope,
      { timeoutSeconds: options.background ? null : options.timeoutSeconds ?? 30, signal: options.signal });
    const handle = call.handle;
    if (!handle) return { call, started: [] };
    const jobPids = call.foreground?.jobPids ?? [];
    if (this.runEnded || !this.scope.isOpen) {
      handle.laterOutput.resume();
      if (this.runEnded) void this.scope.stop(handle, 'run-end');
      return { call, started: [] };
    }
    let started: BackgroundTaskStart[] = [];
    if (jobPids.length) {
      const log = this.openLog(handle, resolver);
      if (options.background) log.append(Buffer.from(call.stdout + call.stderr));
      handle.laterOutput.on('data', (bytes: Buffer) => log.append(bytes));
      handle.laterOutput.once('end', () => { log.close(); this.logs.delete(log); });
      started = jobPids.map(pid => this.register(pid, command, cwd, handle, log));
      handle.onJobEnded((pid, status) => this.recordEnd(pid, handle, backgroundTaskOutcome(status)));
    } else {
      handle.laterOutput.resume();
    }
    this.own(handle);
    return { call, started };
  }

  /** Marks the start of a foreground call: its result reports the ends recorded after this mark (REQ-015). */
  markCallStart(): number { return this.endSequence; }

  /**
   * The unreported ends recorded since `mark`, now reported. A task whose process is already gone (the agent's
   * own `kill <pid>`) gets up to 300 ms for its end frame first (host only: WSL pids are not host pids).
   */
  async takeEndsSince(mark: number): Promise<BackgroundTaskEnd[]> {
    const deadline = Date.now() + END_SETTLE_MS;
    while (Date.now() < deadline && [...this.tasks.values()].some(record => !record.end
      && record.handle.invocation.processTarget.kind === 'host' && !pidExists(record.task.pid))) await sleep(20);
    return this.take(record => record.endSequence > mark);
  }

  /** Every unreported end, now reported (the notice's batch). */
  takeUnreported(): BackgroundTaskEnd[] { return this.take(() => true); }

  /** The agent's background tasks: running ones and ended ones. */
  list(): BackgroundTaskState[] { return [...this.tasks.values()].map(record => ({ task: record.task, end: record.end })); }

  hasRunning(): boolean { return [...this.tasks.values()].some(record => !record.end); }

  onChange(listener: BackgroundTaskChangeListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  /**
   * Run end: stops every command group of this agent through the scope (verified), records the ends as never
   * reportable and removes the agent's output logs. Returns the reasons of stops that were not confirmed.
   */
  async stopAllForRunEnd(): Promise<string[]> {
    this.runEnded = true;
    const outcomes = await Promise.all([...this.handles].map(handle => this.scope.stop(handle, 'run-end')));
    for (const record of this.tasks.values())
      if (!record.end) this.recordEnd(record.task.pid, record.handle, { error: 'Stopped when the run ended' });
    for (const log of this.logs) log.close();
    await removeBackgroundOutputFolder(this.ownerId);
    return outcomes.flatMap(outcome => outcome.outcome === 'unconfirmed' ? [outcome.reason] : []);
  }

  private openLog(handle: AnchoredCommandHandle, resolver: NonInteractiveShellResolver): BackgroundOutputLog {
    const hostPath = path.join(backgroundOutputFolder(this.ownerId), `call-${Date.now()}-${handle.child.pid ?? 0}.log`);
    const log = new BackgroundOutputLog(hostPath, resolver.shellPath(hostPath));
    this.logs.add(log);
    return log;
  }

  private register(pid: number, command: string, cwd: string, handle: AnchoredCommandHandle, log: BackgroundOutputLog): BackgroundTaskStart {
    const startedMs = Date.now();
    const task: BackgroundTaskStart = { pid, command, effectiveCwd: cwd, outputFile: log.shellPath,
      startedAt: new Date(startedMs).toISOString() };
    // A reused pid replaces the ended record of the same pid (R-1).
    this.tasks.set(pid, { task, startedMs, handle, log, end: null, endSequence: 0, unreported: false });
    this.emit({ task, end: null });
    return task;
  }

  /** The call's group is the agent's until the scope retires it; tasks whose end frame never came end lost. */
  private own(handle: AnchoredCommandHandle): void {
    this.handles.add(handle);
    void handle.completion.then(async () => {
      if (!handle.stopReason && this.scope.isOpen) await this.scope.retireCompleted(handle);
      for (const record of this.tasks.values()) if (record.handle === handle && !record.end)
        this.recordEnd(record.task.pid, handle, { error: 'The command wrapper exited without reporting how this task ended' });
      if (!this.scope.holds(handle)) this.handles.delete(handle);
    });
  }

  private recordEnd(pid: number, handle: AnchoredCommandHandle, outcome: BackgroundTaskOutcome): void {
    const record = this.tasks.get(pid);
    if (!record || record.handle !== handle || record.end) return;
    const platformStop = this.runEnded || handle.stopReason === 'host-shutdown' || handle.stopReason === 'run-end';
    record.end = { pid, command: record.task.command, outcome, durationMs: Date.now() - record.startedMs,
      outputFile: record.task.outputFile, lastLines: record.log.lastLines() };
    record.endSequence = ++this.endSequence;
    record.unreported = !platformStop;
    this.emit({ task: record.task, end: record.end });
  }

  private take(filter: (record: TaskRecord) => boolean): BackgroundTaskEnd[] {
    const taken = [...this.tasks.values()].filter(record => record.unreported && filter(record))
      .sort((a, b) => a.endSequence - b.endSequence);
    for (const record of taken) record.unreported = false;
    return taken.map(record => record.end!);
  }

  private emit(change: BackgroundTaskState): void {
    for (const listener of this.listeners) {
      try { listener(change); } catch (error) { console.warn(`Background task listener failed: ${String(error)}`); }
    }
  }
}
