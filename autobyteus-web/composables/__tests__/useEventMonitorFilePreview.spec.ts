import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventMonitorFilePreview } from '../useEventMonitorFilePreview';

const {
  activeContextStoreMock,
  fileExplorerStoreMock,
  mobileWorkStoreMock,
  windowNodeContextStoreMock,
  workspaceStoreMock,
  mapAbsolutePathToWorkspaceRelativeMock,
  hasTrustedElectronLocalFileCapabilityMock,
  isMobileRemoteAccessRuntimeMock,
  revealToolMock,
} = vi.hoisted(() => ({
  activeContextStoreMock: { activeWorkspaceTarget: null as any, resolveWorkspaceMetadataForTarget: vi.fn() },
  fileExplorerStoreMock: { openFilePreview: vi.fn() },
  mobileWorkStoreMock: { currentContext: null as any, requestFilePreview: vi.fn() },
  windowNodeContextStoreMock: { isEmbeddedWindow: false, bindingRevision: 0 },
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
  revealToolMock: vi.fn(),
}));

vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => activeContextStoreMock }));

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

const options = () => ({ revealTool: revealToolMock, isOriginCurrent: () => true });

describe('useEventMonitorFilePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revealToolMock.mockReset().mockResolvedValue(true);
    activeContextStoreMock.activeWorkspaceTarget = null;
    activeContextStoreMock.resolveWorkspaceMetadataForTarget.mockReset();
    windowNodeContextStoreMock.bindingRevision = 0;
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

    const { openPath } = useEventMonitorFilePreview(options());
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
    expect(revealToolMock).toHaveBeenCalledOnce();
    expect(revealToolMock).toHaveBeenCalledWith('files');
    expect(document.activeElement).toBe(activeFileTab);
  });
});

const action = {
  id: 'markdown', rawCandidate: '/owned/B/brief.md', normalizedCandidate: '/owned/B/brief.md',
  sourceKind: 'prose' as const, displayLabel: 'brief.md', previewType: 'Text' as const,
};
const selected = (id: string | null = 'B', root: string | null = '/owned/B') => ({
  kind: 'standalone_team_member', workspaceRootPath: root,
  context: { state: { runId: 'member-B' }, config: { workspaceId: id, workspaceMetadata: null } },
});

