import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RemoteNodePairingControls from '../RemoteNodePairingControls.vue';

const { remoteBrowserSharingStoreMock, translateMock } = vi.hoisted(() => ({
  remoteBrowserSharingStoreMock: {
    settings: {
      enabled: true,
      advertisedHost: 'host.docker.internal',
    },
    requiresRestart: false,
    busyNodeId: null as string | null,
    pairNode: vi.fn().mockResolvedValue(undefined),
    unpairNode: vi.fn().mockResolvedValue(undefined),
    pairingStateLabel: vi.fn((state?: string) => state ?? 'Unpaired'),
    pairingStateClass: vi.fn(() => 'bg-gray-100 text-gray-700'),
  },
  translateMock: vi.fn((key: string) => (
    {
      'settings.components.settings.NodeManager.remoteBrowserSharing.actions.pairing': '__translated_pairing_action__',
      'settings.components.settings.NodeManager.remoteBrowserSharing.actions.pair': '__translated_pair_action__',
      'settings.components.settings.NodeManager.remoteBrowserSharing.actions.unpair': '__translated_unpair_action__',
    }[key] ?? key
  )),
}));

vi.mock('~/stores/remoteBrowserSharingStore', () => ({
  useRemoteBrowserSharingStore: () => remoteBrowserSharingStoreMock,
}));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: translateMock,
  }),
}));

describe('RemoteNodePairingControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    remoteBrowserSharingStoreMock.busyNodeId = null;
    remoteBrowserSharingStoreMock.requiresRestart = false;
    remoteBrowserSharingStoreMock.settings.enabled = true;
  });

  it('renders pair controls for an unpaired remote node', async () => {
    const wrapper = mount(RemoteNodePairingControls, {
      props: {
        node: {
          id: 'remote-1',
          name: 'Remote Node',
          baseUrl: 'http://node-a:8000',
          nodeType: 'remote',
          isSystem: false,
          createdAt: '2026-04-10T09:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
        },
      },
    });

    expect(wrapper.text()).toContain('__translated_pair_action__');
    await wrapper.get('[data-testid="pair-node-remote-1"]').trigger('click');

    expect(remoteBrowserSharingStoreMock.pairNode).toHaveBeenCalledWith('remote-1');
  });

  it('renders unpair controls for a paired remote node', async () => {
    const wrapper = mount(RemoteNodePairingControls, {
      props: {
        node: {
          id: 'remote-1',
          name: 'Remote Node',
          baseUrl: 'http://node-a:8000',
          nodeType: 'remote',
          isSystem: false,
          createdAt: '2026-04-10T09:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
          browserPairing: {
            state: 'paired',
            advertisedBaseUrl: 'http://host.docker.internal:30123',
            expiresAt: '2026-04-10T10:20:30.000Z',
            updatedAt: '2026-04-10T09:20:30.000Z',
            errorMessage: null,
          },
        },
      },
    });

    expect(wrapper.text()).toContain('__translated_unpair_action__');
    await wrapper.get('[data-testid="unpair-node-remote-1"]').trigger('click');

    expect(remoteBrowserSharingStoreMock.unpairNode).toHaveBeenCalledWith('remote-1');
  });
});
