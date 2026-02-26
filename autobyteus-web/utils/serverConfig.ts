/**
 * Server configuration utilities for AutoByteus
 * Dynamically detects and connects to available servers
 */

// Fixed server port for internal server
export const INTERNAL_SERVER_PORT = 29695;

/**
 * Get the server base URL
 * Always uses the internal server port for Electron builds, otherwise falls back to external
 */
export function getServerBaseUrl(): string {
  // In Electron context, we always use the internal port
  if (typeof window !== 'undefined' && window.electronAPI) {
    return `http://localhost:${INTERNAL_SERVER_PORT}`;
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
 * Get all server URLs as an object.
 * This function acts as a single source of truth for API endpoints at runtime.
 */
export function getServerUrls() {
  // In Electron context, we have a special runtime environment and must use the internal port.
  // This check MUST come first as it's a runtime detection.
  if (isElectronEnvironment()) {
    const baseUrl = `http://localhost:${INTERNAL_SERVER_PORT}`;
    return {
      graphql: `${baseUrl}/graphql`,
      rest: `${baseUrl}/rest`,
      graphqlWs: `ws://localhost:${INTERNAL_SERVER_PORT}/graphql`,
      transcription: `ws://localhost:${INTERNAL_SERVER_PORT}/transcribe`,
      terminalWs: `ws://localhost:${INTERNAL_SERVER_PORT}/ws/terminal`,
      health: `${baseUrl}/rest/health`
    };
  }
  
  // For all browser-based contexts (dev and prod), we now rely on the Nuxt runtimeConfig.
  // The logic to decide between relative and absolute URLs is handled in nuxt.config.ts.
  const config = useRuntimeConfig();
  const restUrl = config.public.restBaseUrl;
  
  // The health URL needs to be constructed correctly depending on whether the restUrl is relative or absolute.
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
