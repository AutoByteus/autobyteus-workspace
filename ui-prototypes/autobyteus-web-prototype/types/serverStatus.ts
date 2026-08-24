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
  healthCheckStatus: string
  message?: string
}>

export type ServerHealthResult = Readonly<{
  status: 'ok' | 'error' | 'starting'
  message?: string
  data?: unknown
}>