describe('selected execution preview identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revealToolMock.mockReset().mockResolvedValue(true);
    activeContextStoreMock.activeWorkspaceTarget = selected();
    activeContextStoreMock.resolveWorkspaceMetadataForTarget.mockReset();
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    windowNodeContextStoreMock.bindingRevision = 0;
    hasTrustedElectronLocalFileCapabilityMock.mockReturnValue(true);
    isMobileRemoteAccessRuntimeMock.mockReturnValue(false);
    mapAbsolutePathToWorkspaceRelativeMock.mockReturnValue(null);
    fileExplorerStoreMock.openFilePreview.mockResolvedValue(undefined);
  });

  it('opens known selected ID without metadata, query or unrelated global A', async () => {
    expect(await useEventMonitorFilePreview(options()).openPath(action)).toEqual({ status: 'opened', path: action.normalizedCandidate });
    expect(activeContextStoreMock.resolveWorkspaceMetadataForTarget).not.toHaveBeenCalled();
    expect(fileExplorerStoreMock.openFilePreview).toHaveBeenCalledWith(action.normalizedCandidate, 'B', {
      accessIntent: { source: 'event-monitor', readOnly: true },
    });
  });

  it('recovers a missing ID through the exact target boundary', async () => {
    const target = selected(null);
    activeContextStoreMock.activeWorkspaceTarget = target;
    const metadata = { workspaceId: 'B', workspaceRootPath: '/owned/B' };
    activeContextStoreMock.resolveWorkspaceMetadataForTarget.mockImplementation(async captured => {
      expect(captured).toBe(target);
      captured.context.config.workspaceId = 'B';
      activeContextStoreMock.activeWorkspaceTarget = { ...captured }; // Computed wrapper can change.
      return metadata;
    });
    expect((await useEventMonitorFilePreview(options()).openPath(action)).status).toBe('opened');
    expect(fileExplorerStoreMock.openFilePreview.mock.calls[0]?.[1]).toBe('B');
  });

  for (const change of ['selection', 'root', 'node'] as const) {
    it(`does not open/publish after ${change} changes during recovery`, async () => {
      activeContextStoreMock.activeWorkspaceTarget = selected(null);
      activeContextStoreMock.resolveWorkspaceMetadataForTarget.mockImplementation(async target => {
        if (change === 'selection') activeContextStoreMock.activeWorkspaceTarget = selected('C');
        if (change === 'root') activeContextStoreMock.activeWorkspaceTarget = { ...target, workspaceRootPath: '/owned/C' };
        if (change === 'node') windowNodeContextStoreMock.bindingRevision++;
        return { workspaceId: 'B', workspaceRootPath: '/owned/B' };
      });
      expect((await useEventMonitorFilePreview(options()).openPath(action)).status).toBe('failed');
      expect(fileExplorerStoreMock.openFilePreview).not.toHaveBeenCalled();
      expect(revealToolMock).not.toHaveBeenCalled();
    });
  }

  it('does not switch/focus the new selection after content loading', async () => {
    fileExplorerStoreMock.openFilePreview.mockImplementation(async () => {
      activeContextStoreMock.activeWorkspaceTarget = selected('C');
    });
    expect((await useEventMonitorFilePreview(options()).openPath(action)).status).toBe('failed');
    expect(revealToolMock).not.toHaveBeenCalled();
  });

  it('reports failed recovery as ordinary preview failure, not host-only refusal', async () => {
    activeContextStoreMock.activeWorkspaceTarget = selected(null, null);
    activeContextStoreMock.resolveWorkspaceMetadataForTarget.mockResolvedValue(null);
    expect(await useEventMonitorFilePreview(options()).openPath(action)).toMatchObject({ status: 'failed', message: expect.stringContaining('file_preview_failed') });
    expect(fileExplorerStoreMock.openFilePreview).not.toHaveBeenCalled();
  });

  for (const runtime of ['remote-electron', 'embedded-no-bridge'] as const) {
    it(`refuses outside-workspace in ${runtime} without native fallback`, async () => {
      windowNodeContextStoreMock.isEmbeddedWindow = runtime !== 'remote-electron';
      hasTrustedElectronLocalFileCapabilityMock.mockReturnValue(runtime !== 'embedded-no-bridge');
      expect((await useEventMonitorFilePreview(options()).openPath(action)).status).toBe('unavailable');
      expect(fileExplorerStoreMock.openFilePreview).not.toHaveBeenCalled();
    });
  }

  it('maps selected source root in a remote window without metadata', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow = false;
    mapAbsolutePathToWorkspaceRelativeMock.mockReturnValue({ workspaceId: 'B', relativePath: 'brief.md' });
    expect(await useEventMonitorFilePreview(options()).openPath(action)).toEqual({ status: 'opened', path: 'brief.md' });
    expect(mapAbsolutePathToWorkspaceRelativeMock).toHaveBeenCalledWith(action.normalizedCandidate, { workspaceId: 'B', workspaceRootPath: '/owned/B' });
    expect(hasTrustedElectronLocalFileCapabilityMock).not.toHaveBeenCalled();
  });
});


describe('preserved mobile containment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revealToolMock.mockReset().mockResolvedValue(true);
    isMobileRemoteAccessRuntimeMock.mockReturnValue(true);
    mobileWorkStoreMock.currentContext = { kind: 'workspace', workspaceId: 'B', rootPath: '/owned/B' };
  });
  for (const inside of [true, false]) {
    it(`uses only mapped workspace content on mobile; inside: ${inside}`, async () => {
      mapAbsolutePathToWorkspaceRelativeMock.mockReturnValue(inside ? { workspaceId: 'B', relativePath: 'brief.md' } : null);
      expect((await useEventMonitorFilePreview({ ...options(), revealTool: null }).openPath(action)).status).toBe(inside ? 'opened' : 'unavailable');
      expect(fileExplorerStoreMock.openFilePreview).not.toHaveBeenCalled();
      expect(hasTrustedElectronLocalFileCapabilityMock).not.toHaveBeenCalled();
      if (inside) expect(mobileWorkStoreMock.requestFilePreview).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'B', relativePath: 'brief.md', readOnly: true }));
      else expect(mobileWorkStoreMock.requestFilePreview).not.toHaveBeenCalled();
    });
  }
});


