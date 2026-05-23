import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePhoneAccessStore } from '../phoneAccessStore';

const { apiServiceMock } = vi.hoisted(() => ({
  apiServiceMock: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('~/services/api', () => ({
  default: apiServiceMock,
}));

const emptyDeviceResponses = (url: string) => {
  if (url === '/remote-access/settings') {
    return { data: { settings: { phoneAccessEnabled: true, updatedAt: '2026-05-22T00:00:00.000Z' } } };
  }
  if (url === '/remote-access/devices' || url === '/remote-access/devices/revoked') {
    return { data: { devices: [] } };
  }
  return null;
};

describe('phoneAccessStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('loads settings, candidates, active devices, and revoked devices separately', async () => {
    apiServiceMock.get.mockImplementation(async (url: string) => {
      if (url === '/remote-access/settings') {
        return { data: { settings: { phoneAccessEnabled: true, updatedAt: '2026-05-22T00:00:00.000Z' } } };
      }
      if (url === '/remote-access/address-candidates') {
        return { data: { candidates: [{ id: 'tailnet', kind: 'tailnet_like', label: 'Tailnet', serverBaseUrl: 'https://desktop.tailnet.ts.net', source: 'test' }] } };
      }
      if (url === '/remote-access/devices') {
        return { data: { devices: [{ deviceId: 'active-1', displayName: 'Active Phone', clientFacingBaseUrl: 'https://desktop.tailnet.ts.net', createdAt: '2026-05-22T00:00:00.000Z', lastSeenAt: null, revokedAt: null }] } };
      }
      if (url === '/remote-access/devices/revoked') {
        return { data: { devices: [{ deviceId: 'revoked-1', displayName: 'Revoked Phone', clientFacingBaseUrl: 'https://desktop.tailnet.ts.net', createdAt: '2026-05-21T00:00:00.000Z', lastSeenAt: null, revokedAt: '2026-05-22T00:00:00.000Z' }] } };
      }
      throw new Error(`unexpected GET ${url}`);
    });

    const store = usePhoneAccessStore();
    await store.loadAll();

    expect(apiServiceMock.get).toHaveBeenCalledWith('/remote-access/devices');
    expect(apiServiceMock.get).toHaveBeenCalledWith('/remote-access/devices/revoked');
    expect(store.activeDevices).toHaveLength(1);
    expect(store.revokedDevices).toHaveLength(1);
    expect(store.selectedServerBaseUrl).toBe('https://desktop.tailnet.ts.net');
  });

  it('does not auto-select HTTP-only interface candidates as the QR target', async () => {
    apiServiceMock.get.mockImplementation(async (url: string) => {
      const shared = emptyDeviceResponses(url);
      if (shared) {
        return shared;
      }
      if (url === '/remote-access/address-candidates') {
        return {
          data: {
            candidates: [
              { id: 'tailnet-ip', kind: 'tailnet_like', label: 'Tailscale IP', serverBaseUrl: 'http://100.64.1.2:29695', source: 'test' },
              { id: 'lan', kind: 'lan', label: 'LAN', serverBaseUrl: 'http://192.168.1.25:29695', source: 'test' },
            ],
          },
        };
      }
      throw new Error(`unexpected GET ${url}`);
    });

    const store = usePhoneAccessStore();
    await store.loadAll();

    expect(store.selectedServerBaseUrl).toBe('');
    expect(store.selectedUrlValidation.isHttps).toBe(false);
    expect(store.selectedUrlValidation.message).toContain('Choose or enter');
  });

  it('auto-selects an HTTPS candidate when one is available', async () => {
    apiServiceMock.get.mockImplementation(async (url: string) => {
      const shared = emptyDeviceResponses(url);
      if (shared) {
        return shared;
      }
      if (url === '/remote-access/address-candidates') {
        return {
          data: {
            candidates: [
              { id: 'lan', kind: 'lan', label: 'LAN', serverBaseUrl: 'http://192.168.1.25:29695', source: 'test' },
              { id: 'serve', kind: 'manual', label: 'Serve HTTPS', serverBaseUrl: 'https://desktop.tailnet.ts.net/mobile', source: 'test' },
            ],
          },
        };
      }
      throw new Error(`unexpected GET ${url}`);
    });

    const store = usePhoneAccessStore();
    await store.loadAll();

    expect(store.selectedServerBaseUrl).toBe('https://desktop.tailnet.ts.net');
    expect(store.selectedUrlValidation.isHttps).toBe(true);
  });

  it('uses a manual Serve HTTPS mobile URL for pairing creation', async () => {
    apiServiceMock.get.mockResolvedValue({ data: { candidates: [] } });
    apiServiceMock.post.mockResolvedValue({
      data: {
        payload: {
          version: 1,
          serverBaseUrl: 'https://desktop.tailnet.ts.net',
          pairingCode: 'code',
          expiresAt: '2026-05-22T00:05:00.000Z',
          serverName: 'AutoByteus Desktop',
        },
        qrText: 'https://desktop.tailnet.ts.net/mobile?pairing=encoded',
        mobileUrl: 'https://desktop.tailnet.ts.net/mobile?pairing=encoded',
      },
    });
    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.manualServerBaseUrl = 'https://desktop.tailnet.ts.net/mobile';

    await store.refreshCandidates();
    await store.createPairingSession();

    expect(store.selectedServerBaseUrl).toBe('https://desktop.tailnet.ts.net');
    expect(apiServiceMock.post).toHaveBeenCalledWith('/remote-access/pairing-sessions', {
      serverBaseUrl: 'https://desktop.tailnet.ts.net',
      serverName: 'AutoByteus Desktop',
    });
  });

  it('blocks HTTP pairing creation before POST', async () => {
    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.selectedServerBaseUrl = 'http://192.168.1.25:29695';

    await store.createPairingSession();

    expect(apiServiceMock.post).not.toHaveBeenCalled();
    expect(store.error).toContain('HTTPS URL');
  });

  it('normalizes pasted mobile URLs before creating pairing sessions', async () => {
    apiServiceMock.post.mockResolvedValue({
      data: {
        payload: {
          version: 1,
          serverBaseUrl: 'https://gateway.example.com/autobyteus',
          pairingCode: 'code',
          expiresAt: '2026-05-22T00:05:00.000Z',
          serverName: 'AutoByteus Desktop',
        },
        qrText: 'https://gateway.example.com/autobyteus/mobile?pairing=encoded',
        mobileUrl: 'https://gateway.example.com/autobyteus/mobile?pairing=encoded',
      },
    });
    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.selectedServerBaseUrl = 'https://gateway.example.com/autobyteus/mobile?pairing=old';

    await store.createPairingSession();

    expect(apiServiceMock.post).toHaveBeenCalledWith('/remote-access/pairing-sessions', {
      serverBaseUrl: 'https://gateway.example.com/autobyteus',
      serverName: 'AutoByteus Desktop',
    });
    expect(store.activePairing?.payload.serverBaseUrl).toBe('https://gateway.example.com/autobyteus');
  });

  it('refreshes active and revoked lists after revocation', async () => {
    apiServiceMock.delete.mockResolvedValue({ data: { device: { deviceId: 'active-1' } } });
    apiServiceMock.get.mockImplementation(async (url: string) => {
      if (url === '/remote-access/devices') {
        return { data: { devices: [] } };
      }
      if (url === '/remote-access/devices/revoked') {
        return { data: { devices: [{ deviceId: 'active-1', displayName: 'Phone', clientFacingBaseUrl: 'https://desktop.tailnet.ts.net', createdAt: '2026-05-22T00:00:00.000Z', lastSeenAt: null, revokedAt: '2026-05-22T00:01:00.000Z' }] } };
      }
      throw new Error(`unexpected GET ${url}`);
    });
    const store = usePhoneAccessStore();

    await store.revokeDevice('active-1');

    expect(apiServiceMock.delete).toHaveBeenCalledWith('/remote-access/devices/active-1');
    expect(store.activeDevices).toHaveLength(0);
    expect(store.revokedDevices).toHaveLength(1);
  });
});
