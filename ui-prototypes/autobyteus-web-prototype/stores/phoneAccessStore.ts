import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import apiService from '~/services/api';
import { useNodeStore } from '~/stores/nodeStore';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import type {
  PairedDeviceSummary,
  RemoteAccessPairingSessionResponse,
  RemoteAccessSettings,
  RemoteAccessStatus,
  RemoteAccessUrlCandidate,
} from '~/types/remoteAccess';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';
import {
  evaluatePhoneAccessPairingUrl,
  normalizeAllowedPhoneAccessCandidate,
  type PhoneAccessPairingUrlDecision,
} from '~/utils/phoneAccessPairingUrlPolicy';
import {
  fetchRemoteAccessStatusFromBaseUrl,
  formatPhoneAccessRequestError,
} from '~/utils/phoneAccessRemoteNode';

const defaultSettings = (): RemoteAccessSettings => ({
  phoneAccessEnabled: false,
  updatedAt: new Date(0).toISOString(),
});

const trustedPrivateHttpAcknowledgementError = 'Acknowledge that this private HTTP URL is trusted and cleartext before creating a QR code.';

export const usePhoneAccessStore = defineStore('phoneAccess', () => {
  const windowNodeContextStore = useWindowNodeContextStore();
  const nodeStore = useNodeStore();

  const settings = ref<RemoteAccessSettings>(defaultSettings());
  const candidates = ref<RemoteAccessUrlCandidate[]>([]);
  const activeDevices = ref<PairedDeviceSummary[]>([]);
  const revokedDevices = ref<PairedDeviceSummary[]>([]);
  const activePairing = ref<RemoteAccessPairingSessionResponse | null>(null);
  const selectedServerBaseUrl = ref('');
  const manualServerBaseUrl = ref('');
  const trustedPrivateHttpAcknowledged = ref(false);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const info = ref<string | null>(null);
  const advertisedUrlVerified = ref(false);
  const advertisedUrlVerificationMessage = ref<string | null>(null);

  const phoneAccessEnabled = computed(() => settings.value.phoneAccessEnabled);
  const isRemoteNodeWindow = computed(() => !windowNodeContextStore.isEmbeddedWindow);
  const managementBaseUrl = computed(() => normalizeNodeBaseUrl(windowNodeContextStore.nodeBaseUrl));
  const currentNode = computed(() => nodeStore.getNodeById(windowNodeContextStore.nodeId));
  const currentNodeName = computed(() => (
    isRemoteNodeWindow.value
      ? currentNode.value?.name || 'AutoByteus Remote Node'
      : 'AutoByteus Desktop'
  ));
  const canManagePhoneAccess = computed(() => true);

  const selectedUrlValidation = computed<PhoneAccessPairingUrlDecision>(() =>
    evaluatePhoneAccessPairingUrl(selectedServerBaseUrl.value, { requiresPhoneFacingUrl: isRemoteNodeWindow.value }));

  const selectedUrlRequiresTrustedPrivateHttpAcknowledgement = computed(() =>
    selectedUrlValidation.value.requiresTrustedPrivateHttpAcknowledgement);

  const selectedUrlWarning = computed(() =>
    selectedUrlValidation.value.warning || selectedUrlValidation.value.message);

  const canCreatePairingSession = computed(() => (
    phoneAccessEnabled.value
    && Boolean(selectedServerBaseUrl.value.trim())
    && (!isRemoteNodeWindow.value || Boolean(manualServerBaseUrl.value.trim()))
    && selectedUrlValidation.value.isValid
    && selectedUrlValidation.value.isAndroidFacing
    && (!selectedUrlRequiresTrustedPrivateHttpAcknowledgement.value || trustedPrivateHttpAcknowledged.value)
  ));

  function resetAdvertisedVerification(): void {
    advertisedUrlVerified.value = false;
    advertisedUrlVerificationMessage.value = null;
  }

  function resetSelectedUrlDependentState(): void {
    trustedPrivateHttpAcknowledged.value = false;
    resetAdvertisedVerification();
    activePairing.value = null;
    info.value = null;
  }

  function selectDefaultCandidate(): void {
    if (isRemoteNodeWindow.value || selectedServerBaseUrl.value) {
      return;
    }
    const allowedCandidates = candidates.value
      .map((candidate) => {
        const normalizedBaseUrl = normalizeAllowedPhoneAccessCandidate(candidate);
        return normalizedBaseUrl
          ? { candidate, normalizedBaseUrl, decision: evaluatePhoneAccessPairingUrl(normalizedBaseUrl) }
          : null;
      })
      .filter((entry): entry is {
        candidate: RemoteAccessUrlCandidate;
        normalizedBaseUrl: string;
        decision: PhoneAccessPairingUrlDecision;
      } => Boolean(entry));
    const preferred = allowedCandidates.find((entry) => entry.decision.transportSecurity === 'https')
      || allowedCandidates.find((entry) => entry.decision.transportSecurity === 'trusted_private_http');
    selectedServerBaseUrl.value = preferred?.normalizedBaseUrl || '';
  }

  function handleRequestError(loadError: unknown): void {
    error.value = formatPhoneAccessRequestError(loadError);
  }

  async function loadAll(): Promise<void> {
    isLoading.value = true;
    error.value = null;
    try {
      const [settingsResponse, candidatesResponse, activeDevicesResponse, revokedDevicesResponse] = await Promise.all([
        apiService.get<{ settings: RemoteAccessSettings }>('/remote-access/settings'),
        apiService.get<{ candidates: RemoteAccessUrlCandidate[] }>('/remote-access/address-candidates'),
        apiService.get<{ devices: PairedDeviceSummary[] }>('/remote-access/devices'),
        apiService.get<{ devices: PairedDeviceSummary[] }>('/remote-access/devices/revoked'),
      ]);
      settings.value = settingsResponse.data.settings;
      candidates.value = candidatesResponse.data.candidates;
      activeDevices.value = activeDevicesResponse.data.devices;
      revokedDevices.value = revokedDevicesResponse.data.devices;
      selectDefaultCandidate();
    } catch (loadError) {
      handleRequestError(loadError);
    } finally {
      isLoading.value = false;
    }
  }

  async function setEnabled(enabled: boolean): Promise<void> {
    error.value = null;
    const response = await apiService.put<{ settings: RemoteAccessSettings }>('/remote-access/settings', {
      phoneAccessEnabled: enabled,
    });
    settings.value = response.data.settings;
    if (!enabled) {
      activePairing.value = null;
    }
  }

  async function refreshCandidates(): Promise<void> {
    error.value = null;
    const params: Record<string, string> = {};
    if (manualServerBaseUrl.value.trim()) {
      params.manualServerBaseUrl = manualServerBaseUrl.value.trim();
      selectedServerBaseUrl.value = normalizeNodeBaseUrl(manualServerBaseUrl.value);
      resetAdvertisedVerification();
    }
    const response = await apiService.get<{ candidates: RemoteAccessUrlCandidate[] }>('/remote-access/address-candidates', {
      params,
    });
    candidates.value = response.data.candidates;
    if (!manualServerBaseUrl.value.trim()) {
      selectDefaultCandidate();
    }
  }

  async function verifyAdvertisedUrlForRemoteQr(): Promise<string | null> {
    resetAdvertisedVerification();
    const validation = selectedUrlValidation.value;
    if (!validation.isValid || !validation.isAndroidFacing) {
      return validation.message || 'Enter a phone-facing private network URL for this remote node.';
    }
    try {
      const [managementResponse, advertisedStatus] = await Promise.all([
        apiService.get<RemoteAccessStatus>('/remote-access/status'),
        fetchRemoteAccessStatusFromBaseUrl(validation.normalizedBaseUrl),
      ]);
      const managementId = managementResponse.data.serverInstanceId;
      const advertisedId = advertisedStatus.serverInstanceId;
      if (!managementId || !advertisedId) {
        return 'Could not verify this URL because one status response does not include a server instance ID.';
      }
      if (managementId !== advertisedId) {
        return 'The phone-facing URL reaches a different AutoByteUs node. Map the private network URL to this node, then retry.';
      }
      advertisedUrlVerified.value = true;
      advertisedUrlVerificationMessage.value = 'Phone-facing URL verified for this node.';
      return null;
    } catch (verifyError) {
      return `${formatPhoneAccessRequestError(verifyError)} Use a phone-facing HTTPS URL or acknowledged trusted private HTTP URL mapped to this node.`;
    }
  }

  async function createPairingSession(): Promise<void> {
    error.value = null;
    info.value = null;
    if (!phoneAccessEnabled.value) {
      error.value = 'Enable Phone Access before creating a QR code.';
      return;
    }
    if (!selectedServerBaseUrl.value.trim() || (isRemoteNodeWindow.value && !manualServerBaseUrl.value.trim())) {
      error.value = isRemoteNodeWindow.value
        ? 'Enter the phone-facing private network URL for this remote node first.'
        : 'Choose or enter a server URL first.';
      return;
    }
    try {
      const validation = selectedUrlValidation.value;
      if (!validation.isValid || (isRemoteNodeWindow.value && !validation.isAndroidFacing)) {
        error.value = validation.message;
        return;
      }
      if (validation.requiresTrustedPrivateHttpAcknowledgement && !trustedPrivateHttpAcknowledged.value) {
        error.value = trustedPrivateHttpAcknowledgementError;
        return;
      }
      if (isRemoteNodeWindow.value) {
        const verifyError = await verifyAdvertisedUrlForRemoteQr();
        if (verifyError) {
          error.value = verifyError;
          return;
        }
      }
      const response = await apiService.post<RemoteAccessPairingSessionResponse>('/remote-access/pairing-sessions', {
        serverBaseUrl: validation.normalizedBaseUrl,
        serverName: currentNodeName.value,
        ...(validation.requiresTrustedPrivateHttpAcknowledgement ? { trustedPrivateHttpAcknowledged: true } : {}),
      });
      activePairing.value = response.data;
      info.value = isRemoteNodeWindow.value
        ? 'Pairing QR code created for the verified remote node URL.'
        : 'Pairing QR code created.';
    } catch (createError) {
      handleRequestError(createError);
    }
  }

  async function refreshDevices(): Promise<void> {
    const [activeResponse, revokedResponse] = await Promise.all([
      apiService.get<{ devices: PairedDeviceSummary[] }>('/remote-access/devices'),
      apiService.get<{ devices: PairedDeviceSummary[] }>('/remote-access/devices/revoked'),
    ]);
    activeDevices.value = activeResponse.data.devices;
    revokedDevices.value = revokedResponse.data.devices;
  }

  async function revokeDevice(deviceId: string): Promise<void> {
    await apiService.delete(`/remote-access/devices/${encodeURIComponent(deviceId)}`);
    await refreshDevices();
  }

  async function revokeAllDevices(): Promise<number> {
    const response = await apiService.delete<{ result: { revokedCount: number } }>('/remote-access/devices');
    await refreshDevices();
    return response.data.result.revokedCount;
  }

  watch(selectedServerBaseUrl, (nextUrl, previousUrl) => {
    if (nextUrl !== previousUrl) {
      resetSelectedUrlDependentState();
    }
  });

  return {
    settings,
    candidates,
    activeDevices,
    revokedDevices,
    activePairing,
    selectedServerBaseUrl,
    manualServerBaseUrl,
    trustedPrivateHttpAcknowledged,
    isLoading,
    error,
    info,
    advertisedUrlVerified,
    advertisedUrlVerificationMessage,
    phoneAccessEnabled,
    isRemoteNodeWindow,
    managementBaseUrl,
    currentNodeName,
    canManagePhoneAccess,
    selectedUrlValidation,
    selectedUrlRequiresTrustedPrivateHttpAcknowledgement,
    selectedUrlWarning,
    canCreatePairingSession,
    loadAll,
    setEnabled,
    refreshCandidates,
    verifyAdvertisedUrlForRemoteQr,
    createPairingSession,
    refreshDevices,
    revokeDevice,
    revokeAllDevices,
  };
});
