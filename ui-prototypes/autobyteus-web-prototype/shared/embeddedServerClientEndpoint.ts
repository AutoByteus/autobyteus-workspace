export const EMBEDDED_SERVER_CLIENT_HOST = '127.0.0.1' as const
export const PRODUCTION_EMBEDDED_SERVER_PORT = 29695

export type EmbeddedServerClientEndpoint = Readonly<{
  host: typeof EMBEDDED_SERVER_CLIENT_HOST
  port: number
}>

export function createEmbeddedServerClientEndpoint(port: number): EmbeddedServerClientEndpoint {
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid embedded server client port: ${port}`)
  }

  return Object.freeze({
    host: EMBEDDED_SERVER_CLIENT_HOST,
    port,
  })
}

export const PRODUCTION_EMBEDDED_SERVER_CLIENT_ENDPOINT =
  createEmbeddedServerClientEndpoint(PRODUCTION_EMBEDDED_SERVER_PORT)

export function formatEmbeddedServerClientBaseUrl(
  endpoint: EmbeddedServerClientEndpoint,
): string {
  return `http://${endpoint.host}:${endpoint.port}`
}

export function formatEmbeddedServerClientWebSocketBaseUrl(
  endpoint: EmbeddedServerClientEndpoint,
): string {
  return `ws://${endpoint.host}:${endpoint.port}`
}

export const PRODUCTION_EMBEDDED_SERVER_BASE_URL =
  formatEmbeddedServerClientBaseUrl(PRODUCTION_EMBEDDED_SERVER_CLIENT_ENDPOINT)

export const PRODUCTION_EMBEDDED_SERVER_WS_BASE_URL =
  formatEmbeddedServerClientWebSocketBaseUrl(PRODUCTION_EMBEDDED_SERVER_CLIENT_ENDPOINT)
