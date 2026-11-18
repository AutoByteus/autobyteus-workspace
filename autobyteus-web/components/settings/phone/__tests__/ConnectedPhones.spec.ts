import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { reactive } from 'vue';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import type { PairedDeviceSummary } from '~/types/remoteAccess';
import ConnectedPhones from '../ConnectedPhones.vue';

// CR-001 (API-17): dates in the phones list follow the app's language, not the computer's.
// Synthetic phones and dates; nothing real.
const store = vi.hoisted(() => ({ value: null as unknown as { activeDevices: PairedDeviceSummary[]; revokedDevices: PairedDeviceSummary[] } }));
vi.mock('~/stores/phoneAccessStore', () => ({ usePhoneAccessStore: () => store.value }));

const NOW = new Date('2026-11-07T12:00:00.000Z');
const device = (overrides: Partial<PairedDeviceSummary>): PairedDeviceSummary => ({
  deviceId: 'device_1',
  displayName: 'Pixel 8',
  clientFacingBaseUrl: 'http://192.168.1.20:29695',
  connectionWay: 'tailscale',
  createdAt: '2026-10-01T00:00:00.000Z',
  lastSeenAt: new Date(NOW.getTime() - 120_000).toISOString(),
  revokedAt: null,
  ...overrides,
});

/** A computer whose own language is German (the user's de_DE Mac): a format without a locale would be German. */
const OS_LOCALE = 'de-DE';
const RealRelativeTimeFormat = Intl.RelativeTimeFormat;
const realToLocaleDateString = Date.prototype.toLocaleDateString;
const useGermanComputerDefault = () => {
  vi.stubGlobal('Intl', {
    ...Intl,
    RelativeTimeFormat: class extends RealRelativeTimeFormat {
      constructor(locales?: string | string[], options?: Intl.RelativeTimeFormatOptions) {
        super(locales ?? OS_LOCALE, options);
      }
    },
  });
  Date.prototype.toLocaleDateString = function (locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
    return realToLocaleDateString.call(this, locales ?? OS_LOCALE, options);
  };
};

const mountList = async () => {
  const wrapper = mount(ConnectedPhones);
  await wrapper.get('[data-testid="phones-history-toggle"]').trigger('click');
  await flushPromises();
  return {
    active: wrapper.get('[data-testid="phones-active-row"]').text(),
    history: wrapper.get('[data-testid="phones-history-row"]').text(),
    toggle: wrapper.get('[data-testid="phones-history-toggle"]').text(),
  };
};

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
  useGermanComputerDefault();
  store.value = reactive({
    activeDevices: [device({})],
    revokedDevices: [device({ deviceId: 'device_2', displayName: 'Old Phone', connectionWay: 'local_network', revokedAt: '2026-10-28T12:00:00.000Z' })],
  });
});

afterEach(async () => {
  await localizationRuntime.setPreference('en');
  Date.prototype.toLocaleDateString = realToLocaleDateString;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('ConnectedPhones dates', () => {
  it('app in English on a German computer: "Last seen 2 minutes ago" and "Revoked Oct 28"', async () => {
    await localizationRuntime.setPreference('en');
    const rows = await mountList();
    expect(rows.active).toContain('Connects through Tailscale · Last seen 2 minutes ago');
    expect(rows.history).toContain('Revoked Oct 28 · Connected through Wi-Fi');
    expect(rows.toggle).toBe('History (1)');
  });

  it('app in Chinese on a German computer: the dates are Chinese too', async () => {
    await localizationRuntime.setPreference('zh-CN');
    const rows = await mountList();
    expect(rows.active).toContain('最近使用 2分钟前');
    expect(rows.history).toContain('10月28日 已撤销');
    expect(rows.active).not.toMatch(/vor|Min\./);
    expect(rows.history).not.toContain('Okt');
  });
});
