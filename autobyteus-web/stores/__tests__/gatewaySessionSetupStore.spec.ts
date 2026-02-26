import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGatewaySessionSetupStore } from '~/stores/gatewaySessionSetupStore';
import { GatewayClientError } from '~/services/messagingGatewayClient';

const {
  gatewayClientMock,
  createGatewayClientMock,
} = vi.hoisted(() => {
  const client = {
    getHealth: vi.fn(),
    getRuntimeReliabilityStatus: vi.fn(),
    startWhatsAppPersonalSession: vi.fn(),
    getWhatsAppPersonalQr: vi.fn(),
    getWhatsAppPersonalStatus: vi.fn(),
    stopWhatsAppPersonalSession: vi.fn(),
    startWeChatPersonalSession: vi.fn(),
    getWeChatPersonalQr: vi.fn(),
    getWeChatPersonalStatus: vi.fn(),
    stopWeChatPersonalSession: vi.fn(),
  };

  return {
    gatewayClientMock: client,
    createGatewayClientMock: vi.fn(() => client),
  };
});

vi.mock('~/services/messagingGatewayClient', () => ({
  createMessagingGatewayClient: createGatewayClientMock,
  GatewayClientError: class GatewayClientError extends Error {
    statusCode: number | null;

    code: string | null;

    details: { sessionId?: string } | null;

    constructor(
      message: string,
      statusCode: number | null,
      code: string | null,
      details: { sessionId?: string } | null = null,
    ) {
      super(message);
      this.name = 'GatewayClientError';
      this.statusCode = statusCode;
      this.code = code;
      this.details = details;
    }
  },
}));

