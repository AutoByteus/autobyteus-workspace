export enum AgentTeamStatus {
  UNINITIALIZED = 'uninitialized',
  BOOTSTRAPPING = 'bootstrapping',
  IDLE = 'idle',
  PROCESSING = 'processing',
  SHUTTING_DOWN = 'shutting_down',
  SHUTDOWN_COMPLETE = 'shutdown_complete',
  ERROR = 'error'
}

export function isTerminal(status: AgentTeamStatus): boolean {
  return status === AgentTeamStatus.SHUTDOWN_COMPLETE || status === AgentTeamStatus.ERROR;
}
