import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { EMBEDDED_NODE_ID } from '~/types/node';
import type {
  MobileConnectionDiagnostic,
  MobileNodeSession,
  PairingExchangeResponse,
  RemoteAccessPairingPayload,
  RemoteAccessStatus,
} from '~/types/remoteAccess';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';
import { mobileCredentialStorage } from '~/utils/remoteAccess/mobileCredentialStorage';
import {
  diagnosticForKind,
  diagnosticFromHttpStatus,
  diagnosticFromUnknownError,
} from '~/utils/remoteAccess/mobileConnectionDiagnostics';

const MOBILE_NODE_ID = 'mobile-paired-node';

const resolveSameOriginBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:29695';
  }
  return window.location.origin;
};

const parsePairingParam = (value: string): RemoteAccessPairingPayload => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const decoded = JSON.parse(atob(padded)) as RemoteAccessPairingPayload;
  if (decoded.version !== 1 || !decoded.serverBaseUrl || !decoded.pairingCode) {
    throw new Error('Invalid pairing payload.');
  }
  return decoded;
};

const parseQrText = (value: string): RemoteAccessPairingPayload => {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error('Pairing payload is required.');
  }
  try {
    const parsedUrl = new URL(trimmed);
    const pairingParam = parsedUrl.searchParams.get('pairing');
    if (pairingParam) {
      return parsePairingParam(pairingParam);
    }
  } catch {
    // Fall through to raw base64/JSON parsing.
  }
  try {
    return parsePairingParam(trimmed);
  } catch {
    // Fall through to raw JSON parsing.
  }
  const parsed = JSON.parse(trimmed) as RemoteAccessPairingPayload;
  if (parsed.version !== 1 || !parsed.serverBaseUrl || !parsed.pairingCode) {
    throw new Error('Invalid pairing payload.');
  }
  return parsed;
};

const readServerErrorCode = async (response: Response): Promise<string | undefined> => {
  try {
    const body = await response.json() as { code?: string; error?: string };
    return body.code || body.error;
  } catch {
    return undefined;
  }
};

export const useMobileNodeSessionStore = defineStore('mobileNodeSession', () => {
  const session = ref<MobileNodeSession | null>(null);
  const initialized = ref(false);
  const isPairing = ref(false);
  const isCheckingStatus = ref(false);
  const lastDiagnostic = ref<MobileConnectionDiagnostic | null>(null);
  const lastStatus = ref<RemoteAccessStatus | null>(null);

  const activeCredential = computed(() => session.value?.credential ?? null);
  const isPaired = computed(() => Boolean(session.value));
  const serverBaseUrl = computed(() => session.value?.serverBaseUrl ?? resolveSameOriginBaseUrl());

  function bindSession(nextSession: MobileNodeSession): void {
    session.value = nextSession;
    const nodeContext = useWindowNodeContextStore();
    nodeContext.bindNodeContext(nextSession.nodeId || EMBEDDED_NODE_ID, nextSession.serverBaseUrl);
  }

  function initializeFromStorage(): void {
    if (initialized.value) {
      return;
    }
    const stored = mobileCredentialStorage.load();
    if (stored) {
      bindSession(stored);
    }
    initialized.value = true;
  }

  async function fetchStatus(baseUrl = serverBaseUrl.value): Promise<RemoteAccessStatus | null> {
    isCheckingStatus.value = true;
    lastDiagnostic.value = null;
    try {
      const normalized = normalizeNodeBaseUrl(baseUrl);
      const response = await fetch(`${normalized}/rest/remote-access/status`, { method: 'GET' });
      if (!response.ok) {
        const code = await readServerErrorCode(response);
        lastDiagnostic.value = diagnosticFromHttpStatus(response.status, code);
        return null;
      }
      lastStatus.value = await response.json() as RemoteAccessStatus;
      return lastStatus.value;
    } catch (error) {
      lastDiagnostic.value = diagnosticFromUnknownError(error);
      return null;
    } finally {
      isCheckingStatus.value = false;
    }
  }

  async function pairWithPayload(payload: RemoteAccessPairingPayload, deviceName = 'Phone'): Promise<MobileNodeSession> {
    isPairing.value = true;
    lastDiagnostic.value = null;
    try {
      const normalizedBaseUrl = normalizeNodeBaseUrl(payload.serverBaseUrl);
      const response = await fetch(`${normalizedBaseUrl}/rest/remote-access/pairing-exchanges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairingCode: payload.pairingCode,
          serverBaseUrl: normalizedBaseUrl,
          deviceName,
        }),
      });
      if (!response.ok) {
        const code = await readServerErrorCode(response);
        lastDiagnostic.value = diagnosticFromHttpStatus(response.status, code);
        throw new Error(lastDiagnostic.value.message);
      }
      const result = await response.json() as PairingExchangeResponse;
      const nextSession: MobileNodeSession = {
        version: 1,
        nodeId: MOBILE_NODE_ID,
        serverBaseUrl: normalizeNodeBaseUrl(result.serverBaseUrl),
        credential: result.credential,
        device: result.device,
        pairedAt: new Date().toISOString(),
      };
      mobileCredentialStorage.save(nextSession);
      bindSession(nextSession);
      initialized.value = true;
      return nextSession;
    } catch (error) {
      lastDiagnostic.value ??= diagnosticFromUnknownError(error);
      throw error;
    } finally {
      isPairing.value = false;
    }
  }

  async function pairWithQrText(qrText: string, deviceName?: string): Promise<MobileNodeSession> {
    return pairWithPayload(parseQrText(qrText), deviceName);
  }

  async function pairWithManualUrl(baseUrl: string, deviceName?: string): Promise<void> {
    const status = await fetchStatus(baseUrl);
    if (!status) {
      throw new Error(lastDiagnostic.value?.message || 'Unable to reach server.');
    }
    if (!status.pairingAvailable) {
      lastDiagnostic.value = diagnosticForKind(status.phoneAccessEnabled ? 'auth_required' : 'phone_access_disabled');
      throw new Error(lastDiagnostic.value.message);
    }
    if (!deviceName) {
      throw new Error('Manual URL reached the server. Paste or scan a pairing QR to finish pairing.');
    }
  }

  function deleteLocalSession(): void {
    mobileCredentialStorage.clear();
    session.value = null;
    lastDiagnostic.value = null;
  }

  return {
    session,
    initialized,
    isPairing,
    isCheckingStatus,
    lastDiagnostic,
    lastStatus,
    activeCredential,
    isPaired,
    serverBaseUrl,
    initializeFromStorage,
    fetchStatus,
    pairWithPayload,
    pairWithQrText,
    pairWithManualUrl,
    deleteLocalSession,
  };
});
