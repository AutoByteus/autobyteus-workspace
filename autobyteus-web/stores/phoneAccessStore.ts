import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import apiService from '~/services/api';
import type {
  PairedDeviceSummary,
  RemoteAccessPairingSessionResponse,
  RemoteAccessSettings,
  RemoteAccessUrlCandidate,
} from '~/types/remoteAccess';
import { normalizeNodeBaseUrl } from '~/utils/nodeEndpoints';

const defaultSettings = (): RemoteAccessSettings => ({
  phoneAccessEnabled: false,
  updatedAt: new Date(0).toISOString(),
});

export const usePhoneAccessStore = defineStore('phoneAccess', () => {
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

  const phoneAccessEnabled = computed(() => settings.value.phoneAccessEnabled);
  const selectedUrlValidation = computed(() => {
    const raw = selectedServerBaseUrl.value.trim();
    if (!raw) {
      return {
        normalizedBaseUrl: '',
        isValid: false,
        isHttps: false,
        message: 'Choose or enter a server URL first.',
      };
    }
    try {
      const normalizedBaseUrl = normalizeNodeBaseUrl(raw);
      const isHttps = new URL(normalizedBaseUrl).protocol === 'https:';
      return {
        normalizedBaseUrl,
        isValid: true,
        isHttps,
        message: isHttps
          ? null
          : 'Phone Access pairing requires an HTTPS URL. Paste a Tailscale Serve URL such as https://<machine>.<tailnet>.ts.net/mobile.',
      };
    } catch (validationError) {
      return {
        normalizedBaseUrl: '',
        isValid: false,
        isHttps: false,
        message: validationError instanceof Error ? validationError.message : String(validationError),
      };
    }
  });

  function normalizeHttpsCandidate(candidate: RemoteAccessUrlCandidate): string | null {
    try {
      const normalizedBaseUrl = normalizeNodeBaseUrl(candidate.serverBaseUrl);
      return new URL(normalizedBaseUrl).protocol === 'https:' ? normalizedBaseUrl : null;
    } catch {
      return null;
    }
  }

  function selectDefaultCandidate(): void {
    if (selectedServerBaseUrl.value) {
      return;
    }
    const httpsCandidates = candidates.value
      .map((candidate) => ({ candidate, normalizedBaseUrl: normalizeHttpsCandidate(candidate) }))
      .filter((entry): entry is { candidate: RemoteAccessUrlCandidate; normalizedBaseUrl: string } => Boolean(entry.normalizedBaseUrl));
    const preferred = httpsCandidates.find((entry) => entry.candidate.kind !== 'loopback') || httpsCandidates[0];
    selectedServerBaseUrl.value = preferred?.normalizedBaseUrl || '';
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
      error.value = loadError instanceof Error ? loadError.message : String(loadError);
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
    const params: Record<string, string> = {};
    if (manualServerBaseUrl.value.trim()) {
      params.manualServerBaseUrl = manualServerBaseUrl.value.trim();
    }
    const response = await apiService.get<{ candidates: RemoteAccessUrlCandidate[] }>('/remote-access/address-candidates', { params });
    candidates.value = response.data.candidates;
    if (manualServerBaseUrl.value.trim()) {
      selectedServerBaseUrl.value = normalizeNodeBaseUrl(manualServerBaseUrl.value);
    } else {
      selectDefaultCandidate();
    }
  }

  async function createPairingSession(): Promise<void> {
    error.value = null;
    info.value = null;
    if (!phoneAccessEnabled.value) {
      error.value = 'Enable Phone Access before creating a QR code.';
      return;
    }
    if (!selectedServerBaseUrl.value.trim()) {
      error.value = 'Choose or enter a server URL first.';
      return;
    }
    try {
      const validation = selectedUrlValidation.value;
      if (!validation.isValid || !validation.isHttps) {
        error.value = validation.message;
        return;
      }
      const response = await apiService.post<RemoteAccessPairingSessionResponse>('/remote-access/pairing-sessions', {
        serverBaseUrl: validation.normalizedBaseUrl,
        serverName: 'AutoByteus Desktop',
      });
      activePairing.value = response.data;
      info.value = 'Pairing QR code created.';
    } catch (createError) {
      error.value = createError instanceof Error ? createError.message : String(createError);
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
    phoneAccessEnabled,
    selectedUrlValidation,
    loadAll,
    setEnabled,
    refreshCandidates,
    createPairingSession,
    refreshDevices,
    revokeDevice,
    revokeAllDevices,
  };
});
