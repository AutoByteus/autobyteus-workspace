import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
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
    vi.unstubAllGlobals();
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: undefined,
    });
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

  it('auto-selects an allowed private HTTP interface candidate when HTTPS is unavailable', async () => {
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

    expect(store.selectedServerBaseUrl).toBe('http://100.64.1.2:29695');
    expect(store.selectedUrlValidation.transportSecurity).toBe('trusted_private_http');
    expect(store.selectedUrlValidation.requiresTrustedPrivateHttpAcknowledgement).toBe(true);
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

  it('requires acknowledgement before private HTTP pairing creation and sends the acknowledgement to the backend', async () => {
    apiServiceMock.post.mockResolvedValue({
      data: {
        payload: {
          version: 1,
          serverBaseUrl: 'http://192.168.1.25:29695',
          pairingCode: 'code',
          expiresAt: '2026-05-22T00:05:00.000Z',
          serverName: 'AutoByteus Desktop',
        },
        qrText: 'http://192.168.1.25:29695/mobile?pairing=encoded',
        mobileUrl: 'http://192.168.1.25:29695/mobile?pairing=encoded',
      },
    });
    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.selectedServerBaseUrl = 'http://192.168.1.25:29695';

    await store.createPairingSession();

    expect(apiServiceMock.post).not.toHaveBeenCalled();
    expect(store.error).toContain('Acknowledge');

    store.trustedPrivateHttpAcknowledged = true;
    await store.createPairingSession();

    expect(apiServiceMock.post).toHaveBeenCalledWith('/remote-access/pairing-sessions', {
      serverBaseUrl: 'http://192.168.1.25:29695',
      serverName: 'AutoByteus Desktop',
      trustedPrivateHttpAcknowledged: true,
    });
  });

  it('blocks public HTTP pairing creation before POST', async () => {
    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.selectedServerBaseUrl = 'http://example.com:29695';
    store.trustedPrivateHttpAcknowledged = true;

    await store.createPairingSession();

    expect(apiServiceMock.post).not.toHaveBeenCalled();
    expect(store.error).toContain('Use HTTPS for public hostnames');
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

  it('requires a manual phone-facing private network URL before remote-node QR creation', async () => {
    await bindRemoteNodeWindow();

    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.selectedServerBaseUrl = 'https://node.tailnet.ts.net/mobile';

    await store.createPairingSession();

    expect(apiServiceMock.post).not.toHaveBeenCalled();
    expect(store.error).toContain('phone-facing private network URL');
  });

  it('rejects loopback or local-only advertised URLs for remote nodes before status verification', async () => {
    await bindRemoteNodeWindow();
    vi.stubGlobal('fetch', vi.fn());

    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.manualServerBaseUrl = 'https://host.docker.internal/mobile';
    store.selectedServerBaseUrl = 'https://host.docker.internal/mobile';

    await store.createPairingSession();

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(apiServiceMock.post).not.toHaveBeenCalled();
    expect(store.error).toContain('phone-facing URL');
  });

  it('fails closed when the remote-node advertised URL reaches a different server instance', async () => {
    await bindRemoteNodeWindow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ serverInstanceId: 'srv_advertised_node_12345678901234567890' }),
    }));
    apiServiceMock.get.mockResolvedValue({ data: { serverInstanceId: 'srv_management_node_12345678901234567890' } });

    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.manualServerBaseUrl = 'https://node.tailnet.ts.net/mobile';
    store.selectedServerBaseUrl = 'https://node.tailnet.ts.net/mobile';

    await store.createPairingSession();

    expect(globalThis.fetch).toHaveBeenCalledWith('https://node.tailnet.ts.net/rest/remote-access/status', { method: 'GET' });
    expect(apiServiceMock.post).not.toHaveBeenCalled();
    expect(store.error).toContain('different AutoByteUs node');
    expect(store.advertisedUrlVerified).toBe(false);
  });

  it('verifies remote-node private HTTP advertised URL server identity before creating a trusted-network QR', async () => {
    await bindRemoteNodeWindow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ serverInstanceId: 'srv_same_http_node_id_12345678901234567890' }),
    }));
    apiServiceMock.get.mockResolvedValue({ data: { serverInstanceId: 'srv_same_http_node_id_12345678901234567890' } });
    apiServiceMock.post.mockResolvedValue({
      data: {
        payload: {
          version: 1,
          serverBaseUrl: 'http://192.168.1.25:29695',
          pairingCode: 'code',
          expiresAt: '2026-05-22T00:05:00.000Z',
          serverName: 'AutoByteus Remote Node',
        },
        qrText: 'http://192.168.1.25:29695/mobile?pairing=encoded',
        mobileUrl: 'http://192.168.1.25:29695/mobile?pairing=encoded',
      },
    });

    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.manualServerBaseUrl = 'http://192.168.1.25:29695/mobile';
    store.selectedServerBaseUrl = 'http://192.168.1.25:29695/mobile';
    store.trustedPrivateHttpAcknowledged = true;

    await store.createPairingSession();

    expect(globalThis.fetch).toHaveBeenCalledWith('http://192.168.1.25:29695/rest/remote-access/status', { method: 'GET' });
    expect(apiServiceMock.post).toHaveBeenCalledWith('/remote-access/pairing-sessions', {
      serverBaseUrl: 'http://192.168.1.25:29695',
      serverName: 'AutoByteus Remote Node',
      trustedPrivateHttpAcknowledged: true,
    });
    expect(store.advertisedUrlVerified).toBe(true);
  });

  it('verifies remote-node advertised URL server identity before creating a trusted-network QR', async () => {
    await bindRemoteNodeWindow();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ serverInstanceId: 'srv_same_node_id_12345678901234567890' }),
    }));
    apiServiceMock.get.mockResolvedValue({ data: { serverInstanceId: 'srv_same_node_id_12345678901234567890' } });
    apiServiceMock.post.mockResolvedValue({
      data: {
        payload: {
          version: 1,
          serverBaseUrl: 'https://node.tailnet.ts.net',
          pairingCode: 'code',
          expiresAt: '2026-05-22T00:05:00.000Z',
          serverName: 'AutoByteus Remote Node',
        },
        qrText: 'https://node.tailnet.ts.net/mobile?pairing=encoded',
        mobileUrl: 'https://node.tailnet.ts.net/mobile?pairing=encoded',
      },
    });

    const store = usePhoneAccessStore();
    store.settings.phoneAccessEnabled = true;
    store.manualServerBaseUrl = 'https://node.tailnet.ts.net/mobile';
    store.selectedServerBaseUrl = 'https://node.tailnet.ts.net/mobile';

    await store.createPairingSession();

    expect(globalThis.fetch).toHaveBeenCalledWith('https://node.tailnet.ts.net/rest/remote-access/status', { method: 'GET' });
    expect(apiServiceMock.post).toHaveBeenCalledWith('/remote-access/pairing-sessions', {
      serverBaseUrl: 'https://node.tailnet.ts.net',
      serverName: 'AutoByteus Remote Node',
    });
    expect(store.advertisedUrlVerified).toBe(true);
  });

  it('clears acknowledgement, verification, and active QR state when the selected URL changes', async () => {
    const store = usePhoneAccessStore();
    store.trustedPrivateHttpAcknowledged = true;
    store.advertisedUrlVerified = true;
    store.advertisedUrlVerificationMessage = 'verified';
    store.activePairing = {
      payload: {
        version: 1,
        serverBaseUrl: 'http://192.168.1.25:29695',
        pairingCode: 'code',
        expiresAt: '2026-05-22T00:05:00.000Z',
        serverName: 'AutoByteus Desktop',
      },
      qrText: 'http://192.168.1.25:29695/mobile?pairing=encoded',
      mobileUrl: 'http://192.168.1.25:29695/mobile?pairing=encoded',
    };

    store.selectedServerBaseUrl = 'http://192.168.1.26:29695';
    await nextTick();

    expect(store.trustedPrivateHttpAcknowledged).toBe(false);
    expect(store.advertisedUrlVerified).toBe(false);
    expect(store.advertisedUrlVerificationMessage).toBeNull();
    expect(store.activePairing).toBeNull();
  });
});

async function bindRemoteNodeWindow(): Promise<void> {
  const { useWindowNodeContextStore } = await import('../windowNodeContextStore');
  useWindowNodeContextStore().bindNodeContext('remote-node-1', 'http://127.0.0.1:8001');
}
