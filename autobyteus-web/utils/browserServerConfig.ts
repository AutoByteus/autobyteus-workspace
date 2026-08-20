import { PRODUCTION_EMBEDDED_SERVER_BASE_URL } from '~/shared/embeddedServerClientEndpoint'
import { deriveNodeEndpoints, normalizeNodeBaseUrl } from '~/utils/nodeEndpoints'

function assertBrowserConfigurationOwner(): void {
  if (typeof window !== 'undefined' && window.electronAPI) {
    throw new Error('Browser server configuration cannot select an Electron endpoint')
  }
}

export function getBrowserServerBaseUrl(): string {
  assertBrowserConfigurationOwner()
  try {
    const config = useRuntimeConfig()
    const restBaseUrl = config.public.restBaseUrl?.trim()
    if (restBaseUrl && !restBaseUrl.startsWith('/')) {
      return normalizeNodeBaseUrl(restBaseUrl)
    }
    const defaultNodeBaseUrl = config.public.defaultNodeBaseUrl
    if (typeof defaultNodeBaseUrl === 'string' && defaultNodeBaseUrl.trim()) {
      return normalizeNodeBaseUrl(defaultNodeBaseUrl)
    }
    if (restBaseUrl) {
      return restBaseUrl.replace(/\/rest\/?$/, '')
    }
  } catch {
    // Non-Nuxt browser unit contexts use the production client default.
  }
  return PRODUCTION_EMBEDDED_SERVER_BASE_URL
}

export function getBrowserServerUrls() {
  assertBrowserConfigurationOwner()
  try {
    const config = useRuntimeConfig()
    const restUrl = config.public.restBaseUrl
    const healthUrl = restUrl.startsWith('/')
      ? `${restUrl}/health`
      : new URL('/health', restUrl).href
    return {
      graphql: config.public.graphqlBaseUrl,
      rest: restUrl,
      graphqlWs: config.public.graphqlWsEndpoint,
      transcription: config.public.audio.transcriptionWsEndpoint,
      terminalWs: config.public.terminalWsEndpoint,
      health: healthUrl,
    }
  } catch {
    const baseUrl = getBrowserServerBaseUrl()
    const endpoints = deriveNodeEndpoints(baseUrl)
    const transcriptionWsBase = baseUrl.startsWith('https://')
      ? `wss://${baseUrl.slice('https://'.length)}`
      : `ws://${baseUrl.slice('http://'.length)}`
    return {
      graphql: endpoints.graphqlHttp,
      rest: endpoints.rest,
      graphqlWs: endpoints.graphqlWs,
      transcription: `${transcriptionWsBase}/ws/transcribe`,
      terminalWs: endpoints.terminalWs,
      health: endpoints.health,
    }
  }
}

export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI
}
