/**
 * Server configuration utilities for AutoByteus.
 * Electron uses the canonical embedded loopback URL; browser mode uses Nuxt runtime config.
 */

import {
  INTERNAL_SERVER_BASE_URL,
  INTERNAL_SERVER_PORT,
  INTERNAL_SERVER_WS_BASE_URL,
} from '~/shared/embeddedServerConfig';

export { INTERNAL_SERVER_PORT };

/**
 * Get the active server base URL for the current runtime.
 */
export function getServerBaseUrl(): string {
  // Electron always talks to the bundled server through the canonical loopback URL.
  if (typeof window !== 'undefined' && window.electronAPI) {
    return INTERNAL_SERVER_BASE_URL;
  }
  
  // For browser builds, derive from runtime config.
  const config = useRuntimeConfig();
  return config.public.restBaseUrl.replace('/rest', '');
}

/**
 * Check if we're running in Electron
 */
export function isElectronEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.electronAPI;
}

/**
 * Get runtime API endpoints for the active node.
 */
export function getServerUrls() {
  // Electron keeps one stable embedded base URL regardless of host network changes.
  if (isElectronEnvironment()) {
    return {
      graphql: `${INTERNAL_SERVER_BASE_URL}/graphql`,
      rest: `${INTERNAL_SERVER_BASE_URL}/rest`,
      graphqlWs: `${INTERNAL_SERVER_WS_BASE_URL}/graphql`,
      transcription: `${INTERNAL_SERVER_WS_BASE_URL}/transcribe`,
      terminalWs: `${INTERNAL_SERVER_WS_BASE_URL}/ws/terminal`,
      health: `${INTERNAL_SERVER_BASE_URL}/rest/health`
    };
  }
  
  // Browser-based contexts rely on Nuxt runtime config.
  const config = useRuntimeConfig();
  const restUrl = config.public.restBaseUrl;

  const healthUrl = restUrl.startsWith('/') ? `${restUrl}/health` : new URL('/health', restUrl).href;

  return {
    graphql: config.public.graphqlBaseUrl,
    rest: restUrl,
    graphqlWs: config.public.graphqlWsEndpoint,
    transcription: config.public.audio.transcriptionWsEndpoint,
    terminalWs: config.public.terminalWsEndpoint,
    health: healthUrl,
  };
}
