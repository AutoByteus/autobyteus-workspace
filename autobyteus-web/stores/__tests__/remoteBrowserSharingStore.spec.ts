import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useRemoteBrowserSharingStore } from '../remoteBrowserSharingStore';

const {
  nodeStoreMock,
  toolManagementStoreMock,
  agentDefinitionOptionsStoreMock,
  registerRemoteBrowserBridgeMock,
  clearRemoteBrowserBridgeMock,
  translateMock,
} = vi.hoisted(() => {
  const nodes = [
    {
      id: 'embedded-local',
      name: 'Embedded Node',
      baseUrl: 'http://127.0.0.1:29695',
      nodeType: 'embedded',
      isSystem: true,
      createdAt: '2026-04-10T09:00:00.000Z',
      updatedAt: '2026-04-10T09:00:00.000Z',
    },
    {
      id: 'remote-1',
      name: 'Remote Node',
      baseUrl: 'http://node-a:8000',
      nodeType: 'remote',
      isSystem: false,
      createdAt: '2026-04-10T09:00:00.000Z',
      updatedAt: '2026-04-10T09:00:00.000Z',
      browserPairing: undefined,
    },
  ];

  const translations: Record<string, string> = {
    'settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.pairing': '__translated_pairing_state_pairing__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.paired': '__translated_pairing_state_paired__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.revoked': '__translated_pairing_state_revoked__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.expired': '__translated_pairing_state_expired__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.rejected': '__translated_pairing_state_rejected__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.pairingState.unpaired': '__translated_pairing_state_unpaired__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.errors.electronOnly': '__translated_electron_only__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.errors.pairingElectronOnly': '__translated_pairing_electron_only__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.info.settingsSavedNeedsRestart': '__translated_settings_saved_needs_restart__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.info.settingsSaved': '__translated_settings_saved__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.info.paired': '__translated_paired_{{name}}__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.info.revokedRemoteCleanupUnconfirmed': '__translated_revoked_cleanup_{{name}}_{{error}}__',
    'settings.components.settings.NodeManager.remoteBrowserSharing.info.revoked': '__translated_revoked_{{name}}__',
  };

  const translateMock = vi.fn((key: string, params?: Record<string, string | number>) => {
    let message = translations[key] ?? key;
    if (!params) {
      return message;
    }
    for (const [paramKey, value] of Object.entries(params)) {
      message = message.replaceAll(`{{${paramKey}}}`, String(value));
    }
    return message;
  });

  return {
    nodeStoreMock: {
      nodes,
      getNodeById: vi.fn((nodeId: string) => nodes.find((node) => node.id === nodeId) ?? null),
    },
    toolManagementStoreMock: {
      fetchLocalToolsGroupedByCategory: vi.fn().mockResolvedValue(undefined),
    },
    agentDefinitionOptionsStoreMock: {
      fetchAllAvailableOptions: vi.fn().mockResolvedValue(undefined),
    },
    registerRemoteBrowserBridgeMock: vi.fn().mockResolvedValue(undefined),
    clearRemoteBrowserBridgeMock: vi.fn().mockResolvedValue(undefined),
    translateMock,
  };
});

vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => nodeStoreMock,
}));

vi.mock('~/stores/toolManagementStore', () => ({
  useToolManagementStore: () => toolManagementStoreMock,
}));

vi.mock('~/stores/agentDefinitionOptionsStore', () => ({
  useAgentDefinitionOptionsStore: () => agentDefinitionOptionsStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({
    nodeId: 'remote-1',
    isEmbeddedWindow: false,
  }),
}));

vi.mock('~/utils/nodeRemoteBrowserPairingClient', () => ({
  registerRemoteBrowserBridge: registerRemoteBrowserBridgeMock,
  clearRemoteBrowserBridge: clearRemoteBrowserBridgeMock,
}));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: translateMock,
  }),
}));

