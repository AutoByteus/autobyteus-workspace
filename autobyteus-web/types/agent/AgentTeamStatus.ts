export enum AgentTeamStatus {
  Offline = 'offline',
  Initializing = 'initializing',
  Idle = 'idle',
  Running = 'running',
  Error = 'error',
}

export const DEFAULT_TEAM_STATUS = AgentTeamStatus.Offline;
