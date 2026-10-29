import { beforeDeadline } from './command-deadline.js';
import { execFile } from 'node:child_process';
import { HOST_PROCESS_TARGET, type ProcessExecutionTarget, type OwnedCommandGroup, type ObservedProcess } from './process-identity.js';
export type { ObservedProcess } from './process-identity.js';
export type ExecFileResult = { stdout: string; stderr?: string };
export type ExecFileRunner = (file: string, args: string[], options: {
  encoding: BufferEncoding; maxBuffer?: number; timeout?: number; env?: NodeJS.ProcessEnv;
}) => Promise<ExecFileResult>;
const run: ExecFileRunner = (file, args, options) => new Promise((resolve, reject) => {
  execFile(file, args, options, (error, stdout, stderr) => error ? reject(error) : resolve({ stdout, stderr }));
});
// /proc stat provides Linux start ticks and session identity without localized ps fields.
const LINUX_SNAPSHOT = String.raw`for f in /proc/[0-9]*/stat; do
  if ! IFS= read -r line < "$f" 2>/dev/null; then
    [ ! -e "$f" ] && continue
    exit 1
  fi
  pid=\${line%% *}; rest=\${line##*) }; name=\${line#*(}; name=\${name%)*}
  set -- $rest
  printf '%s %s %s %s %s %s\n' "$pid" "$2" "$3" "$4" "$1" "\${20}"
done`.replaceAll('\\$', '$');
export class ProcessGroupObserver {
  private readonly pending = new Map<string, Promise<ObservedProcess[]>>();
  constructor(private readonly runner: ExecFileRunner = run) {}
  snapshot(target: ProcessExecutionTarget = HOST_PROCESS_TARGET, deadline = Date.now() + 500): Promise<ObservedProcess[]> {
    const key = JSON.stringify(target);
    const existing = this.pending.get(key);
    if (existing) return beforeDeadline(existing, deadline);
    const promise = this.read(target, deadline).finally(() => this.pending.delete(key));
    this.pending.set(key, promise);
    return beforeDeadline(promise, deadline);
  }
  private async read(target: ProcessExecutionTarget, deadline: number): Promise<ObservedProcess[]> {
    const timeout = Math.min(500, deadline - Date.now());
    if (timeout <= 0) throw new Error('Process observation deadline exceeded');
    if (target.kind === 'host' && process.platform === 'win32') throw new Error('Host process groups unavailable on Windows');
    const { stdout } = await this.runner(target.kind === 'wsl' ? target.wslExecutable : 'ps',
      target.kind === 'wsl' ? ['-d', target.distro, '--exec', 'bash', '-c', LINUX_SNAPSHOT]
        : ['-axo', 'pid=,ppid=,pgid=,stat=,lstart=,comm='],
      { encoding: 'utf8', timeout, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, LC_ALL: 'C' } });
    if (!stdout.trim()) throw new Error('Empty process observation is not absence evidence');
    return stdout.split(/\r?\n/).filter(line => line.trim()).map(line => {
      const m = target.kind === 'wsl' ? /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s*$/.exec(line)
        : /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\w+\s+\w+\s+\d+\s+[\d:]+\s+\d+)\s*(.*)$/.exec(line);
      if (!m) throw new Error('Malformed process identity observation');
      return { pid: Number(m[1]), parentPid: Number(m[2]), processGroupId: Number(m[3]),
        ...(target.kind === 'wsl' ? { sessionId: Number(m[4]), status: m[5], birth: m[6], command: '' }
          : { status: m[4], birth: m[5], command: m[6] }) };
    }).filter(p => !p.status.includes('Z'));
  }
  async establish(target: ProcessExecutionTarget, pid: number, deadline: number): Promise<OwnedCommandGroup> {
    const anchor = (await this.snapshot(target, deadline)).find(p => p.pid === pid);
    if (!anchor || anchor.processGroupId !== pid || (target.kind === 'wsl' && anchor.sessionId !== pid))
      throw new Error('Command anchor is not a live exclusive process group');
    return { target, anchor };
  }
  matches(group: OwnedCommandGroup, processes: ObservedProcess[]): boolean {
    return processes.some(p => p.pid === group.anchor.pid && p.birth === group.anchor.birth &&
      p.processGroupId === group.anchor.pid && (group.target.kind !== 'wsl' || p.sessionId === group.anchor.pid));
  }
  async signal(group: OwnedCommandGroup, signal: 'TERM' | 'KILL', deadline: number, anchorStillLive: () => boolean): Promise<void> {
    if (!this.matches(group, await this.snapshot(group.target, deadline))) throw new Error('Command anchor identity lost');
    if (!anchorStillLive()) throw new Error('Command anchor exit observed');
    if (Date.now() >= deadline) throw new Error('Process signal deadline exceeded');
    if (group.target.kind === 'host') process.kill(-group.anchor.pid, signal === 'TERM' ? 'SIGTERM' : 'SIGKILL');
    else await this.runner(group.target.wslExecutable,
      ['-d', group.target.distro, '--exec', '/bin/kill', `-${signal}`, '--', `-${group.anchor.pid}`],
      { encoding: 'utf8', timeout: Math.max(1, Math.min(500, deadline - Date.now())), maxBuffer: 32768 });
  }
  async isProcessRunning(pid: number, target = HOST_PROCESS_TARGET): Promise<boolean> {
    return (await this.snapshot(target)).some(p => p.pid === pid);
  }
}
