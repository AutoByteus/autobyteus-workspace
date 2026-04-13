import type { NodeEndpoints } from '~/types/node'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'
import type { ApplicationSessionTransport } from '~/types/application/ApplicationSession'

const toWebsocketBase = (httpBaseUrl: string): string => {
  const normalized = (httpBaseUrl || '').trim().replace(/\/+$/, '')
  if (normalized.startsWith('https://')) {
    return `wss://${normalized.slice('https://'.length)}`
  }
  if (normalized.startsWith('http://')) {
    return `ws://${normalized.slice('http://'.length)}`
  }
  throw new Error(`Unsupported HTTP base URL '${httpBaseUrl}'.`)
}

export const buildApplicationSessionTransport = (
  endpoints: NodeEndpoints,
): ApplicationSessionTransport => {
  const restBaseUrl = endpoints.rest.replace(/\/+$/, '')
  const httpBaseUrl = normalizeNodeBaseUrl(restBaseUrl)
  const websocketBaseUrl = toWebsocketBase(httpBaseUrl)

  return {
    graphqlUrl: endpoints.graphqlHttp,
    restBaseUrl,
    websocketUrl: endpoints.graphqlWs,
    sessionStreamUrl: `${websocketBaseUrl}/ws/application-session`,
  }
}
