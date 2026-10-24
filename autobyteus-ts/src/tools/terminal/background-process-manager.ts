import { OutputBuffer } from './output-buffer.js';
import { stripAnsiCodes } from './ansi-utils.js';
import { BackgroundProcessInfo, BackgroundProcessOutput, type BackgroundProcessStatus } from './types.js';
import { NonInteractiveShellResolver } from './command-execution/non-interactive-shell-resolver.js';
import { ProcessGroupObserver, type ObservedProcess } from './command-execution/process-group-observer.js';
import { NativeCommandProcessScope } from './command-execution/native-command-process-scope.js';
import { type AnchoredCommandHandle } from './command-execution/anchored-command-launcher.js';
interface OutputCapture { output: OutputBuffer; append: (bytes: Buffer) => void }
interface BackgroundProcessRecord {
  pid: number; command: string; effectiveCwd: string; startedAt: Date;
  status: BackgroundProcessStatus; handle: AnchoredCommandHandle; output: OutputBuffer;
}
export class BackgroundProcessManager {
  private readonly processes = new Map<number, BackgroundProcessRecord>();
  private readonly outputs = new Map<AnchoredCommandHandle, OutputCapture>();
  readonly scope: NativeCommandProcessScope;
  constructor(private readonly maxOutputBytes = 1_000_000,
    private readonly resolver = new NonInteractiveShellResolver(),
    private readonly observer = new ProcessGroupObserver(), scope?: NativeCommandProcessScope) {
    this.scope = scope ?? new NativeCommandProcessScope(observer);
  }
  capture(handle: AnchoredCommandHandle): void {
    if (this.outputs.has(handle)) return;
    const output = new OutputBuffer(this.maxOutputBytes);
    const append = (bytes: Buffer) => output.append(bytes);
    this.outputs.set(handle, { output, append });
    handle.stdout.on('data', append);
    handle.stderr.on('data', append);
  }
  /** Foreground/failed launch captures have no record consumer after the caller returns. */
  releaseUnusedCapture(handle: AnchoredCommandHandle): void {
    if ([...this.processes.values()].some(record => record.handle === handle)) return;
    const capture = this.outputs.get(handle);
    if (!capture) return;
    handle.stdout.off('data', capture.append); handle.stderr.off('data', capture.append);
    this.outputs.delete(handle);
  }
  async startCommand(command: string, cwd: string): Promise<BackgroundProcessInfo> {
    let handle: AnchoredCommandHandle | undefined;
    try {
      handle = await this.scope.start(this.resolver.resolve(command, cwd), undefined, h => { handle = h; this.capture(h); });
      const record = this.record(handle.commandPid!, command, cwd, handle);
      void handle.completion.then(() => {
        if (record.status === 'running') record.status = 'exited';
        // Retain completed background history; only confirmed explicit stop removes it.
        void this.scope.retireCompleted(record.handle);
      });
      return this.info(record);
    } finally { if (handle) this.releaseUnusedCapture(handle); }
  }
  adoptObservedProcesses(options: { command: string; effectiveCwd: string;
    handle: AnchoredCommandHandle; processes: ObservedProcess[] }): BackgroundProcessInfo[] {
    if (!this.scope.isOpen || options.handle.stopReason) return [];
    return options.processes.map(p => this.info(this.processes.get(p.pid) ??
      this.record(p.pid, options.command, options.effectiveCwd, options.handle)));
  }
  private record(pid: number, command: string, cwd: string, handle: AnchoredCommandHandle): BackgroundProcessRecord {
    this.capture(handle);
    const record: BackgroundProcessRecord = { pid, command, effectiveCwd: cwd, startedAt: new Date(),
      status: 'running', handle, output: this.outputs.get(handle)!.output };
    this.processes.set(pid, record);
    return record;
  }
  private info(record: BackgroundProcessRecord): BackgroundProcessInfo {
    return new BackgroundProcessInfo(record.pid, record.command, record.startedAt, record.status, record.effectiveCwd);
  }
  async listProcesses(): Promise<BackgroundProcessInfo[]> {
    await Promise.all([...this.processes.values()].map(record => this.refresh(record)));
    return [...this.processes.values()].map(record => this.info(record));
  }
  async getOutput(pid: number, lines = 100): Promise<BackgroundProcessOutput> {
    const record = this.processes.get(pid);
    if (!record) throw new Error(`Process ${pid} not found`);
    await this.refresh(record);
    return new BackgroundProcessOutput(stripAnsiCodes(record.output.getLines(lines)), record.status === 'running', pid, record.status);
  }
  async stopProcess(pid: number): Promise<boolean> {
    const record = this.processes.get(pid);
    if (!record) return false;
    const result = await this.scope.stop(record.handle, 'explicit-stop');
    if (result.outcome === 'unconfirmed') throw new Error(`Command cleanup unconfirmed: ${result.reason}`);
    for (const [key, sibling] of this.processes) if (sibling.handle === record.handle) {
      sibling.status = 'stopped'; this.processes.delete(key);
    }
    this.releaseUnusedCapture(record.handle);
    return true;
  }
  async stopAll(): Promise<number> {
    const count = this.processes.size;
    const handles = new Set([...this.processes.values()].map(record => record.handle));
    const results = await Promise.all([...handles].map(handle => this.scope.stop(handle, 'explicit-stop')));
    if (results.some(result => result.outcome === 'unconfirmed')) throw new Error('Native background cleanup unconfirmed');
    this.processes.clear();
    for (const handle of handles) this.releaseUnusedCapture(handle);
    return count;
  }
  get processCount(): number { return this.processes.size; }
  private async refresh(record: BackgroundProcessRecord): Promise<void> {
    if (record.status === 'running' && !(await this.observer.isProcessRunning(record.pid, record.handle.invocation.processTarget)))
      record.status = 'exited';
  }
}
