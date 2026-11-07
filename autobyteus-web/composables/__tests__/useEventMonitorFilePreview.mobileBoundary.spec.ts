import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
// Build-mode detection, external Apollo and the open target are doubled, and the phone's navigation is passed as a double;
// the path mapper, the workspace store and the launcher are production implementations.
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => true }));
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }));
const io = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
const phone = vi.hoisted(() => ({ target: null as unknown, openFile: vi.fn(async () => undefined) }));
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return phone.target; } }) }));
import { useEventMonitorFilePreview } from '../useEventMonitorFilePreview';
import { useWorkspaceStore } from '~/stores/workspace';
import { useFileExplorerStore } from '~/stores/fileExplorer';

const previousBridge = window.electronAPI;
const bridge = vi.fn();
const action = (path: string) => ({ id: path, rawCandidate: path, normalizedCandidate: path,
  sourceKind: 'prose' as const, displayLabel: path, previewType: 'Text' as const });
const metadataB = { data: { workspaceMetadata: { workspaceId: 'B', workspaceRootPath: '/owned/B', displayName: 'B', kind: 'filesystem' } } };
const opener = (isOriginCurrent: () => boolean = () => true) =>
  useEventMonitorFilePreview({ revealTool: null, mobileNavigation: { openFile: phone.openFile }, isOriginCurrent });
const targetIn = (workspaceRootPath: string | null) => ({ context: { state: { runId: 'member-B' }, config: {} }, workspaceRootPath });

beforeEach(() => {
  setActivePinia(createPinia()); io.query.mockReset(); bridge.mockReset(); phone.openFile.mockClear();
  phone.target = targetIn('/owned/B');
  window.electronAPI = { ...previousBridge, readLocalTextFile: bridge };
});
afterEach(() => { window.electronAPI = previousBridge; });

describe('the phone: a conversation file link opens in the open agent\'s folder (autobyteus-277 DS-008)', () => {
  for (const path of ['/owned/B/brief.md', '/owned/A/private.md', '/owned/B-prefix/private.md', '/owned/B/../private.md']) {
    it(`maps only an actual contained candidate: ${path}`, async () => {
      io.query.mockResolvedValue(metadataB);
      const open = vi.spyOn(useFileExplorerStore(), 'openFilePreview');
      const result = await opener().openPath(action(path));
      expect(result.status).toBe(path === '/owned/B/brief.md' ? 'opened' : 'unavailable');
      expect(open).not.toHaveBeenCalled(); expect(bridge).not.toHaveBeenCalled();
      if (result.status === 'opened') expect(phone.openFile).toHaveBeenCalledExactlyOnceWith({ workspaceId: 'B', path: 'brief.md' });
      else expect(phone.openFile).not.toHaveBeenCalled();
    });
  }

  it('a target without a folder on this node (a remote run) has no file to open here', async () => {
    phone.target = targetIn(null);
    const result = await opener().openPath(action('/owned/B/brief.md'));
    expect(result.status).toBe('unavailable');
    expect(io.query).not.toHaveBeenCalled(); expect(phone.openFile).not.toHaveBeenCalled();
  });

  it('resolves the folder by its root path and rejects an obsolete origin after the await', async () => {
    let settle!: (value: unknown) => void, current = true;
    io.query.mockReturnValue(new Promise(resolve => { settle = resolve; }));
    const pending = opener(() => current).openPath(action('/owned/B/brief.md'));
    current = false;
    settle(metadataB);
    expect((await pending).status).toBe('failed');
    expect(io.query.mock.calls[0][0].variables).toEqual({ rootPath: '/owned/B' });
    expect(useWorkspaceStore().workspaceMetadataById.B?.workspaceRootPath).toBe('/owned/B');
    expect(phone.openFile).not.toHaveBeenCalled(); expect(bridge).not.toHaveBeenCalled();
  });
});
