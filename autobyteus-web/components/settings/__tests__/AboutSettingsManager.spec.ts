import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AboutSettingsManager from '../AboutSettingsManager.vue';

const { appUpdateStoreMock } = vi.hoisted(() => {
  const store = {
    initialized: false,
    isElectron: true,
    status: 'idle',
    message: '',
    currentVersion: '1.1.11',
    checkedAt: null as string | null,
    initialize: vi.fn().mockResolvedValue(undefined),
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
    downloadUpdate: vi.fn().mockResolvedValue(undefined),
    installUpdateAndRestart: vi.fn().mockResolvedValue(undefined),
  };

  return {
    appUpdateStoreMock: store,
  };
});

vi.mock('~/stores/appUpdateStore', () => ({
  useAppUpdateStore: () => appUpdateStoreMock,
}));

describe('AboutSettingsManager', () => {
  beforeEach(() => {
    appUpdateStoreMock.initialized = false;
    appUpdateStoreMock.isElectron = true;
    appUpdateStoreMock.status = 'idle';
    appUpdateStoreMock.message = '';
    appUpdateStoreMock.currentVersion = '1.1.11';
    appUpdateStoreMock.checkedAt = null;
    appUpdateStoreMock.initialize.mockClear();
    appUpdateStoreMock.checkForUpdates.mockClear();
    appUpdateStoreMock.downloadUpdate.mockClear();
    appUpdateStoreMock.installUpdateAndRestart.mockClear();
  });

  it('renders version and default status details', () => {
    const wrapper = mount(AboutSettingsManager);

    expect(wrapper.find('[data-testid="settings-about-panel"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="settings-about-version"]').text()).toContain('1.1.11');
    expect(wrapper.get('[data-testid="settings-about-status"]').text()).toContain('Idle');
    expect(wrapper.get('[data-testid="settings-about-last-checked"]').text()).toContain('Never');
  });

  it('calls initialize on mount when store is not initialized', () => {
    mount(AboutSettingsManager);
    expect(appUpdateStoreMock.initialize).toHaveBeenCalledTimes(1);
  });

  it('triggers manual update check from About action', async () => {
    const wrapper = mount(AboutSettingsManager);

    await wrapper.get('[data-testid="settings-about-check-updates"]').trigger('click');
    expect(appUpdateStoreMock.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('renders contextual download and install actions by status', async () => {
    appUpdateStoreMock.status = 'available';
    let wrapper = mount(AboutSettingsManager);
    await wrapper.get('[data-testid="settings-about-download-update"]').trigger('click');
    expect(appUpdateStoreMock.downloadUpdate).toHaveBeenCalledTimes(1);

    appUpdateStoreMock.status = 'downloaded';
    wrapper = mount(AboutSettingsManager);
    await wrapper.get('[data-testid="settings-about-install-update"]').trigger('click');
    expect(appUpdateStoreMock.installUpdateAndRestart).toHaveBeenCalledTimes(1);
  });
});
