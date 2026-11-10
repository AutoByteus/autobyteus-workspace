import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileFiles from '../MobileFiles.vue';
import MobileMessages from '../MobileMessages.vue';
import MobileArtifacts from '../MobileArtifacts.vue';
import MobileActivity from '../MobileActivity.vue';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWorkspaceStore, type WorkspaceInfo } from '~/stores/workspace';
import { useRunFileChangesStore } from '~/stores/runFileChangesStore';
import { useRemoteRunsStore } from '~/stores/remoteRunsStore';
import { createDefaultWorkspaceFileExplorerState } from '~/stores/fileExplorerState';
import { createNodeIdToNodeDictionary } from '~/utils/fileExplorer/fileUtils';
import { TreeNode } from '~/utils/fileExplorer/TreeNode';
import { createMobileTestRouter } from '~/composables/mobile/__tests__/mobileTestRouter';

vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ resolvedLocale: { value: 'en' }, t: (key: string, params?: Record<string, string>) => `${key}${params?.node ? `:${params.node}` : ''}` }) }));

let pinia: Pinia;
const ROOT = '/Users/normy/project';
const targetOf = (patch: Record<string, unknown> = {}) => ({
  kind: 'standalone_agent', access: 'live', workspaceRootPath: ROOT, browse: { kind: 'run', runId: 'run-1' },
  context: { config: { runtimeKind: 'autobyteus' }, state: { runId: 'run-1' } }, ...patch,
}) as never;
const workspace = (): WorkspaceInfo => ({ workspaceId: 'workspace-1', name: 'project', displayName: 'project', workspaceConfig: { root_path: ROOT },
  absolutePath: ROOT, workspaceRootPath: ROOT, kind: 'filesystem', isTemp: false } as WorkspaceInfo);
const seedTree = (root: TreeNode) => {
  const state = createDefaultWorkspaceFileExplorerState('workspace-1');
  state.tree = root; state.nodeIdToNode = createNodeIdToNodeDictionary(root);
  useFileExplorerStore().fileExplorerStateByWorkspace.set('workspace-1', state);
};
const mountView = async (component: unknown, target = targetOf(), query: Record<string, string> = {}) => {
  const router = await createMobileTestRouter(query);
  const wrapper = mount(component as never, { props: { target } as never, global: { plugins: [router, pinia], stubs: {
    FileViewer: { props: ['file'], template: '<div data-testid="file-viewer-stub">{{ file.path }}:{{ file.content }}</div>' },
    CollaborationMessageReferenceViewer: { props: ['contentPath', 'hideHeader'], template: '<div data-testid="reference-stub" :data-hide-header="String(hideHeader)">{{ contentPath }}</div>' },
    ArtifactContentViewer: { props: ['artifact'], template: '<div data-testid="artifact-viewer-stub">{{ artifact?.path }}</div>' },
  } } });
  await flushPromises();
  return { router, wrapper };
};

