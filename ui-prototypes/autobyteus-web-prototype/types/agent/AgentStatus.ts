export enum AgentStatus {
  Offline = 'offline',
  Initializing = 'initializing',
  Idle = 'idle',
  Running = 'running',
  Error = 'error',
}

export const DEFAULT_AGENT_STATUS = AgentStatus.Offline;
