import type { RemoteAccessStatus } from '~/types/remoteAccess'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

export const formatPhoneAccessRequestError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; detail?: string; code?: string }; status?: number } }).response
    const body = response?.data
    return body?.message || body?.detail || body?.code || (response?.status ? `Request failed with status ${response.status}.` : 'Request failed.')
  }
  return error instanceof Error ? error.message : String(error)
}

export const fetchRemoteAccessStatusFromBaseUrl = async (baseUrl: string): Promise<RemoteAccessStatus> => {
  const response = await fetch(`${normalizeNodeBaseUrl(baseUrl)}/rest/remote-access/status`, { method: 'GET' })
  if (!response.ok) {
    throw new Error(`Status check failed for ${baseUrl} with HTTP ${response.status}.`)
  }
  return response.json() as Promise<RemoteAccessStatus>
}
