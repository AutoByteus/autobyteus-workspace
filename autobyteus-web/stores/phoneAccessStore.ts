import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
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
  fetchRemoteAccessStatusFromBaseUrl,
  formatPhoneAccessRequestError,
  normalizeHttpsPhoneAccessCandidate,
  validatePhoneAccessAdvertisedUrl,
  type AdvertisedUrlValidation,
} from '~/utils/phoneAccessRemoteNode';

const defaultSettings = (): RemoteAccessSettings => ({
  phoneAccessEnabled: false,
  updatedAt: new Date(0).toISOString(),
});

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

  const selectedUrlValidation = computed<AdvertisedUrlValidation>(() =>
    validatePhoneAccessAdvertisedUrl(selectedServerBaseUrl.value, isRemoteNodeWindow.value));

  function resetAdvertisedVerification(): void {
    advertisedUrlVerified.value = false;
    advertisedUrlVerificationMessage.value = null;
  }

  function selectDefaultCandidate(): void {
    if (isRemoteNodeWindow.value || selectedServerBaseUrl.value) {
      return;
    }
    const httpsCandidates = candidates.value
      .map((candidate) => ({ candidate, normalizedBaseUrl: normalizeHttpsPhoneAccessCandidate(candidate) }))
      .filter((entry): entry is { candidate: RemoteAccessUrlCandidate; normalizedBaseUrl: string } => Boolean(entry.normalizedBaseUrl));
    const preferred = httpsCandidates.find((entry) => entry.candidate.kind !== 'loopback') || httpsCandidates[0];
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
    if (!validation.isValid || !validation.isHttps || !validation.isAndroidFacing) {
      return validation.message || 'Enter a private Android-facing HTTPS URL for this remote node.';
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
        return 'The Android-facing URL reaches a different AutoByteUs node. Map the HTTPS URL to this node, then retry.';
      }
      advertisedUrlVerified.value = true;
      advertisedUrlVerificationMessage.value = 'Android-facing URL verified for this node.';
      return null;
    } catch (verifyError) {
      return `${formatPhoneAccessRequestError(verifyError)} Use a private HTTPS URL mapped to this node, such as Tailscale Serve.`;
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
        ? 'Enter the Android-facing HTTPS URL for this remote node first.'
        : 'Choose or enter a server URL first.';
      return;
    }
    try {
      const validation = selectedUrlValidation.value;
      if (!validation.isValid || !validation.isHttps || (isRemoteNodeWindow.value && !validation.isAndroidFacing)) {
        error.value = validation.message;
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

  return {
    settings,
    candidates,
    activeDevices,
    revokedDevices,
    activePairing,
    selectedServerBaseUrl,
    manualServerBaseUrl,
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
