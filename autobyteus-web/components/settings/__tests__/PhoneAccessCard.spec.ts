import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PhoneAccessCard from '../PhoneAccessCard.vue';

const { phoneAccessStoreMock, translateMock, toQrCodeDataUrlMock } = vi.hoisted(() => {
  const translateMock = vi.fn((key: string, params?: Record<string, string | number>) => {
    let value = `__${key}__`;
    if (params) {
      for (const [paramKey, paramValue] of Object.entries(params)) {
        value = value.replaceAll(`{{${paramKey}}}`, String(paramValue));
      }
    }
    return value;
  });

  return {
    phoneAccessStoreMock: {
      settings: { phoneAccessEnabled: true, updatedAt: '2026-05-22T00:00:00.000Z' },
      candidates: [{ id: 'tailnet', kind: 'tailnet_like', label: 'Tailnet', serverBaseUrl: 'https://desktop.tailnet.ts.net', source: 'test' }],
      activeDevices: [
        {
          deviceId: 'active-1',
          displayName: 'Active Phone',
          clientFacingBaseUrl: 'https://desktop.tailnet.ts.net',
          createdAt: '2026-05-22T00:00:00.000Z',
          lastSeenAt: null,
          revokedAt: null,
        },
      ],
      revokedDevices: [
        {
          deviceId: 'revoked-1',
          displayName: 'Revoked Phone',
          clientFacingBaseUrl: 'https://desktop.tailnet.ts.net',
          createdAt: '2026-05-21T00:00:00.000Z',
          lastSeenAt: null,
          revokedAt: '2026-05-22T00:00:00.000Z',
        },
      ],
      activePairing: null,
      selectedServerBaseUrl: 'https://desktop.tailnet.ts.net',
      manualServerBaseUrl: '',
      trustedPrivateHttpAcknowledged: false,
      isLoading: false,
      error: null,
      info: null,
      advertisedUrlVerified: false,
      advertisedUrlVerificationMessage: null,
      phoneAccessEnabled: true,
      isRemoteNodeWindow: false,
      managementBaseUrl: 'http://127.0.0.1:29695',
      currentNodeName: 'AutoByteus Desktop',
      canManagePhoneAccess: true,
      selectedUrlValidation: {
        normalizedBaseUrl: 'https://desktop.tailnet.ts.net',
        isValid: true,
        isHttps: true,
        isAndroidFacing: true,
        transportSecurity: 'https' as 'https' | 'trusted_private_http' | null,
        requiresTrustedPrivateHttpAcknowledgement: false,
        message: null as string | null,
        warning: null as string | null,
      },
      selectedUrlRequiresTrustedPrivateHttpAcknowledgement: false,
      selectedUrlWarning: null as string | null,
      canCreatePairingSession: true,
      loadAll: vi.fn().mockResolvedValue(undefined),
      setEnabled: vi.fn().mockResolvedValue(undefined),
      refreshCandidates: vi.fn().mockResolvedValue(undefined),
      createPairingSession: vi.fn().mockResolvedValue(undefined),
      refreshDevices: vi.fn().mockResolvedValue(undefined),
      revokeDevice: vi.fn().mockResolvedValue(undefined),
      revokeAllDevices: vi.fn().mockResolvedValue(1),
    },
    translateMock,
    toQrCodeDataUrlMock: vi.fn().mockResolvedValue('data:image/png;base64,qr'),
  };
});

vi.mock('~/stores/phoneAccessStore', () => ({
  usePhoneAccessStore: () => phoneAccessStoreMock,
}));

vi.mock('~/services/qr/qrCodeDataUrlService', () => ({
  toQrCodeDataUrl: toQrCodeDataUrlMock,
}));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: translateMock,
  }),
}));

