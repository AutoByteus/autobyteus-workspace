import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { EMBEDDED_ENTRY_ID } from '~/types/node';
import type {
  MobileConnectionDiagnostic,
  MobileNodeSession,
  PairingExchangeResponse,
  RemoteAccessPairingPayload,
  RemoteAccessStatus,
} from '~/types/remoteAccess';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';
import { getBrowserServerBaseUrl } from '~/utils/browserServerConfig';
import { mobileCredentialStorage } from '~/utils/remoteAccess/mobileCredentialStorage';
import {
  diagnosticForKind,
  diagnosticFromHttpStatus,
  diagnosticFromUnknownError,
} from '~/utils/remoteAccess/mobileConnectionDiagnostics';

const MOBILE_ENTRY_ID = 'mobile-paired-node';

const resolveSameOriginBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    return getBrowserServerBaseUrl();
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

/** Why a pairing link made no session, in the words the pairing page shows. */
export type MobilePairingFailure = 'expired' | 'used' | 'phone_access_off' | 'no_answer';

const pairingFailureFor = (status: number, code?: string): MobilePairingFailure => {
  if (code === 'REMOTE_ACCESS_PAIRING_CONSUMED') return 'used';
  if (code === 'PHONE_ACCESS_DISABLED') return 'phone_access_off';
  return status >= 500 ? 'no_answer' : 'expired';
};

/** The pairing payload in a pairing link (or its `pairing` value), or `null` when the text is not one. */
export const readPairingLink = (text: string): RemoteAccessPairingPayload | null => {
  try {
    return parseQrText(text);
  } catch {
    return null;
  }
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
  const lastPairingFailure = ref<MobilePairingFailure | null>(null);
  const authorizedApiReachable = ref(false);

  const activeCredential = computed(() => session.value?.credential ?? null);
  const isPaired = computed(() => Boolean(session.value));
  const serverBaseUrl = computed(() => session.value?.serverBaseUrl ?? resolveSameOriginBaseUrl());

  function bindSession(nextSession: MobileNodeSession): void {
    session.value = nextSession;
    const nodeContext = useWindowNodeContextStore();
    nodeContext.bindNodeContext(nextSession.entryId || EMBEDDED_ENTRY_ID, nextSession.serverBaseUrl);
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
        authorizedApiReachable.value = false;
        return null;
      }
      const status = await response.json() as RemoteAccessStatus;
      authorizedApiReachable.value = true;
      return status;
    } catch (error) {
      lastDiagnostic.value = diagnosticFromUnknownError(error);
      authorizedApiReachable.value = false;
      return null;
    } finally {
      isCheckingStatus.value = false;
    }
  }

  /** Exchanges the link's one-time code for this phone's credential, kept in this page's origin (DS-005). */
  async function pairWithPayload(payload: RemoteAccessPairingPayload, deviceName: string): Promise<MobileNodeSession> {
    isPairing.value = true;
    lastDiagnostic.value = null;
    lastPairingFailure.value = null;
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
        lastPairingFailure.value = pairingFailureFor(response.status, code);
        throw new Error(lastDiagnostic.value.message);
      }
      const result = await response.json() as PairingExchangeResponse;
      const nextSession: MobileNodeSession = {
        entryId: MOBILE_ENTRY_ID,
        serverBaseUrl: normalizeNodeBaseUrl(result.serverBaseUrl),
        nodeName: payload.serverName?.trim() || undefined,
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
      lastPairingFailure.value ??= 'no_answer';
      throw error;
    } finally {
      isPairing.value = false;
    }
  }

  async function pairWithQrText(qrText: string, deviceName: string): Promise<MobileNodeSession> {
    return pairWithPayload(parseQrText(qrText), deviceName);
  }

  function recordAuthorizedApiReachability(reachable: boolean): void {
    authorizedApiReachable.value = reachable;
  }

  function rejectLocalSessionForAuthFailure(): void {
    mobileCredentialStorage.clear();
    session.value = null;
    authorizedApiReachable.value = false;
    lastDiagnostic.value = diagnosticForKind('auth_required');
  }

  function deleteLocalSession(): void {
    mobileCredentialStorage.clear();
    session.value = null;
    lastDiagnostic.value = null;
    authorizedApiReachable.value = false;
  }

  return {
    session,
    initialized,
    isPairing,
    isCheckingStatus,
    lastDiagnostic,
    lastPairingFailure,
    authorizedApiReachable,
    activeCredential,
    isPaired,
    serverBaseUrl,
    initializeFromStorage,
    fetchStatus,
    pairWithQrText,
    recordAuthorizedApiReachability,
    rejectLocalSessionForAuthFailure,
    deleteLocalSession,
  };
});
