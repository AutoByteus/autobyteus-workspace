import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
// Only build-mode detection and external Apollo are doubled; mapper, mobile request
// owner, selected workspace and launcher are production implementations.
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => true }));
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }));
const io = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
import { useEventMonitorFilePreview } from '../useEventMonitorFilePreview';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useFileExplorerStore } from '~/stores/fileExplorer';
const previousBridge = window.electronAPI;
const bridge = vi.fn();
const action = (path: string) => ({ id: path, rawCandidate: path, normalizedCandidate: path,
  sourceKind: 'prose' as const, displayLabel: path, previewType: 'Text' as const });
beforeEach(() => { setActivePinia(createPinia()); io.query.mockReset(); bridge.mockReset(); window.electronAPI = { ...previousBridge, readLocalTextFile: bridge }; });
afterEach(() => { window.electronAPI = previousBridge; });

describe('actual mobile selected-root containment with null desktop provider', () => {
  for (const path of ['/owned/B/brief.md', '/owned/A/private.md', '/owned/B-prefix/private.md', '/owned/B/../private.md']) {
    it(`maps only an actual contained candidate: ${path}`, async () => {
      const mobile = useMobileWorkStore(); mobile.selectContext({ kind: 'workspace', workspaceId: 'B', title: 'B', rootPath: '/owned/B' });
      const open = vi.spyOn(useFileExplorerStore(), 'openFilePreview');
      const result = await useEventMonitorFilePreview({ revealTool: null, isOriginCurrent: () => true }).openPath(action(path));
      expect(result.status).toBe(path === '/owned/B/brief.md' ? 'opened' : 'unavailable');
      expect(open).not.toHaveBeenCalled(); expect(bridge).not.toHaveBeenCalled(); expect(io.query).not.toHaveBeenCalled();
      if (result.status === 'opened') expect(mobile.pendingFilePreviewRequest).toMatchObject({
        contextKey: 'workspace:B', workspaceId: 'B', relativePath: 'brief.md', source: 'event-monitor', readOnly: true, presentation: 'inline',
      });
      else expect(mobile.pendingFilePreviewRequest).toBeNull();
    });
  }
  it('uses actual root metadata ownership for a mobile run and rejects obsolete origin after await', async () => {
    const mobile = useMobileWorkStore();
    mobile.selectContext({ kind: 'agent-run', runId: 'member-B', agentDefinitionId: 'member-definition', title: 'B', summary: '',
      workspaceRootPath: '/owned/B', isActive: true, lastActivityAt: '2026-10-06T18:00:00.000Z', statusLabel: 'idle' });
    let settle!: (value: any) => void, current = true;
    io.query.mockReturnValue(new Promise(resolve => { settle = resolve; }));
    const pending = useEventMonitorFilePreview({ revealTool: null, isOriginCurrent: () => current }).openPath(action('/owned/B/brief.md'));
    current = false;
    settle({ data: { workspaceMetadata: { workspaceId: 'B', workspaceRootPath: '/owned/B', displayName: 'B', kind: 'filesystem' } } });
    expect((await pending).status).toBe('failed');
    expect(io.query.mock.calls[0][0].variables).toEqual({ rootPath: '/owned/B' });
    expect(useWorkspaceStore().workspaceMetadataById.B?.workspaceRootPath).toBe('/owned/B');
    expect(mobile.pendingFilePreviewRequest).toBeNull(); expect(bridge).not.toHaveBeenCalled();
  });
});
