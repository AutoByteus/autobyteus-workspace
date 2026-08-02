import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventMonitorFilePreview } from '../useEventMonitorFilePreview';

const {
  fileExplorerStoreMock,
  mobileWorkStoreMock,
  windowNodeContextStoreMock,
  workspaceStoreMock,
  mapAbsolutePathToWorkspaceRelativeMock,
  hasTrustedElectronLocalFileCapabilityMock,
  isMobileRemoteAccessRuntimeMock,
  openRightPanelMock,
  setActiveTabMock,
} = vi.hoisted(() => ({
  fileExplorerStoreMock: { openFilePreview: vi.fn() },
  mobileWorkStoreMock: { currentContext: null, requestFilePreview: vi.fn() },
  windowNodeContextStoreMock: { isEmbeddedWindow: false },
  workspaceStoreMock: {
    activeWorkspaceMetadata: {
      workspaceId: 'workspace-1',
      workspaceRootPath: '/Users/normy/project',
    },
    activeWorkspace: {
      workspaceId: 'workspace-1',
      absolutePath: '/Users/normy/project',
    },
    resolveWorkspaceMetadataByRootPath: vi.fn(),
  },
  mapAbsolutePathToWorkspaceRelativeMock: vi.fn(),
  hasTrustedElectronLocalFileCapabilityMock: vi.fn(),
  isMobileRemoteAccessRuntimeMock: vi.fn(),
  openRightPanelMock: vi.fn(),
  setActiveTabMock: vi.fn(),
}));

vi.mock('~/stores/fileExplorer', () => ({
  useFileExplorerStore: () => fileExplorerStoreMock,
}));

vi.mock('~/stores/mobileWorkStore', () => ({
  useMobileWorkStore: () => mobileWorkStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

vi.mock('~/utils/fileExplorer/absoluteWorkspacePathMapping', () => ({
  mapAbsolutePathToWorkspaceRelative: mapAbsolutePathToWorkspaceRelativeMock,
}));

vi.mock('~/utils/fileExplorer/localFileCapability', () => ({
  hasTrustedElectronLocalFileCapability: hasTrustedElectronLocalFileCapabilityMock,
}));

vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({
  isMobileRemoteAccessRuntime: isMobileRemoteAccessRuntimeMock,
}));

vi.mock('~/composables/useLocalization', () => ({
  useLocalization: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('~/composables/useRightPanel', () => ({
  useRightPanel: () => ({ openRightPanel: openRightPanelMock }),
}));

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => ({ setActiveTab: setActiveTabMock }),
}));

describe('useEventMonitorFilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mobileWorkStoreMock.currentContext = null;
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    isMobileRemoteAccessRuntimeMock.mockReturnValue(false);
    hasTrustedElectronLocalFileCapabilityMock.mockReturnValue(false);
    mapAbsolutePathToWorkspaceRelativeMock.mockReturnValue({
      workspaceId: 'workspace-1',
      relativePath: 'assets/diagram.svg',
    });
    fileExplorerStoreMock.openFilePreview.mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('opens an SVG preview read-only, activates Files, and focuses the active file tab', async () => {
    const activeFileTab = document.createElement('button');
    activeFileTab.dataset.eventMonitorActiveFileTab = 'true';
    document.body.appendChild(activeFileTab);

    const { openPath } = useEventMonitorFilePreview();
    const result = await openPath({
      id: 'svg-action',
      rawCandidate: '/Users/normy/project/assets/diagram.svg',
      normalizedCandidate: '/Users/normy/project/assets/diagram.svg',
      sourceKind: 'prose',
      displayLabel: 'diagram.svg',
      previewType: 'Image',
    });

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result).toEqual({ status: 'opened', path: 'assets/diagram.svg' });
    expect(fileExplorerStoreMock.openFilePreview).toHaveBeenCalledWith(
      'assets/diagram.svg',
      'workspace-1',
      { accessIntent: { source: 'event-monitor', readOnly: true } },
    );
    expect(openRightPanelMock).toHaveBeenCalledOnce();
    expect(setActiveTabMock).toHaveBeenCalledWith('files');
    expect(document.activeElement).toBe(activeFileTab);
  });
});
