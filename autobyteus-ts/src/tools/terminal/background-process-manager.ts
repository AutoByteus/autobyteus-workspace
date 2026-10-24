import { OutputBuffer } from './output-buffer.js';
import { stripAnsiCodes } from './ansi-utils.js';
import { BackgroundProcessInfo, BackgroundProcessOutput, type BackgroundProcessStatus } from './types.js';
import { NonInteractiveShellResolver } from './command-execution/non-interactive-shell-resolver.js';
import { ProcessGroupObserver, type ObservedProcess } from './command-execution/process-group-observer.js';
import { NativeCommandProcessScope } from './command-execution/native-command-process-scope.js';
import { type AnchoredCommandHandle } from './command-execution/anchored-command-launcher.js';
interface BackgroundProcessRecord {
  pid: number; command: string; effectiveCwd: string; startedAt: Date;
  status: BackgroundProcessStatus; handle: AnchoredCommandHandle; output: OutputBuffer;
}
export class BackgroundProcessManager {
  private readonly processes = new Map<number, BackgroundProcessRecord>();
  private readonly outputs = new Map<AnchoredCommandHandle, OutputBuffer>();
  readonly scope: NativeCommandProcessScope;
  constructor(private readonly maxOutputBytes = 1_000_000,
    private readonly resolver = new NonInteractiveShellResolver(),
    private readonly observer = new ProcessGroupObserver(), scope?: NativeCommandProcessScope) {
    this.scope = scope ?? new NativeCommandProcessScope(observer);
  }
  capture(handle: AnchoredCommandHandle): void {
    if (this.outputs.has(handle)) return;
    const output = new OutputBuffer(this.maxOutputBytes);
    this.outputs.set(handle, output);
    handle.stdout.on('data', bytes => output.append(bytes));
    handle.stderr.on('data', bytes => output.append(bytes));
  }
  async startCommand(command: string, cwd: string): Promise<BackgroundProcessInfo> {
    const handle = await this.scope.start(this.resolver.resolve(command, cwd), undefined, h => this.capture(h));
    const record = this.record(handle.commandPid!, command, cwd, handle);
    void handle.completion.then(result => {
      if (record.status === 'running') record.status = 'exited';
      // Completion does not prove cleanup: only explicit successful stop uses 'stopped'.
      void this.scope.retireCompleted(handle);
    });
    return this.info(record);
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
      status: 'running', handle, output: this.outputs.get(handle)! };
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
    this.outputs.delete(record.handle);
    return true;
  }
  async stopAll(): Promise<number> {
    const count = this.processes.size;
    const handles = new Set([...this.processes.values()].map(record => record.handle));
    const results = await Promise.all([...handles].map(handle => this.scope.stop(handle, 'explicit-stop')));
    if (results.some(result => result.outcome === 'unconfirmed')) throw new Error('Native background cleanup unconfirmed');
    this.processes.clear(); this.outputs.clear(); return count;
  }
  get processCount(): number { return this.processes.size; }
  private async refresh(record: BackgroundProcessRecord): Promise<void> {
    if (record.status === 'running' && !(await this.observer.isProcessRunning(record.pid, record.handle.invocation.processTarget)))
      record.status = 'exited';
  }
}
