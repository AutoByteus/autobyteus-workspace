import type { NodeEndpoints } from '~/types/node'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'
import type { ApplicationHostTransport } from '~/types/application/ApplicationHostTransport'

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

export const buildApplicationHostTransport = (
  endpoints: NodeEndpoints,
  applicationId?: string | null,
): ApplicationHostTransport => {
  const restBaseUrl = endpoints.rest.replace(/\/+$/, '')
  const httpBaseUrl = normalizeNodeBaseUrl(restBaseUrl)
  const websocketBaseUrl = toWebsocketBase(httpBaseUrl)

  const encodedApplicationId = applicationId ? encodeURIComponent(applicationId) : null

  return {
    graphqlUrl: endpoints.graphqlHttp,
    restBaseUrl,
    websocketUrl: endpoints.graphqlWs,
    backendStatusUrl: encodedApplicationId
      ? `${httpBaseUrl}/rest/applications/${encodedApplicationId}/backend/status`
      : null,
    backendEnsureReadyUrl: encodedApplicationId
      ? `${httpBaseUrl}/rest/applications/${encodedApplicationId}/backend/ensure-ready`
      : null,
    backendQueriesBaseUrl: encodedApplicationId
      ? `${httpBaseUrl}/rest/applications/${encodedApplicationId}/backend/queries`
      : null,
    backendCommandsBaseUrl: encodedApplicationId
      ? `${httpBaseUrl}/rest/applications/${encodedApplicationId}/backend/commands`
      : null,
    backendGraphqlUrl: encodedApplicationId
      ? `${httpBaseUrl}/rest/applications/${encodedApplicationId}/backend/graphql`
      : null,
    backendRoutesBaseUrl: encodedApplicationId
      ? `${httpBaseUrl}/rest/applications/${encodedApplicationId}/backend/routes`
      : null,
    backendNotificationsUrl: encodedApplicationId
      ? `${websocketBaseUrl}/ws/applications/${encodedApplicationId}/backend/notifications`
      : null,
  }
}
