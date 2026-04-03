import { INTERNAL_SERVER_BASE_URL } from '~/shared/embeddedServerConfig';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';

export function resolveDefaultEmbeddedBaseUrl(): string {
  if (typeof window !== 'undefined' && window.electronAPI) {
    return INTERNAL_SERVER_BASE_URL;
  }

  try {
    const config = useRuntimeConfig();
    const configuredBaseUrl = config.public.defaultNodeBaseUrl;
    if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim()) {
      return normalizeNodeBaseUrl(configuredBaseUrl);
    }
  } catch {
    // Non-Nuxt contexts (unit tests) can fall back to the embedded default.
  }

  return INTERNAL_SERVER_BASE_URL;
}