describe('PhoneAccessCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    phoneAccessStoreMock.phoneAccessEnabled = true;
    phoneAccessStoreMock.isLoading = false;
    phoneAccessStoreMock.error = null;
    phoneAccessStoreMock.info = null;
    phoneAccessStoreMock.advertisedUrlVerified = false;
    phoneAccessStoreMock.advertisedUrlVerificationMessage = null;
    phoneAccessStoreMock.isRemoteNodeWindow = false;
    phoneAccessStoreMock.canManagePhoneAccess = true;
    phoneAccessStoreMock.selectedServerBaseUrl = 'https://desktop.tailnet.ts.net';
    phoneAccessStoreMock.manualServerBaseUrl = '';
    phoneAccessStoreMock.trustedPrivateHttpAcknowledged = false;
    phoneAccessStoreMock.selectedUrlValidation = {
      normalizedBaseUrl: 'https://desktop.tailnet.ts.net',
      isValid: true,
      isHttps: true,
      isAndroidFacing: true,
      transportSecurity: 'https' as 'https' | 'trusted_private_http' | null,
      requiresTrustedPrivateHttpAcknowledgement: false,
      message: null as string | null,
      warning: null as string | null,
    };
    phoneAccessStoreMock.selectedUrlRequiresTrustedPrivateHttpAcknowledgement = false;
    phoneAccessStoreMock.selectedUrlWarning = null as string | null;
    phoneAccessStoreMock.canCreatePairingSession = true;
  });

  it('renders active devices separately from revoked history', async () => {
    const wrapper = mount(PhoneAccessCard);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="phone-access-manual-url-help"]').text()).toBeTruthy();
    expect(wrapper.get('[data-testid="phone-access-candidate-note"]').text()).toBeTruthy();
    expect(wrapper.get('[data-testid="phone-access-normalized-url-note"]').text()).toBeTruthy();
    expect(wrapper.find('[data-testid="phone-access-device-active-1"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="phone-access-device-revoked-1"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="phone-access-revoke-device"]')).toHaveLength(1);

    await wrapper.get('[data-testid="phone-access-devices-tab-revoked"]').trigger('click');

    expect(wrapper.find('[data-testid="phone-access-device-active-1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="phone-access-device-revoked-1"]').exists()).toBe(true);
    expect(wrapper.findAll('[data-testid="phone-access-revoke-device"]')).toHaveLength(0);
  });

  it('requires acknowledgement and shows a trusted-LAN warning for private HTTP selected URLs', async () => {
    phoneAccessStoreMock.selectedServerBaseUrl = 'http://192.168.1.25:29695';
    phoneAccessStoreMock.selectedUrlValidation = {
      normalizedBaseUrl: 'http://192.168.1.25:29695',
      isValid: true,
      isHttps: false,
      isAndroidFacing: true,
      transportSecurity: 'trusted_private_http' as 'https' | 'trusted_private_http' | null,
      requiresTrustedPrivateHttpAcknowledgement: true,
      message: null as string | null,
      warning: 'This URL uses cleartext HTTP.',
    };
    phoneAccessStoreMock.selectedUrlRequiresTrustedPrivateHttpAcknowledgement = true;
    phoneAccessStoreMock.selectedUrlWarning = 'This URL uses cleartext HTTP.';
    phoneAccessStoreMock.canCreatePairingSession = false;

    const wrapper = mount(PhoneAccessCard);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="phone-access-create-qr"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-testid="phone-access-url-warning"]').text()).toContain('privateHttpWarningTitle');
    expect(wrapper.find('[data-testid="phone-access-private-http-ack"]').exists()).toBe(true);
  });

  it('keeps manual Serve HTTPS entry as a QR-capable primary path', async () => {
    phoneAccessStoreMock.selectedServerBaseUrl = 'https://desktop.tailnet.ts.net';
    phoneAccessStoreMock.manualServerBaseUrl = 'https://desktop.tailnet.ts.net/mobile';
    phoneAccessStoreMock.selectedUrlValidation = {
      normalizedBaseUrl: 'https://desktop.tailnet.ts.net',
      isValid: true,
      isHttps: true,
      isAndroidFacing: true,
      transportSecurity: 'https' as 'https' | 'trusted_private_http' | null,
      requiresTrustedPrivateHttpAcknowledgement: false,
      message: null as string | null,
      warning: null as string | null,
    };
    phoneAccessStoreMock.canCreatePairingSession = true;

    const wrapper = mount(PhoneAccessCard);
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-testid="phone-access-create-qr"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="phone-access-use-manual-url"]').trigger('click');

    expect(phoneAccessStoreMock.refreshCandidates).toHaveBeenCalled();
  });
});