describe('remoteBrowserSharingStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    nodeStoreMock.nodes[1].browserPairing = {
      state: 'paired',
      advertisedBaseUrl: 'http://host.docker.internal:30123',
      expiresAt: '2026-04-10T10:20:30.000Z',
      updatedAt: '2026-04-10T09:20:30.000Z',
      errorMessage: null,
    };

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      writable: true,
      value: {
        getRemoteBrowserSharingSettings: vi.fn().mockResolvedValue({
          enabled: false,
          advertisedHost: '',
        }),
        updateRemoteBrowserSharingSettings: vi.fn().mockResolvedValue({
          settings: {
            enabled: true,
            advertisedHost: 'host.docker.internal',
          },
          requiresRestart: true,
        }),
        issueRemoteBrowserBridgeDescriptor: vi.fn().mockResolvedValue({
          baseUrl: 'http://host.docker.internal:30123',
          authToken: 'browser-token',
          expiresAt: '2026-04-10T10:20:30.000Z',
        }),
        confirmRemoteBrowserBridgeDescriptor: vi.fn().mockResolvedValue({ ok: true }),
        revokeRemoteBrowserBridgeDescriptor: vi.fn().mockResolvedValue({ ok: true }),
      },
    });
  });

  it('loads and saves remote browser sharing settings through Electron IPC', async () => {
    const store = useRemoteBrowserSharingStore();

    await store.initialize();
    store.settings.enabled = true;
    store.settings.advertisedHost = 'host.docker.internal';
    await store.saveSettings();

    expect(window.electronAPI.getRemoteBrowserSharingSettings).toHaveBeenCalledTimes(1);
    expect(window.electronAPI.updateRemoteBrowserSharingSettings).toHaveBeenCalledWith({
      enabled: true,
      advertisedHost: 'host.docker.internal',
    });
    expect(store.requiresRestart).toBe(true);
    expect(store.info).toBe('__translated_settings_saved_needs_restart__');
  });

  it('pairs a remote node and refreshes current-node tool options', async () => {
    const store = useRemoteBrowserSharingStore();

    await store.pairNode('remote-1');

    expect(window.electronAPI.issueRemoteBrowserBridgeDescriptor).toHaveBeenCalledWith('remote-1');
    expect(registerRemoteBrowserBridgeMock).toHaveBeenCalledWith('http://node-a:8000', {
      baseUrl: 'http://host.docker.internal:30123',
      authToken: 'browser-token',
      expiresAt: '2026-04-10T10:20:30.000Z',
    });
    expect(window.electronAPI.confirmRemoteBrowserBridgeDescriptor).toHaveBeenCalledWith('remote-1');
    expect(toolManagementStoreMock.fetchLocalToolsGroupedByCategory).toHaveBeenCalledTimes(1);
    expect(agentDefinitionOptionsStoreMock.fetchAllAvailableOptions).toHaveBeenCalledTimes(1);
    expect(store.info).toBe('__translated_paired_Remote Node__');
    expect(store.pairingStateLabel('paired')).toBe('__translated_pairing_state_paired__');
  });

  it('unpairs a remote node and revokes the local descriptor', async () => {
    const store = useRemoteBrowserSharingStore();

    await store.unpairNode('remote-1');

    expect(clearRemoteBrowserBridgeMock).toHaveBeenCalledWith('http://node-a:8000');
    expect(window.electronAPI.revokeRemoteBrowserBridgeDescriptor).toHaveBeenCalledWith(
      'remote-1',
      'revoked',
      null,
    );
    expect(store.info).toBe('__translated_revoked_Remote Node__');
  });

  it('best-effort clears remote browser binding before node removal', async () => {
    const store = useRemoteBrowserSharingStore();

    const remoteClearError = await store.prepareNodeRemoval('remote-1');

    expect(clearRemoteBrowserBridgeMock).toHaveBeenCalledWith('http://node-a:8000');
    expect(remoteClearError).toBeNull();
  });

  it('revokes the local descriptor and refreshes current-node capabilities', async () => {
    const store = useRemoteBrowserSharingStore();

    await store.revokeLocalPairing('remote-1', 'revoked', 'cleanup mismatch');

    expect(window.electronAPI.revokeRemoteBrowserBridgeDescriptor).toHaveBeenCalledWith(
      'remote-1',
      'revoked',
      'cleanup mismatch',
    );
    expect(toolManagementStoreMock.fetchLocalToolsGroupedByCategory).toHaveBeenCalledTimes(1);
    expect(agentDefinitionOptionsStoreMock.fetchAllAvailableOptions).toHaveBeenCalledTimes(1);
  });
});