describe('gatewaySessionSetupStore', () => {
  const GATEWAY_CONFIG_STORAGE_KEY = 'messaging_gateway_config_v1';
  const originalUseRuntimeConfig = (globalThis as any).useRuntimeConfig;
  const originalLocalStorage = (globalThis as any).localStorage;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    gatewayClientMock.getRuntimeReliabilityStatus.mockResolvedValue({
      runtime: {
        state: 'HEALTHY',
        criticalCode: null,
        updatedAt: '2026-02-12T00:00:00.000Z',
        workers: {
          inboundForwarder: {
            running: true,
            lastError: null,
            lastErrorAt: null,
          },
          outboundSender: {
            running: true,
            lastError: null,
            lastErrorAt: null,
          },
        },
        locks: {
          inbox: {
            ownerId: 'owner-inbox',
            held: true,
            lost: false,
            lastHeartbeatAt: '2026-02-12T00:00:00.000Z',
            lastError: null,
          },
          outbox: {
            ownerId: 'owner-outbox',
            held: true,
            lost: false,
            lastHeartbeatAt: '2026-02-12T00:00:00.000Z',
            lastError: null,
          },
        },
      },
      queue: {
        inboundDeadLetterCount: 0,
        inboundCompletedUnboundCount: 0,
        outboundDeadLetterCount: 0,
      },
    });
    const storageState = new Map<string, string>();
    const localStorageMock = {
      getItem: vi.fn((key: string) => storageState.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        storageState.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        storageState.delete(key);
      }),
      clear: vi.fn(() => {
        storageState.clear();
      }),
    };
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      configurable: true,
      writable: true,
    });
    (globalThis as any).useRuntimeConfig = vi.fn(() => ({
      public: {
        messageGatewayBaseUrl: 'https://runtime.example.com',
        messageGatewayAdminToken: 'runtime-token',
      },
    }));
  });

  afterEach(() => {
    const store = useGatewaySessionSetupStore();
    store.stopSessionStatusAutoSync('test_cleanup');
    (globalThis as any).useRuntimeConfig = originalUseRuntimeConfig;
    Object.defineProperty(globalThis, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
      writable: true,
    });
  });

  it('validateGatewayConnection sets READY when health is ok', async () => {
    gatewayClientMock.getHealth.mockResolvedValue({ status: 'ok' });

    const store = useGatewaySessionSetupStore();
    await store.validateGatewayConnection({ baseUrl: 'https://gateway.example.com' });

    expect(createGatewayClientMock).toHaveBeenCalledWith({
      baseUrl: 'https://gateway.example.com',
      adminToken: undefined,
    });
    expect(store.gatewayStatus).toBe('READY');
    expect(store.gatewayError).toBeNull();
  });

  it('validateGatewayConnection sets BLOCKED on error', async () => {
    gatewayClientMock.getHealth.mockRejectedValue(
      new GatewayClientError('invalid token', 401, 'UNAUTHORIZED'),
    );

    const store = useGatewaySessionSetupStore();

    await expect(
      store.validateGatewayConnection({ baseUrl: 'https://gateway.example.com' }),
    ).rejects.toThrow('invalid token');

    expect(store.gatewayStatus).toBe('BLOCKED');
    expect(store.gatewayError).toBe('invalid token');
  });

  it('startPersonalSession stores session and QR payload', async () => {
    gatewayClientMock.startWhatsAppPersonalSession.mockResolvedValue({
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
    });
    gatewayClientMock.getWhatsAppPersonalQr.mockResolvedValue({
      code: 'qr-code',
      expiresAt: '2026-02-09T12:00:00.000Z',
    });

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';

    await store.startPersonalSession('Home');

    expect(store.session?.sessionId).toBe('session-1');
    expect(store.session?.qr?.code).toBe('qr-code');
    expect(store.personalModeBlockedReason).toBeNull();
    expect(store.sessionStatusAutoSyncState).toBe('running');
    expect(store.sessionStatusAutoSyncSessionId).toBe('session-1');
  });

  it('startPersonalSession routes to WeChat APIs when provider is WECHAT', async () => {
    gatewayClientMock.startWeChatPersonalSession.mockResolvedValue({
      sessionId: 'wechat-session-1',
      accountLabel: 'Home WeChat',
      status: 'PENDING_QR',
    });
    gatewayClientMock.getWeChatPersonalQr.mockResolvedValue({
      code: 'wechat-qr-code',
      expiresAt: '2026-02-09T12:00:00.000Z',
    });

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.setSessionProvider('WECHAT');

    await store.startPersonalSession('Home WeChat');

    expect(store.session?.sessionId).toBe('wechat-session-1');
    expect(store.session?.qr?.code).toBe('wechat-qr-code');
    expect(gatewayClientMock.startWeChatPersonalSession).toHaveBeenCalledWith('Home WeChat');
    expect(gatewayClientMock.getWeChatPersonalQr).toHaveBeenCalledWith('wechat-session-1');
  });

  it('startPersonalSession attaches to existing session on conflict', async () => {
    gatewayClientMock.startWhatsAppPersonalSession.mockRejectedValue(
      new GatewayClientError(
        'A personal session is already running.',
        409,
        'SESSION_ALREADY_RUNNING',
        { sessionId: 'session-existing' },
      ),
    );
    gatewayClientMock.getWhatsAppPersonalStatus.mockResolvedValue({
      sessionId: 'session-existing',
      accountLabel: 'Home',
      status: 'PENDING_QR',
    });
    gatewayClientMock.getWhatsAppPersonalQr.mockResolvedValue({
      code: 'qr-existing',
      expiresAt: '2026-02-09T12:00:00.000Z',
    });

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';

    const session = await store.startPersonalSession('Home');

    expect(session?.sessionId).toBe('session-existing');
    expect(store.session?.qr?.code).toBe('qr-existing');
    expect(store.sessionError).toBeNull();
    expect(store.personalModeBlockedReason).toBeNull();
    expect(store.sessionStatusAutoSyncState).toBe('running');
    expect(store.sessionStatusAutoSyncSessionId).toBe('session-existing');
  });

  it('startPersonalSession marks personal mode blocked on 403', async () => {
    gatewayClientMock.startWhatsAppPersonalSession.mockRejectedValue(
      new GatewayClientError('Personal mode disabled', 403, 'PERSONAL_MODE_DISABLED'),
    );

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';

    await expect(store.startPersonalSession('Home')).rejects.toThrow('Personal mode disabled');

    expect(store.personalModeBlockedReason).toBe('Personal mode disabled');
    expect(store.sessionError).toBe('Personal mode disabled');
  });

  it('startPersonalSession blocks when conflict payload has no session id', async () => {
    gatewayClientMock.startWhatsAppPersonalSession.mockRejectedValue(
      new GatewayClientError('A personal session is already running.', 409, 'SESSION_ALREADY_RUNNING'),
    );

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';

    await expect(store.startPersonalSession('Home')).rejects.toThrow(
      'A personal session is already running.',
    );
    expect(store.personalModeBlockedReason).toBe(
      'A personal session is already running, but gateway did not return its session id.',
    );
    expect(store.sessionError).toBe('A personal session is already running.');
  });

  it('fetchPersonalSessionQr treats 409 not-ready as non-fatal', async () => {
    gatewayClientMock.getWhatsAppPersonalQr.mockRejectedValue(
      new GatewayClientError('QR not ready yet', 409, 'SESSION_QR_NOT_READY'),
    );

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'STOPPED',
    };

    await expect(store.fetchPersonalSessionQr()).resolves.toBeNull();

    expect(store.session?.status).toBe('PENDING_QR');
    expect(store.personalModeBlockedReason).toBeNull();
    expect(store.sessionError).toBe('QR code is not ready yet. Please retry in a few seconds.');
  });

  it('fetchPersonalSessionQr handles 410 expiration', async () => {
    gatewayClientMock.getWhatsAppPersonalQr.mockRejectedValue(
      new GatewayClientError('QR expired', 410, 'SESSION_QR_EXPIRED'),
    );

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
      qr: {
        code: 'old-qr',
        expiresAt: '2026-02-09T10:00:00.000Z',
      },
    };

    await expect(store.fetchPersonalSessionQr()).rejects.toThrow('QR expired');

    expect(store.qrExpiredAt).not.toBeNull();
    expect(store.session?.qr).toBeUndefined();
  });

  it('fetchPersonalSessionStatus clears session on 404', async () => {
    gatewayClientMock.getWhatsAppPersonalStatus.mockRejectedValue(
      new GatewayClientError('Session not found', 404, 'SESSION_NOT_FOUND'),
    );

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
    };

    await expect(store.fetchPersonalSessionStatus()).rejects.toThrow('Session not found');
    expect(store.session).toBeNull();
  });

  it('fetchPersonalSessionStatus clears stale QR when session is no longer pending', async () => {
    gatewayClientMock.getWhatsAppPersonalStatus.mockResolvedValue({
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'STOPPED',
    });

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
      qr: {
        code: 'stale-qr',
        expiresAt: '2026-02-09T10:00:00.000Z',
      },
    };

    await expect(store.fetchPersonalSessionStatus()).resolves.toEqual({
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'STOPPED',
    });

    expect(store.session?.status).toBe('STOPPED');
    expect(store.session?.qr).toBeUndefined();
  });

  it('runSessionStatusSyncTick stops auto sync when session becomes ACTIVE', async () => {
    gatewayClientMock.getWhatsAppPersonalStatus.mockResolvedValue({
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'ACTIVE',
    });

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
    };
    store.startSessionStatusAutoSync('session-1');

    await store.runSessionStatusSyncTick();

    expect(store.sessionStatusAutoSyncState).toBe('stopped');
    expect(store.sessionStatusAutoSyncReason).toBe('active');
  });

  it('runSessionStatusSyncTick pauses auto sync after retry budget exhaustion', async () => {
    gatewayClientMock.getWhatsAppPersonalStatus.mockRejectedValue(
      new GatewayClientError('gateway unavailable', 503, 'GATEWAY_UNAVAILABLE'),
    );

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
    };
    store.startSessionStatusAutoSync('session-1');

    for (let index = 0; index < 5; index += 1) {
      await store.runSessionStatusSyncTick();
    }

    expect(store.sessionStatusAutoSyncState).toBe('paused');
    expect(store.sessionStatusAutoSyncReason).toBe('retry_budget_exhausted');
  });

  it('manual status fetch resumes auto sync when session is still pending', async () => {
    gatewayClientMock.getWhatsAppPersonalStatus.mockResolvedValue({
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
    });

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
    };
    store.sessionStatusAutoSyncState = 'paused';
    store.sessionStatusAutoSyncReason = 'retry_budget_exhausted';

    await store.fetchPersonalSessionStatus('session-1');

    expect(store.sessionStatusAutoSyncState).toBe('running');
    expect(store.sessionStatusAutoSyncReason).toBeNull();
    expect(store.sessionStatusAutoSyncSessionId).toBe('session-1');
  });

  it('stopPersonalSession always clears auto sync lifecycle state', async () => {
    gatewayClientMock.stopWhatsAppPersonalSession.mockRejectedValue(
      new GatewayClientError('Stop failed', 500, 'STOP_FAILED'),
    );

    const store = useGatewaySessionSetupStore();
    store.gatewayBaseUrl = 'https://gateway.example.com';
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
    };
    store.startSessionStatusAutoSync('session-1');

    await expect(store.stopPersonalSession('session-1')).rejects.toThrow('Stop failed');

    expect(store.sessionStatusAutoSyncState).toBe('stopped');
    expect(store.sessionStatusAutoSyncReason).toBe('stop_failed');
  });

  it('setSessionProvider resets active session state', () => {
    const store = useGatewaySessionSetupStore();
    store.session = {
      sessionId: 'session-1',
      accountLabel: 'Home',
      status: 'PENDING_QR',
      qr: {
        code: 'qr-content',
        expiresAt: '2026-02-09T12:00:00.000Z',
      },
    };
    store.sessionError = 'error';
    store.personalModeBlockedReason = 'blocked';
    store.qrExpiredAt = '2026-02-09T12:00:00.000Z';
    store.sessionStatusAutoSyncState = 'running';
    store.sessionStatusAutoSyncSessionId = 'session-1';
    store.sessionStatusAutoSyncStartedAtMs = Date.now();

    store.setSessionProvider('WECHAT');

    expect(store.sessionProvider).toBe('WECHAT');
    expect(store.session).toBeNull();
    expect(store.sessionError).toBeNull();
    expect(store.personalModeBlockedReason).toBeNull();
    expect(store.qrExpiredAt).toBeNull();
    expect(store.sessionStatusAutoSyncState).toBe('stopped');
    expect(store.sessionStatusAutoSyncSessionId).toBeNull();
  });

  it('getReadinessSnapshot reports missing session blocker', () => {
    const store = useGatewaySessionSetupStore();
    store.gatewayStatus = 'READY';

    const snapshot = store.getReadinessSnapshot();

    expect(snapshot.gatewayReady).toBe(true);
    expect(snapshot.personalSessionReady).toBe(false);
    expect(snapshot.personalSessionBlockedReason).toBeNull();
  });

  it('initializeFromConfig does not overwrite user-entered gateway config', () => {
    const store = useGatewaySessionSetupStore();
    store.setGatewayConfig({
      baseUrl: 'http://localhost:8010',
      adminToken: 'manual-token',
    });

    store.initializeFromConfig();

    expect(store.gatewayBaseUrl).toBe('http://localhost:8010');
    expect(store.gatewayAdminToken).toBe('manual-token');
  });

  it('initializeFromConfig prefers persisted gateway config when available', () => {
    (globalThis as any).localStorage.setItem(
      GATEWAY_CONFIG_STORAGE_KEY,
      JSON.stringify({
        baseUrl: 'http://localhost:8010',
        adminToken: 'persisted-token',
      }),
    );

    const store = useGatewaySessionSetupStore();
    store.initializeFromConfig();

    expect(store.gatewayBaseUrl).toBe('http://localhost:8010');
    expect(store.gatewayAdminToken).toBe('persisted-token');
  });

  it('setGatewayConfig invalidates readiness when config changes', () => {
    const store = useGatewaySessionSetupStore();
    store.gatewayStatus = 'READY';
    store.gatewayError = 'stale';
    store.gatewayHealth = {
      status: 'ok',
      serverConfigured: true,
      timestamp: '2026-02-09T12:00:00.000Z',
      providers: {},
    } as any;

    store.setGatewayConfig({
      baseUrl: 'http://localhost:8010',
    });

    expect(store.gatewayStatus).toBe('UNKNOWN');
    expect(store.gatewayError).toBeNull();
    expect(store.gatewayHealth).toBeNull();
  });

  it('setGatewayConfig persists and clears gateway config in local storage', () => {
    const store = useGatewaySessionSetupStore();

    store.setGatewayConfig({
      baseUrl: 'http://localhost:8010',
      adminToken: 'stored-token',
    });

    expect((globalThis as any).localStorage.setItem).toHaveBeenCalledWith(
      GATEWAY_CONFIG_STORAGE_KEY,
      JSON.stringify({
        baseUrl: 'http://localhost:8010',
        adminToken: 'stored-token',
      }),
    );

    store.setGatewayConfig({
      baseUrl: '',
      adminToken: '',
    });

    expect((globalThis as any).localStorage.removeItem).toHaveBeenCalledWith(
      GATEWAY_CONFIG_STORAGE_KEY,
    );
  });

});