describe('bounded reveal acceptance and focus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    revealToolMock.mockReset().mockResolvedValue(true);
    activeContextStoreMock.activeWorkspaceTarget = selected();
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    hasTrustedElectronLocalFileCapabilityMock.mockReturnValue(true);
    isMobileRemoteAccessRuntimeMock.mockReturnValue(false);
    fileExplorerStoreMock.openFilePreview.mockReset().mockResolvedValue(undefined);
  });
  it('fails without a desktop capability before recovery, bytes or UI', async () => {
    activeContextStoreMock.activeWorkspaceTarget = selected(null);
    expect((await useEventMonitorFilePreview({ ...options(), revealTool: null }).openPath(action)).status).toBe('failed');
    expect(activeContextStoreMock.resolveWorkspaceMetadataForTarget).not.toHaveBeenCalled();
    expect(fileExplorerStoreMock.openFilePreview).not.toHaveBeenCalled();
    expect(revealToolMock).not.toHaveBeenCalled();
  });
  it('reveals only after content settlement, including a stored file error', async () => {
    const order: string[] = [];
    fileExplorerStoreMock.openFilePreview.mockImplementation(async () => { order.push('stored-error'); });
    revealToolMock.mockImplementation(async () => { order.push('render-flush'); return true; });
    expect((await useEventMonitorFilePreview(options()).openPath(action)).status).toBe('opened');
    expect(order).toEqual(['stored-error', 'render-flush']);
  });
  for (const acceptance of ['disposed', 'superseded'] as const) {
    it(`does not report opened/focus after ${acceptance} reveal`, async () => {
      let current = true;
      revealToolMock.mockImplementation(async () => {
        if (acceptance === 'superseded') current = false;
        return acceptance !== 'disposed';
      });
      const button = document.createElement('button');
      button.dataset.eventMonitorActiveFileTab = 'true'; document.body.appendChild(button);
      const focus = vi.spyOn(button, 'focus');
      expect((await useEventMonitorFilePreview({ revealTool: revealToolMock, isOriginCurrent: () => current }).openPath(action)).status).toBe('failed');
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(focus).not.toHaveBeenCalled(); button.remove();
    });
  }
  it('guards origin while loading and before delayed focus', async () => {
    let current = true;
    const button = document.createElement('button');
    button.dataset.eventMonitorActiveFileTab = 'true'; document.body.appendChild(button);
    const focus = vi.spyOn(button, 'focus');
    const launch = useEventMonitorFilePreview({ revealTool: revealToolMock, isOriginCurrent: () => current });
    expect((await launch.openPath(action)).status).toBe('opened');
    current = false; await new Promise(resolve => setTimeout(resolve, 0));
    expect(focus).not.toHaveBeenCalled();
    current = true; revealToolMock.mockClear();
    fileExplorerStoreMock.openFilePreview.mockImplementation(async () => { current = false; });
    expect((await launch.openPath(action)).status).toBe('failed');
    expect(revealToolMock).not.toHaveBeenCalled(); button.remove();
  });
});


// Selection/navigation/node changes during real user awaits must not focus a replacement.
describe('selected identity across reveal and deferred focus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeContextStoreMock.activeWorkspaceTarget = selected();
    windowNodeContextStoreMock.bindingRevision = 0;
    windowNodeContextStoreMock.isEmbeddedWindow = true;
    isMobileRemoteAccessRuntimeMock.mockReturnValue(false);
    hasTrustedElectronLocalFileCapabilityMock.mockReturnValue(true);
    fileExplorerStoreMock.openFilePreview.mockReset().mockResolvedValue(undefined);
    revealToolMock.mockReset().mockResolvedValue(true);
  });
  afterEach(() => { document.body.innerHTML = ''; });
  for (const phase of ['reveal', 'deferred-focus'] as const) {
    for (const change of ['selection', 'source-root', 'node'] as const) {
      it(`rejects ${change} during ${phase}`, async () => {
        const origin = document.createElement('button');
        const replacement = document.createElement('button');
        replacement.dataset.eventMonitorActiveFileTab = 'true';
        document.body.append(origin, replacement); origin.focus();
        const focus = vi.spyOn(replacement, 'focus');
        const invalidate = () => {
          if (change === 'selection') activeContextStoreMock.activeWorkspaceTarget = selected('C');
          if (change === 'source-root') activeContextStoreMock.activeWorkspaceTarget.workspaceRootPath = '/owned/C';
          if (change === 'node') windowNodeContextStoreMock.bindingRevision++;
        };
        if (phase === 'reveal') revealToolMock.mockImplementation(async () => { invalidate(); return true; });
        const result = await useEventMonitorFilePreview(options()).openPath(action);
        expect(result.status).toBe(phase === 'reveal' ? 'failed' : 'opened');
        if (phase === 'deferred-focus') invalidate();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(focus).not.toHaveBeenCalled(); expect(document.activeElement).toBe(origin);
      });
    }
  }
});
