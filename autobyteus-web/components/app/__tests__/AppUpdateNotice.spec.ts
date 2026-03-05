import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import AppUpdateNotice from '../AppUpdateNotice.vue';

const { appUpdateStoreMock } = vi.hoisted(() => {
  const store = {
    shouldShow: true,
    status: 'available',
    message: 'Version 1.2.0 is available.',
    currentVersion: '1.1.9',
    availableVersion: '1.2.0',
    progressLabel: '0%',
    downloadPercent: null as number | null,
    releaseNotes: null as string | null,
    dismissNotice: vi.fn(),
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

describe('AppUpdateNotice', () => {
  beforeEach(() => {
    appUpdateStoreMock.shouldShow = true;
    appUpdateStoreMock.status = 'available';
    appUpdateStoreMock.message = 'Version 1.2.0 is available.';
    appUpdateStoreMock.currentVersion = '1.1.9';
    appUpdateStoreMock.availableVersion = '1.2.0';
    appUpdateStoreMock.progressLabel = '0%';
    appUpdateStoreMock.downloadPercent = null;
    appUpdateStoreMock.releaseNotes = null;
    appUpdateStoreMock.dismissNotice.mockClear();
    appUpdateStoreMock.checkForUpdates.mockClear();
    appUpdateStoreMock.downloadUpdate.mockClear();
    appUpdateStoreMock.installUpdateAndRestart.mockClear();
  });

  it('renders available state with download CTA', async () => {
    const wrapper = mount(AppUpdateNotice);

    expect(wrapper.find('[data-testid="app-update-notice"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="app-update-message"]').text()).toContain('Version 1.2.0 is available.');
    expect(wrapper.find('[data-testid="app-update-version"]').text()).toContain('Current 1.1.9 → New 1.2.0');

    await wrapper.get('[data-testid="app-update-download"]').trigger('click');
    expect(appUpdateStoreMock.downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it('renders download progress state', () => {
    appUpdateStoreMock.status = 'downloading';
    appUpdateStoreMock.downloadPercent = 42;
    appUpdateStoreMock.progressLabel = '42%';

    const wrapper = mount(AppUpdateNotice);

    expect(wrapper.find('[data-testid="app-update-progress"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('42%');
  });

  it('renders install CTA when update is downloaded', async () => {
    appUpdateStoreMock.status = 'downloaded';
    appUpdateStoreMock.message = 'Update downloaded. Restart to install.';

    const wrapper = mount(AppUpdateNotice);

    const installButton = wrapper.get('[data-testid="app-update-install"]');
    await installButton.trigger('click');

    expect(appUpdateStoreMock.installUpdateAndRestart).toHaveBeenCalledTimes(1);
  });

  it('renders installing state with disabled restart affordance', () => {
    appUpdateStoreMock.status = 'installing';
    appUpdateStoreMock.message = 'Installing update and restarting...';

    const wrapper = mount(AppUpdateNotice);

    expect(wrapper.find('[data-testid="app-update-installing-indicator"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="app-update-installing"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="app-update-install"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="app-update-dismiss"]').exists()).toBe(false);
  });

  it('hides when shouldShow is false', () => {
    appUpdateStoreMock.shouldShow = false;

    const wrapper = mount(AppUpdateNotice);
    expect(wrapper.find('[data-testid="app-update-notice"]').exists()).toBe(false);
  });

  it('dismisses notice from close button', async () => {
    const wrapper = mount(AppUpdateNotice);

    await wrapper.get('[data-testid="app-update-dismiss"]').trigger('click');
    expect(appUpdateStoreMock.dismissNotice).toHaveBeenCalledTimes(1);
  });
});
