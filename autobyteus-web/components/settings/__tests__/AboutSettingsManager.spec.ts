import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AboutSettingsManager from '../AboutSettingsManager.vue';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';

const translate = (key: string, params?: Record<string, string | number>): string => (
  localizationRuntime.translate(key, params)
);

const { appUpdateStoreMock } = vi.hoisted(() => {
  const store = {
    initialized: false,
    isElectron: true,
    status: 'idle',
    message: '',
    currentVersion: '1.1.11',
    currentVersionIsPrerelease: false,
    updateChannel: 'stable',
    updateStaged: false,
    checkedAt: null as string | null,
    availableVersion: null as string | null,
    errorKind: null as string | null,
    initialize: vi.fn().mockResolvedValue(undefined),
    checkForUpdates: vi.fn().mockResolvedValue(undefined),
    downloadUpdate: vi.fn().mockResolvedValue(undefined),
    installUpdateAndRestart: vi.fn().mockResolvedValue(undefined),
    setUpdateChannel: vi.fn().mockResolvedValue(undefined),
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
    appUpdateStoreMock.currentVersionIsPrerelease = false;
    appUpdateStoreMock.updateChannel = 'stable';
    appUpdateStoreMock.updateStaged = false;
    appUpdateStoreMock.checkedAt = null;
    appUpdateStoreMock.availableVersion = null;
    appUpdateStoreMock.errorKind = null;
    appUpdateStoreMock.initialize.mockClear();
    appUpdateStoreMock.checkForUpdates.mockClear();
    appUpdateStoreMock.downloadUpdate.mockClear();
    appUpdateStoreMock.installUpdateAndRestart.mockClear();
    appUpdateStoreMock.setUpdateChannel.mockClear();
  });

  it('renders version and default status details', () => {
    const wrapper = mount(AboutSettingsManager);

    expect(wrapper.find('[data-testid="settings-updates-panel"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="settings-updates-version"]').text()).toContain('1.1.11');
    expect(wrapper.get('[data-testid="settings-updates-status"]').text()).toContain('Idle');
    expect(wrapper.get('[data-testid="settings-updates-last-checked"]').text()).toContain('Never');
  });

  it('shows a neutral disabled line and hides update controls when updates are disabled', () => {
    appUpdateStoreMock.status = 'disabled';

    const wrapper = mount(AboutSettingsManager);

    expect(wrapper.get('[data-testid="settings-updates-status"]').text()).toBe(
      translate('settings.components.settings.AboutSettingsManager.status.disabled'),
    );
    expect(wrapper.get('[data-testid="settings-updates-message"]').text()).toBe(
      translate('settings.components.settings.AboutSettingsManager.message.disabled'),
    );
    expect(wrapper.find('[data-testid="settings-updates-check-updates"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="settings-updates-beta-channel-toggle"]').exists()).toBe(false);
  });

  it('calls initialize on mount when store is not initialized', () => {
    mount(AboutSettingsManager);
    expect(appUpdateStoreMock.initialize).toHaveBeenCalledTimes(1);
  });

  it('triggers manual update check from Updates action', async () => {
    const wrapper = mount(AboutSettingsManager);

    await wrapper.get('[data-testid="settings-updates-check-updates"]').trigger('click');
    expect(appUpdateStoreMock.checkForUpdates).toHaveBeenCalledTimes(1);
  });

  it('renders contextual download and install actions by status', async () => {
    appUpdateStoreMock.status = 'available';
    let wrapper = mount(AboutSettingsManager);
    await wrapper.get('[data-testid="settings-updates-download-update"]').trigger('click');
    expect(appUpdateStoreMock.downloadUpdate).toHaveBeenCalledTimes(1);

    appUpdateStoreMock.status = 'downloaded';
    wrapper = mount(AboutSettingsManager);
    await wrapper.get('[data-testid="settings-updates-install-update"]').trigger('click');
    expect(appUpdateStoreMock.installUpdateAndRestart).toHaveBeenCalledTimes(1);
  });


  it('renders classified updater errors without raw diagnostics', () => {
    appUpdateStoreMock.status = 'error';
    appUpdateStoreMock.errorKind = 'release-preparing';
    appUpdateStoreMock.message = 'Cannot find latest-mac.yml in https://example.invalid/latest-mac.yml';

    const wrapper = mount(AboutSettingsManager);
    const text = wrapper.get('[data-testid="settings-updates-message"]').text();

    expect(text).toContain('still being prepared');
    expect(text).not.toContain('latest-mac.yml');
    expect(text).not.toContain('example.invalid');
  });

  it('renders restarting state and disables manual checks while installing', () => {
    appUpdateStoreMock.status = 'installing';
    appUpdateStoreMock.message = 'Installing update and restarting...';

    const wrapper = mount(AboutSettingsManager);

    expect(wrapper.get('[data-testid="settings-updates-status"]').text()).toContain('Restarting app');
    expect(wrapper.find('[data-testid="settings-updates-installing"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="settings-updates-check-updates"]').attributes('disabled')).toBeDefined();
  });

  describe('beta updates switch', () => {
    const toggle = (wrapper: ReturnType<typeof mount>) => wrapper.get('[data-testid="settings-updates-beta-channel-toggle"]');

    it('is off by default and explains the opt-out behavior', () => {
      const wrapper = mount(AboutSettingsManager);

      expect(toggle(wrapper).attributes('role')).toBe('switch');
      expect(toggle(wrapper).attributes('aria-checked')).toBe('false');
      expect(toggle(wrapper).attributes('disabled')).toBeUndefined();
      // Template copy renders through the test `$t` mock, which humanizes the key tail.
      expect(wrapper.get('#settings-updates-beta-channel-label').text()).toBe('Label');
      expect(toggle(wrapper).attributes('aria-labelledby')).toBe('settings-updates-beta-channel-label');
      expect(wrapper.text()).toContain('Description');
      expect(wrapper.find('[data-testid="settings-updates-beta-channel-downloaded-hint"]').exists()).toBe(false);
    });

    it('switches to beta when turned on', async () => {
      const wrapper = mount(AboutSettingsManager);

      await toggle(wrapper).trigger('click');

      expect(appUpdateStoreMock.setUpdateChannel).toHaveBeenCalledWith('beta');
    });

    it('switches back to stable when turned off', async () => {
      appUpdateStoreMock.updateChannel = 'beta';
      const wrapper = mount(AboutSettingsManager);

      expect(toggle(wrapper).attributes('aria-checked')).toBe('true');
      await toggle(wrapper).trigger('click');

      expect(appUpdateStoreMock.setUpdateChannel).toHaveBeenCalledWith('stable');
    });

    it.each(['checking', 'downloading', 'installing'])('is disabled while %s', async (status) => {
      appUpdateStoreMock.status = status;
      const wrapper = mount(AboutSettingsManager);

      expect(toggle(wrapper).attributes('disabled')).toBeDefined();
      await toggle(wrapper).trigger('click');
      expect(appUpdateStoreMock.setUpdateChannel).not.toHaveBeenCalled();
    });

    it.each(['idle', 'no-update', 'available', 'error'])('is enabled while %s with nothing staged', (status) => {
      appUpdateStoreMock.status = status;
      const wrapper = mount(AboutSettingsManager);

      expect(toggle(wrapper).attributes('disabled')).toBeUndefined();
      expect(wrapper.find('[data-testid="settings-updates-beta-channel-downloaded-hint"]').exists()).toBe(false);
    });

    it.each(['downloaded', 'available', 'no-update', 'error'])(
      'stays disabled with the hint while an update is staged and the status is %s',
      async (status) => {
        appUpdateStoreMock.status = status;
        appUpdateStoreMock.updateStaged = true;
        const wrapper = mount(AboutSettingsManager);

        expect(toggle(wrapper).attributes('disabled')).toBeDefined();
        expect(wrapper.get('[data-testid="settings-updates-beta-channel-downloaded-hint"]').text()).toBe('Downloaded hint');
        await toggle(wrapper).trigger('click');
        expect(appUpdateStoreMock.setUpdateChannel).not.toHaveBeenCalled();
      },
    );

    it('is not interactive in the web build', () => {
      appUpdateStoreMock.isElectron = false;
      const wrapper = mount(AboutSettingsManager);

      expect(toggle(wrapper).attributes('disabled')).toBeDefined();
    });
  });

  describe('beta badge', () => {
    it('labels a running beta build', () => {
      appUpdateStoreMock.currentVersion = '1.4.90-beta.3';
      appUpdateStoreMock.currentVersionIsPrerelease = true;
      const wrapper = mount(AboutSettingsManager);

      expect(wrapper.get('[data-testid="settings-updates-version"]').text()).toBe('1.4.90-beta.3');
      expect(wrapper.get('[data-testid="settings-updates-beta-badge"]').text()).toBe('Beta badge');
    });

    it('shows no badge on a stable build', () => {
      const wrapper = mount(AboutSettingsManager);

      expect(wrapper.find('[data-testid="settings-updates-beta-badge"]').exists()).toBe(false);
    });
  });

  describe('real channel copy', () => {
    afterEach(async () => {
      await localizationRuntime.setPreference('en');
    });

    const mountWithCatalog = () => mount(AboutSettingsManager, { global: { mocks: { $t: translate } } });

    it('renders the English switch, explanation, hint and badge', async () => {
      await localizationRuntime.setPreference('en');
      appUpdateStoreMock.status = 'downloaded';
      appUpdateStoreMock.updateStaged = true;
      appUpdateStoreMock.currentVersionIsPrerelease = true;
      const wrapper = mountWithCatalog();

      expect(wrapper.get('#settings-updates-beta-channel-label').text()).toBe('Receive beta updates');
      expect(wrapper.text()).toContain(
        'Get early builds before they are released to everyone. Turning this off keeps your current version until a newer stable release is available.',
      );
      expect(wrapper.get('[data-testid="settings-updates-beta-channel-downloaded-hint"]').text()).toBe(
        'An update is downloaded. Install it or restart AutoByteus before changing the update channel.',
      );
      expect(wrapper.get('[data-testid="settings-updates-beta-badge"]').text()).toBe('Beta');
    });

    it('renders the zh-CN copy', async () => {
      await localizationRuntime.setPreference('zh-CN');
      appUpdateStoreMock.status = 'downloaded';
      appUpdateStoreMock.updateStaged = true;
      appUpdateStoreMock.currentVersionIsPrerelease = true;
      const wrapper = mountWithCatalog();

      expect(wrapper.get('#settings-updates-beta-channel-label').text()).toBe('接收 Beta 更新');
      expect(wrapper.text()).toContain('关闭后，将保持当前版本，直到有更新的稳定版可用。');
      expect(wrapper.get('[data-testid="settings-updates-beta-channel-downloaded-hint"]').text()).toContain('再更改更新渠道');
      expect(translate('settings.updates.store.channelSaveFailed')).toBe('无法保存更新渠道。该设置将在 AutoByteus 重启前生效。');
    });
  });
});
