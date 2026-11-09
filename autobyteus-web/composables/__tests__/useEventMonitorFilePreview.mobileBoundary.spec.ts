import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
// Build-mode detection, external Apollo and the open target are doubled, and the phone's navigation is passed as a double;
// the path mapper, the workspace store and the launcher are production implementations.
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: () => true }));
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key }) }));
const io = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
const phone = vi.hoisted(() => ({ target: null as unknown, openFile: vi.fn(async () => undefined), openNodeFile: vi.fn(async () => undefined), remoteRunIds: new Set<string>() }));
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => ({ get activeWorkspaceTarget() { return phone.target; } }) }));
vi.mock('~/stores/remoteRunsStore', () => ({ useRemoteRunsStore: () => ({ runOfAgentRun: (id: string) => (phone.remoteRunIds.has(id) ? { nodeName: 'peer' } : null) }) }));
import { useEventMonitorFilePreview } from '../useEventMonitorFilePreview';
import { useWorkspaceStore } from '~/stores/workspace';
import { useFileExplorerStore } from '~/stores/fileExplorer';

const previousBridge = window.electronAPI;
const bridge = vi.fn();
const action = (path: string) => ({ id: path, rawCandidate: path, normalizedCandidate: path,
  sourceKind: 'prose' as const, displayLabel: path, previewType: 'Text' as const });
const metadataB = { data: { workspaceMetadata: { workspaceId: 'B', workspaceRootPath: '/owned/B', displayName: 'B', kind: 'filesystem' } } };
const opener = (isOriginCurrent: () => boolean = () => true) =>
  useEventMonitorFilePreview({ revealTool: null, mobileNavigation: { openFile: phone.openFile, openNodeFile: phone.openNodeFile }, isOriginCurrent });
const targetIn = (workspaceRootPath: string | null) => ({ context: { state: { runId: 'member-B' }, config: {} }, workspaceRootPath });

beforeEach(() => {
  setActivePinia(createPinia()); io.query.mockReset(); bridge.mockReset(); phone.openFile.mockClear(); phone.openNodeFile.mockClear(); phone.remoteRunIds.clear();
  phone.target = targetIn('/owned/B');
  window.electronAPI = { ...previousBridge, readLocalTextFile: bridge };
});
afterEach(() => { window.electronAPI = previousBridge; });

describe('the phone: a conversation file link opens in the open agent\'s folder, or by its absolute path (autobyteus-277 DS-008, autobyteus-436)', () => {
  for (const path of ['/owned/B/brief.md', '/owned/A/private.md', '/owned/B-prefix/private.md', '/owned/B/../private.md']) {
    it(`maps only an actual contained candidate: ${path}`, async () => {
      io.query.mockResolvedValue(metadataB);
      const open = vi.spyOn(useFileExplorerStore(), 'openFilePreview');
      const result = await opener().openPath(action(path));
      expect(result.status).toBe('opened');
      expect(open).not.toHaveBeenCalled(); expect(bridge).not.toHaveBeenCalled();
      if (path === '/owned/B/brief.md') {
        expect(phone.openFile).toHaveBeenCalledExactlyOnceWith({ workspaceId: 'B', path: 'brief.md' });
        expect(phone.openNodeFile).not.toHaveBeenCalled();
      } else {
        // Outside the folder: a node file, read by the node's own rules (an absolute path without '..', a real file).
        expect(phone.openNodeFile).toHaveBeenCalledExactlyOnceWith({ path });
        expect(phone.openFile).not.toHaveBeenCalled();
      }
    });
  }

  it('a run another node runs keeps today\'s answer: its paths are that node\'s', async () => {
    phone.target = targetIn(null);
    phone.remoteRunIds.add('member-B');
    const result = await opener().openPath(action('/owned/B/brief.md'));
    expect(result.status).toBe('unavailable');
    expect(io.query).not.toHaveBeenCalled(); expect(phone.openFile).not.toHaveBeenCalled(); expect(phone.openNodeFile).not.toHaveBeenCalled();
  });

  it('a target without a folder on this node opens the path as a node file', async () => {
    phone.target = targetIn(null);
    expect((await opener().openPath(action('/elsewhere/notes.md'))).status).toBe('opened');
    expect(io.query).not.toHaveBeenCalled();
    expect(phone.openNodeFile).toHaveBeenCalledExactlyOnceWith({ path: '/elsewhere/notes.md' });
  });

  it('without the phone navigation nothing opens (R-2)', async () => {
    const result = await useEventMonitorFilePreview({ revealTool: null, mobileNavigation: null, isOriginCurrent: () => true }).openPath(action('/elsewhere/notes.md'));
    expect(result.status).toBe('unavailable');
    expect(phone.openNodeFile).not.toHaveBeenCalled();
  });

  it('rejects an obsolete origin after the folder lookup before opening a node file', async () => {
    let settle!: (value: unknown) => void, current = true;
    io.query.mockReturnValue(new Promise(resolve => { settle = resolve; }));
    const pending = opener(() => current).openPath(action('/elsewhere/notes.md'));
    current = false;
    settle(metadataB);
    expect((await pending).status).toBe('failed');
    expect(phone.openNodeFile).not.toHaveBeenCalled();
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
