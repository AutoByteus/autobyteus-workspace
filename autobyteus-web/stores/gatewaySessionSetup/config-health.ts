import { GatewayClientError } from '~/services/messagingGatewayClient';

const GATEWAY_CONFIG_STORAGE_KEY = 'messaging_gateway_config_v1';

export interface PersistedGatewayConfig {
  baseUrl: string;
  adminToken: string;
}

export function normalizeGatewayErrorMessage(error: unknown): string {
  if (error instanceof GatewayClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Gateway request failed';
}

export function readPersistedGatewayConfig(): PersistedGatewayConfig | null {
  const storage = getLocalStorageSafely();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(GATEWAY_CONFIG_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedGatewayConfig>;
    return {
      baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
      adminToken: typeof parsed.adminToken === 'string' ? parsed.adminToken : '',
    };
  } catch {
    return null;
  }
}

export function persistGatewayConfig(config: PersistedGatewayConfig): void {
  const storage = getLocalStorageSafely();
  if (!storage) {
    return;
  }

  try {
    const shouldClear = !config.baseUrl.trim() && !config.adminToken.trim();
    if (shouldClear) {
      storage.removeItem(GATEWAY_CONFIG_STORAGE_KEY);
      return;
    }

    storage.setItem(
      GATEWAY_CONFIG_STORAGE_KEY,
      JSON.stringify({
        baseUrl: config.baseUrl,
        adminToken: config.adminToken,
      }),
    );
  } catch {
    // Ignore storage errors to avoid blocking setup flows.
  }
}

function getLocalStorageSafely(): Storage | null {
  if (!globalThis || !('localStorage' in globalThis)) {
    return null;
  }
  const storage = (globalThis as { localStorage?: Storage }).localStorage;
  return storage ?? null;
}
