import type { RemoteAccessStatus, RemoteAccessUrlCandidate } from '~/types/remoteAccess'
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

export type AdvertisedUrlValidation = {
  normalizedBaseUrl: string
  isValid: boolean
  isHttps: boolean
  isAndroidFacing: boolean
  message: string | null
}

export const formatPhoneAccessRequestError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; detail?: string; code?: string }; status?: number } }).response
    const body = response?.data
    return body?.message || body?.detail || body?.code || (response?.status ? `Request failed with status ${response.status}.` : 'Request failed.')
  }
  return error instanceof Error ? error.message : String(error)
}


const isLoopbackOrContainerLocalHost = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase().replace(/^\[|\]$/g, '')
  return normalized === 'localhost'
    || normalized === '::1'
    || normalized === '0.0.0.0'
    || normalized === 'host.docker.internal'
    || normalized.endsWith('.localhost')
    || normalized.startsWith('127.')
}

export const validatePhoneAccessAdvertisedUrl = (
  rawBaseUrl: string,
  requiresAndroidFacing: boolean,
): AdvertisedUrlValidation => {
  const raw = rawBaseUrl.trim()
  if (!raw) {
    return {
      normalizedBaseUrl: '',
      isValid: false,
      isHttps: false,
      isAndroidFacing: false,
      message: requiresAndroidFacing
        ? 'Enter the Android-facing private HTTPS URL for this remote node.'
        : 'Choose or enter a server URL first.',
    }
  }
  try {
    const normalizedBaseUrl = normalizeNodeBaseUrl(raw)
    const parsed = new URL(normalizedBaseUrl)
    const isHttps = parsed.protocol === 'https:'
    const isAndroidFacing = !isLoopbackOrContainerLocalHost(parsed.hostname)
    return {
      normalizedBaseUrl,
      isValid: true,
      isHttps,
      isAndroidFacing,
      message: !isHttps
        ? 'Phone Access pairing requires an HTTPS URL. Paste a private HTTPS URL such as https://<node>.<tailnet>.ts.net/mobile.'
        : !isAndroidFacing
          ? 'Remote-node Phone Access requires an Android-facing HTTPS URL, not localhost, 127.0.0.1, host.docker.internal, or a container-local address.'
          : null,
    }
  } catch (validationError) {
    return {
      normalizedBaseUrl: '',
      isValid: false,
      isHttps: false,
      isAndroidFacing: false,
      message: validationError instanceof Error ? validationError.message : String(validationError),
    }
  }
}

export const normalizeHttpsPhoneAccessCandidate = (candidate: RemoteAccessUrlCandidate): string | null => {
  try {
    const normalizedBaseUrl = normalizeNodeBaseUrl(candidate.serverBaseUrl)
    return new URL(normalizedBaseUrl).protocol === 'https:' ? normalizedBaseUrl : null
  } catch {
    return null
  }
}

export const fetchRemoteAccessStatusFromBaseUrl = async (baseUrl: string): Promise<RemoteAccessStatus> => {
  const response = await fetch(`${normalizeNodeBaseUrl(baseUrl)}/rest/remote-access/status`, { method: 'GET' })
  if (!response.ok) {
    throw new Error(`Status check failed for ${baseUrl} with HTTP ${response.status}.`)
  }
  return response.json() as Promise<RemoteAccessStatus>
}
