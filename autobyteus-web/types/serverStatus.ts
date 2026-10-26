export enum ServerStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  ERROR = 'error',
  RESTARTING = 'restarting',
  SHUTTING_DOWN = 'shutting-down',
}

export type EmbeddedServerUrls = Readonly<{
  graphql: string
  rest: string
  graphqlWs: string
  transcription: string
  terminalWs: string
  health: string
}>

export type ServerStatusSnapshot = Readonly<{
  status: ServerStatus
  baseUrl: string
  urls: EmbeddedServerUrls
  diagnostic?: ServerDiagnostic
  healthCheckStatus: string
  message?: string
}>

export type ServerHealthResult = Readonly<{
  status: 'ok' | 'error' | 'starting'
  message?: string
  data?: unknown
}>

export interface PortConflictDiagnostic {
  kind: 'port-conflict'; port: number; owners: Array<{ pid: number; executable?: string }>;
  inspection: 'available' | 'unavailable'; observedAt: string;
}
export type ServerDiagnostic = PortConflictDiagnostic | { kind: 'shutdown-incomplete'; message: string };
