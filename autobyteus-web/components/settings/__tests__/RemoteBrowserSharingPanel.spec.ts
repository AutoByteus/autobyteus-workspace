import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RemoteBrowserSharingPanel from '../RemoteBrowserSharingPanel.vue';

const { remoteBrowserSharingStoreMock, translateMock } = vi.hoisted(() => {
  const translations: Record<string, string> = {
    'settings.components.settings.NodeManager.remoteBrowserSharing.title': '__translated_remote_browser_sharing_title__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.description': '__translated_remote_browser_sharing_description__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.toggleLabel': '__translated_remote_browser_sharing_toggle__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.advertisedHostLabel': '__translated_remote_browser_sharing_host_label__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.advertisedHostPlaceholder': '__translated_remote_browser_sharing_host_placeholder__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.save': '__translated_remote_browser_sharing_save__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.restartRequired': '__translated_remote_browser_sharing_restart__',
  };

  return {
    remoteBrowserSharingStoreMock: {
      settings: {
        enabled: false,
        advertisedHost: '',
      },
      requiresRestart: false,
      error: null as string | null,
      info: null as string | null,
      busyNodeId: null as string | null,
      saveSettings: vi.fn().mockResolvedValue(undefined),
    },
    translateMock: vi.fn((key: string) => translations[key] ?? key),
  };
});

vi.mock('~/stores/remoteBrowserSharingStore', () => ({
  useRemoteBrowserSharingStore: () => remoteBrowserSharingStoreMock,
}));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: translateMock,
  }),
}));

describe('RemoteBrowserSharingPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    remoteBrowserSharingStoreMock.settings.enabled = false;
    remoteBrowserSharingStoreMock.settings.advertisedHost = '';
    remoteBrowserSharingStoreMock.requiresRestart = false;
    remoteBrowserSharingStoreMock.error = null;
    remoteBrowserSharingStoreMock.info = null;
    remoteBrowserSharingStoreMock.busyNodeId = null;
  });

  it('renders settings fields and saves through the store', async () => {
    const wrapper = mount(RemoteBrowserSharingPanel);

    expect(wrapper.text()).toContain('__translated_remote_browser_sharing_title__');
    expect(wrapper.text()).toContain('__translated_remote_browser_sharing_save__');
    expect(wrapper.get('[data-testid="remote-browser-sharing-host"]').attributes('placeholder')).toBe(
      '__translated_remote_browser_sharing_host_placeholder__',
    );

    await wrapper.get('[data-testid="remote-browser-sharing-toggle"]').setValue(true);
    await wrapper.get('[data-testid="remote-browser-sharing-host"]').setValue('host.docker.internal');
    await wrapper.get('[data-testid="remote-browser-sharing-save"]').trigger('click');

    expect(remoteBrowserSharingStoreMock.settings.enabled).toBe(true);
    expect(remoteBrowserSharingStoreMock.settings.advertisedHost).toBe('host.docker.internal');
    expect(remoteBrowserSharingStoreMock.saveSettings).toHaveBeenCalledTimes(1);
  });
});
