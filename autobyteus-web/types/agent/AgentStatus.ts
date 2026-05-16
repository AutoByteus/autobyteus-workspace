export enum AgentStatus {
  Offline = 'offline',
  Idle = 'idle',
  Running = 'running',
  Error = 'error',
}

export const DEFAULT_AGENT_STATUS = AgentStatus.Offline;
