// autobyteus-609 D-H: tapping a run-relative Markdown link in a run's conversation opens that file of the run's own folder,
// as an absolute path inside the folder opens (desktop: the Files panel, as a workspace file; phone: its Files screen). A
// link out of the folder or a run with no folder opens nothing and says the preview could not be opened; a run on another
// node says which node. The real path mapping and resolver run; the stores and the phone opener are doubles.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEventMonitorFilePreview } from '../useEventMonitorFilePreview';

const mocks = vi.hoisted(() => ({
  activeContext: { activeWorkspaceTarget: null as any, resolveWorkspaceMetadataForTarget: vi.fn() },
  fileExplorer: { openFilePreview: vi.fn() },
  windowNode: { isEmbeddedWindow: false, bindingRevision: 0 },
  workspace: { activeWorkspaceMetadata: null, activeWorkspace: null },
  isPhone: vi.fn(() => false),
  peerRunOf: vi.fn((_runId?: string | null): { nodeName: string } | null => null),
  openMobileFilePath: vi.fn(),
  reveal: vi.fn(async () => true),
}));
vi.mock('~/stores/activeContextStore', () => ({ useActiveContextStore: () => mocks.activeContext }));
vi.mock('~/stores/runTreeStore', () => ({ useRunTreeStore: () => ({ peerRunOf: mocks.peerRunOf }) }));
vi.mock('~/stores/fileExplorer', () => ({ useFileExplorerStore: () => mocks.fileExplorer }));
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => mocks.windowNode }));
vi.mock('~/stores/workspace', () => ({ useWorkspaceStore: () => mocks.workspace }));
vi.mock('~/utils/fileExplorer/localFileCapability', () => ({ hasTrustedElectronLocalFileCapability: () => false }));
vi.mock('~/utils/remoteAccess/mobileRuntime', () => ({ isMobileRemoteAccessRuntime: mocks.isPhone }));
vi.mock('~/composables/mobile/mobileFileOpening', () => ({ openMobileFilePath: mocks.openMobileFilePath }));
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string, params?: Record<string, string>) => (params?.node ? `${key}:${params.node}` : key) }) }));

const FAILED = 'workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed';
const target = (workspaceRootPath: string | null, workspaceId: string | null = 'ws-run') => ({
  workspaceRootPath,
  context: { state: { runId: 'member-run' }, config: { workspaceId, workspaceMetadata: workspaceId ? { workspaceId, workspaceRootPath } : null } },
});
const preview = (mobileNavigation: unknown = null) => useEventMonitorFilePreview({
  revealTool: mocks.reveal, mobileNavigation: mobileNavigation as never, isOriginCurrent: () => true, originRunId: () => 'member-run',
});
const link = (href: string) => ({ kind: 'run-relative' as const, href });

describe('useEventMonitorFilePreview: run-relative links (autobyteus-609 D-H)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isPhone.mockReturnValue(false);
    mocks.peerRunOf.mockReturnValue(null);
    mocks.fileExplorer.openFilePreview.mockResolvedValue(undefined);
    mocks.activeContext.activeWorkspaceTarget = target('/w/run');
  });

  it.each([
    ['media/clip.mp4', 'media/clip.mp4'],
    ['docs/a.md#x', 'docs/a.md'],
  ])('desktop: %s opens %s of the run\'s folder in the Files panel, read-only', async (href, relativePath) => {
    expect(await preview().openPath(link(href))).toEqual({ status: 'opened', path: relativePath });
    expect(mocks.fileExplorer.openFilePreview).toHaveBeenCalledWith(relativePath, 'ws-run', { accessIntent: { source: 'event-monitor', readOnly: true } });
    expect(mocks.reveal).toHaveBeenCalledWith('files');
  });

  it('a target without its folder uses its run\'s workspace metadata folder, where the absolute flow reads it', async () => {
    const pending = target(null, 'ws-late');
    pending.context.config.workspaceMetadata = { workspaceId: 'ws-late', workspaceRootPath: '/w/late' };
    mocks.activeContext.activeWorkspaceTarget = pending;
    expect(await preview().openPath(link('notes.md'))).toEqual({ status: 'opened', path: 'notes.md' });
    expect(mocks.fileExplorer.openFilePreview).toHaveBeenCalledWith('notes.md', 'ws-late', expect.anything());
  });

  it.each([
    ['../outside.md', () => target('/w/run')],
    ['docs/../../outside.md', () => target('/w/run')],
    ['notes.md', () => null],
  ])('%s with no file in the run\'s folder opens nothing and says the preview could not be opened', async (href, makeTarget) => {
    mocks.activeContext.activeWorkspaceTarget = makeTarget();
    expect(await preview().openPath(link(href))).toEqual({ status: 'failed', message: FAILED });
    expect(mocks.fileExplorer.openFilePreview).not.toHaveBeenCalled();
  });

  it('a run with a target but no folder and no workspace metadata opens nothing', async () => {
    mocks.activeContext.activeWorkspaceTarget = target(null, null);
    expect(await preview().openPath(link('notes.md'))).toEqual({ status: 'failed', message: FAILED });
    expect(mocks.fileExplorer.openFilePreview).not.toHaveBeenCalled();
  });

  it('a run on another node says which node it is on and resolves nothing', async () => {
    mocks.peerRunOf.mockReturnValue({ nodeName: 'zeta-node' });
    const result = await preview().openPath(link('media/clip.mp4'));
    expect(result).toMatchObject({ status: 'unavailable' });
    expect((result as { message: string }).message).toContain('zeta-node');
    expect(mocks.fileExplorer.openFilePreview).not.toHaveBeenCalled();
  });

  it('phone: the link opens as the file\'s absolute path in the run\'s folder, on the phone\'s Files screen', async () => {
    mocks.isPhone.mockReturnValue(true);
    mocks.openMobileFilePath.mockResolvedValue({ status: 'opened', path: 'media/clip.mp4' });
    const navigation = { openFile: vi.fn(), openNodeFile: vi.fn() };
    expect(await preview(navigation).openPath(link('media/clip.mp4'))).toEqual({ status: 'opened', path: 'media/clip.mp4' });
    expect(mocks.openMobileFilePath).toHaveBeenCalledWith(expect.objectContaining({ absolutePath: '/w/run/media/clip.mp4', mobileNavigation: navigation }));
  });
});
