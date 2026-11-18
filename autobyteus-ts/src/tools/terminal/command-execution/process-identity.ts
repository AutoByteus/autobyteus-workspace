export type ProcessExecutionTarget =
  | { kind: 'host' }
  | { kind: 'wsl'; wslExecutable: string; distro: string };
export const HOST_PROCESS_TARGET: ProcessExecutionTarget = { kind: 'host' };
export interface ObservedProcess {
  pid: number;
  parentPid: number;
  processGroupId: number;
  sessionId?: number;
  status: string;
  birth: string;
  command: string;
}
export interface OwnedCommandGroup {
  target: ProcessExecutionTarget;
  anchor: ObservedProcess;
}
export type CommandStopOutcome = { outcome: 'stopped' | 'already-exited' } |
  { outcome: 'unconfirmed'; reason: string };
