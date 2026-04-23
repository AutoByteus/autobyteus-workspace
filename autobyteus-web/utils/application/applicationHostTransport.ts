import type { ApplicationHostTransport } from '@autobyteus/application-sdk-contracts'
import type { NodeEndpoints } from '~/types/node'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

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
  const httpBaseUrl = normalizeNodeBaseUrl(endpoints.rest.replace(/\/+$/, ''))
  const websocketBaseUrl = toWebsocketBase(httpBaseUrl)
  const encodedApplicationId = applicationId ? encodeURIComponent(applicationId) : null

  return {
    backendBaseUrl: encodedApplicationId
      ? `${httpBaseUrl}/rest/applications/${encodedApplicationId}/backend`
      : null,
    backendNotificationsUrl: encodedApplicationId
      ? `${websocketBaseUrl}/ws/applications/${encodedApplicationId}/backend/notifications`
      : null,
  }
}