describe('the phone\'s view screens read the open target (autobyteus-277 DS-005, REQ-007)', () => {
  beforeEach(() => {
    pinia = createPinia(); setActivePinia(pinia);
    const workspaceStore = useWorkspaceStore();
    workspaceStore.workspaces['workspace-1'] = workspace();
    vi.spyOn(workspaceStore, 'acquireFileExplorerLiveSession').mockReturnValue(vi.fn());
    vi.spyOn(workspaceStore, 'resolveWorkspaceMetadataByRootPath').mockResolvedValue({ workspaceId: 'workspace-1', workspaceRootPath: ROOT, displayName: 'project', kind: 'filesystem' } as never);
    vi.spyOn(workspaceStore, 'ensureWorkspaceMetadata').mockResolvedValue(workspace() as never);
  });

  describe('Files', () => {
    it('shows the open agent\'s folder with its path line; a folder row loads and enters it; no filters, no Attach', async () => {
      const root = new TreeNode('project', '', false, [], 'root', true);
      const folder = new TreeNode('src', 'src', false, [], 'folder-src', false);
      root.addChild(folder);
      seedTree(root);
      vi.spyOn(useWorkspaceStore(), 'fetchFolderChildren').mockImplementation(async () => {
        folder.addChild(new TreeNode('main.ts', 'src/main.ts', true, [], 'file-main', true));
        folder.childrenLoaded = true;
      });
      const { wrapper } = await mountView(MobileFiles);
      expect(wrapper.get('[data-testid="mobile-screen-title"]').text()).toBe('Files');
      expect(wrapper.get('[data-testid="mobile-files-path"]').text()).toContain('project');
      await wrapper.get('[data-testid="mobile-files-row"]').trigger('click');
      await flushPromises();
      expect(wrapper.get('[data-testid="mobile-files-path"]').text()).toMatch(/project\s*src/);
      // CRR-003 F-05: each path part is a 44px-wide target.
      expect(wrapper.findAll('[data-testid="mobile-files-path"] button').every((button) => button.classes().includes('min-w-[2.75rem]'))).toBe(true);
      expect(wrapper.text()).toContain('main.ts');
      expect(wrapper.text()).not.toMatch(/Filters|Recent|Attached|Markdown\/code|Attach/);
    });

    it('a folder that does not resolve says so, with Retry, and never shows another folder', async () => {
      vi.mocked(useWorkspaceStore().resolveWorkspaceMetadataByRootPath).mockResolvedValue(null);
      const { wrapper } = await mountView(MobileFiles);
      expect(wrapper.get('[data-testid="mobile-files-no-workspace"]').text()).toContain('could not be resolved');
      expect(wrapper.find('[data-testid="mobile-files-retry-workspace"]').exists()).toBe(true);
    });

    it('one search over the whole workspace: the search icon opens a focused field, its results show their path', async () => {
      vi.useFakeTimers();
      seedTree(new TreeNode('project', '', false, [new TreeNode('loaded.txt', 'loaded.txt', true, [], 'loaded', true)], 'root', true));
      const explorer = useFileExplorerStore();
      const searchFiles = vi.spyOn(explorer, 'searchFiles').mockImplementation(async (query, workspaceId) => {
        explorer._getOrCreateWorkspaceState(workspaceId).searchResults = query ? [new TreeNode('unloaded.md', 'deep/unloaded.md', true, [], 's', true)] : [];
      });
      const { wrapper } = await mountView(MobileFiles);
      await wrapper.get('[data-testid="mobile-files-search-open"]').trigger('click');
      await wrapper.get('[data-testid="mobile-files-search"]').setValue('unloaded');
      vi.advanceTimersByTime(260);
      await flushPromises();
      expect(searchFiles).toHaveBeenCalledWith('unloaded', 'workspace-1');
      expect(wrapper.text()).toContain('deep/unloaded.md');
      expect(wrapper.text()).not.toContain('loaded.txt');
      vi.useRealTimers();
    });

    it('a tapped file opens full screen as a history entry; ← returns to the folder', async () => {
      seedTree(new TreeNode('project', '', false, [new TreeNode('notes.md', 'notes.md', true, [], 'notes', true)], 'root', true));
      const explorer = useFileExplorerStore();
      vi.spyOn(explorer, 'openFilePreview').mockImplementation(async (filePath, workspaceId) => {
        const state = explorer._getOrCreateWorkspaceState(workspaceId);
        state.openFiles.push({ path: filePath, type: 'Text', mode: 'preview', content: '# Notes', url: null, contentRevision: 0, relativeResourceContext: null, isLoading: false, error: null });
        state.activeFile = filePath;
      });
      const { router, wrapper } = await mountView(MobileFiles, targetOf(), { screen: 'files' });
      await wrapper.get('[data-testid="mobile-files-row"]').trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.query).toMatchObject({ screen: 'files', workspace: 'workspace-1', file: 'notes.md' });
      expect(wrapper.get('[data-testid="mobile-file-preview-content"]').text()).toBe('notes.md:# Notes');
      expect(wrapper.find('[data-testid="mobile-file-attach"]').exists()).toBe(false);
      await wrapper.get('[data-testid="mobile-file-viewer"] [data-testid="mobile-screen-back"]').trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.query.file).toBeUndefined();
      expect(wrapper.find('[data-testid="mobile-file-viewer"]').exists()).toBe(false);
    });

    it('AC-001 a node file (autobyteus-436) opens full screen, read-only, fetched by its absolute path with the phone credential; ← closes it', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('# Contract', { status: 200, headers: { 'content-type': 'text/markdown' } }));
      const { router, wrapper } = await mountView(MobileFiles, targetOf(), { screen: 'files', nodeFile: '/Users/normy/worktrees/x/data-contract.md' });
      await flushPromises();
      expect(String(fetchSpy.mock.calls[0]?.[0])).toContain(`/node-files/content?path=${encodeURIComponent('/Users/normy/worktrees/x/data-contract.md')}`);
      expect(wrapper.get('[data-testid="mobile-file-viewer"] [data-testid="mobile-screen-title"]').text()).toBe('data-contract.md');
      expect(wrapper.get('[data-testid="mobile-file-preview-content"]').text()).toBe('/Users/normy/worktrees/x/data-contract.md:# Contract');
      await wrapper.get('[data-testid="mobile-file-viewer"] [data-testid="mobile-screen-back"]').trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.query.nodeFile).toBeUndefined();
      expect(wrapper.find('[data-testid="mobile-file-viewer"]').exists()).toBe(false);
      fetchSpy.mockRestore();
    });

    it('AC-004 a missing node file and a folder say so; another failure says the preview could not be opened', async () => {
      for (const [answer, message] of [
        [new Response(JSON.stringify({ code: 'NODE_FILE_NOT_FOUND', message: 'x' }), { status: 404 }), 'workspace.components.mobile.views.MobileFiles.node_file_not_found'],
        [new Response(JSON.stringify({ code: 'NODE_FILE_IS_FOLDER', message: 'x' }), { status: 400 }), 'workspace.components.mobile.views.MobileFiles.node_file_is_folder'],
        [new Response(JSON.stringify({ code: 'NODE_FILE_UNREADABLE', message: 'x' }), { status: 400 }), 'workspace.components.conversation.segments.renderer.MarkdownRenderer.file_preview_failed'],
      ] as const) {
        const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(answer);
        const { wrapper } = await mountView(MobileFiles, targetOf(), { screen: 'files', nodeFile: '/Users/normy/elsewhere' });
        await flushPromises();
        expect(wrapper.get('[data-testid="mobile-file-preview-error"]').text()).toBe(message);
        wrapper.unmount();
        fetchSpy.mockRestore();
      }
    });

    it('a run on another node: its files are on that node (278 wording)', async () => {
      vi.spyOn(useRemoteRunsStore(), 'runOfAgentRun').mockReturnValue({ runId: 'r', nodeName: 'docker', reachable: true } as never);
      const { wrapper } = await mountView(MobileFiles, targetOf({ workspaceRootPath: null }));
      expect(wrapper.get('[data-testid="mobile-files-remote"]').text()).toBe('remote.panel.files:docker');
    });
  });

  describe('Messages', () => {
    const view = (state: 'loading' | 'loaded' | 'error', messages: readonly unknown[] = []) => ({
      loadMessages: vi.fn(), listMessages: () => messages, messagesStatus: () => ({ state, error: state === 'error' ? 'gone' : null }),
      referenceContentPath: (messageId: string, referenceId: string) => `team-runs/t/messages/${messageId}/references/${referenceId}/content`,
      memberIdentityByAgentRunId: () => ({}),
    });
    const message = { messageId: 'm-1', content: 'Requirements are approved.', createdAt: '2026-11-06T07:35:00.000Z', direction: 'received',
      counterpart: { label: 'solution_designer' }, referenceFiles: [{ referenceId: 'r-1', path: 'docs/requirements.md' }] };

    it.each([
      ['loading', [], 'mobile-team-messages-loading'],
      ['error', [], 'mobile-team-messages-unavailable'],
      ['loaded', [], 'mobile-messages-empty'],
    ] as const)('keeps the source\'s %s state (autobyteus-358)', async (state, messages, testId) => {
      const { wrapper } = await mountView(MobileMessages, targetOf({ kind: 'standalone_team_member', collaborationMessages: view(state, messages) }));
      expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true);
    });

    it('lists "From <name>" with the text and its file references; a reference opens full screen and ← closes it first', async () => {
      const messages = view('loaded', [message]);
      const { router, wrapper } = await mountView(MobileMessages, targetOf({ kind: 'standalone_team_member', collaborationMessages: messages }), { screen: 'messages' });
      expect(messages.loadMessages).toHaveBeenCalled();
      expect(wrapper.get('[data-testid="mobile-team-message-row"]').text()).toContain('From solution_designer');
      await wrapper.get('[data-testid="mobile-team-reference-row"]').trigger('click');
      await flushPromises();
      expect(router.currentRoute.value.query).toMatchObject({ screen: 'messages', message: 'm-1', reference: 'r-1' });
      expect(wrapper.get('[data-testid="reference-stub"]').text()).toBe('team-runs/t/messages/m-1/references/r-1/content');
      // CRR-003 F-04: only the phone's bar (VIS-011), not the shared viewer's header.
      expect(wrapper.get('[data-testid="reference-stub"]').attributes('data-hide-header')).toBe('true');
      await wrapper.get('[data-testid="mobile-team-reference-viewer"] [data-testid="mobile-screen-back"]').trigger('click');
      await flushPromises();
      expect(wrapper.find('[data-testid="mobile-team-reference-viewer"]').exists()).toBe(false);
      expect(router.currentRoute.value.query.screen).toBe('messages');
    });
  });

  describe('Artifacts and Activity', () => {
    const artifact = (path: string, updatedAt: string) => ({ id: `run-1:${path}`, runId: 'run-1', path, type: 'file', status: 'available', sourceTool: 'generated_output',
      sourceInvocationId: null, createdAt: updatedAt, updatedAt });

    it('Artifacts: empty says so; one is shown directly', async () => {
      const empty = await mountView(MobileArtifacts);
      expect(empty.wrapper.get('[data-testid="mobile-artifacts-empty"]').text()).toContain('No Artifacts yet');
      empty.wrapper.unmount();
      useRunFileChangesStore().replaceRunProjection('run-1', [artifact('README.md', '2026-11-06T10:00:00.000Z')] as never);
      const one = await mountView(MobileArtifacts);
      expect(one.wrapper.find('[data-testid="mobile-artifacts-list"]').exists()).toBe(false);
      expect(one.wrapper.get('[data-testid="artifact-viewer-stub"]').text()).toBe('README.md');
    });

    it('Artifacts of a run on another node say its files are on that node', async () => {
      vi.spyOn(useRemoteRunsStore(), 'runOfAgentRun').mockReturnValue({ runId: 'r', nodeName: 'docker', reachable: true } as never);
      const { wrapper } = await mountView(MobileArtifacts);
      expect(wrapper.get('[data-testid="mobile-artifacts-remote"]').text()).toBe('remote.panel.artifacts:docker');
    });

    it('Activity with nothing yet says "No activity yet"', async () => {
      const { wrapper } = await mountView(MobileActivity);
      expect(wrapper.get('[data-testid="mobile-activity-empty"]').text()).toBe('No activity yet');
      expect(wrapper.get('[data-testid="mobile-screen-title"]').text()).toBe('Activity');
    });
  });
});
