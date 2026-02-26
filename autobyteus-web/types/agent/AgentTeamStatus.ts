export enum AgentTeamStatus {
  Uninitialized = 'uninitialized',
  Bootstrapping = 'bootstrapping',
  Idle = 'idle',
  Processing = 'processing',
  ShuttingDown = 'shutting_down',
  ShutdownComplete = 'shutdown_complete',
  Error = 'error',
}

export const DEFAULT_TEAM_STATUS = AgentTeamStatus.Uninitialized
