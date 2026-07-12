import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileFiles from '../MobileFiles.vue';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWorkspaceStore, type WorkspaceInfo } from '~/stores/workspace';
import { createDefaultWorkspaceFileExplorerState } from '~/stores/fileExplorerState';
import type { MobileWorkContext } from '~/types/mobileWork';
import { createNodeIdToNodeDictionary } from '~/utils/fileExplorer/fileUtils';
import { TreeNode } from '~/utils/fileExplorer/TreeNode';

let pinia: Pinia;

const workspaceContext: MobileWorkContext = {
  kind: 'workspace',
  workspaceId: 'workspace-1',
  title: 'Project Workspace',
  rootPath: '/Users/normy/project',
};

const runContext: MobileWorkContext = {
  kind: 'agent-run',
  runId: 'run-1',
  agentDefinitionId: 'agent-1',
  title: 'Builder Agent',
  summary: 'Existing run',
  workspaceRootPath: '/Users/normy/project',
  isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z',
  statusLabel: 'Running',
};

function seedWorkspaceTree(workspaceId: string, root: TreeNode): void {
  const state = createDefaultWorkspaceFileExplorerState(workspaceId);
  state.tree = root;
  state.nodeIdToNode = createNodeIdToNodeDictionary(root);
  useFileExplorerStore().fileExplorerStateByWorkspace.set(workspaceId, state);
}

function makeWorkspace(overrides: Partial<WorkspaceInfo> = {}): WorkspaceInfo {
  return {
    workspaceId: 'workspace-1',
    name: 'Project Workspace',
    displayName: 'Project Workspace',
    workspaceConfig: { root_path: '/Users/normy/project' },
    absolutePath: '/Users/normy/project',
    workspaceRootPath: '/Users/normy/project',
    kind: 'filesystem',
    isTemp: false,
    ...overrides,
  };
}

function mountSubject(context: MobileWorkContext | null) {
  return mount(MobileFiles, {
    props: { context },
    global: {
      plugins: [pinia],
      stubs: {
        MobileFileViewer: {
          props: ['node', 'workspaceId', 'fileState', 'openError'],
          template: '<div data-testid="mobile-file-viewer-stub">{{ workspaceId }}:{{ node.path }}:{{ fileState?.type || "none" }}:{{ openError || "" }}</div>',
        },
      },
    },
  });
}

describe('MobileFiles', () => {
  beforeEach(() => {
    vi.useRealTimers();
    pinia = createPinia();
    setActivePinia(pinia);
    vi.spyOn(useWorkspaceStore(), 'acquireFileExplorerLiveSession').mockReturnValue(vi.fn());
  });

  it('loads unloaded folder children through the workspace store before entering the folder', async () => {
    const root = new TreeNode('project', '', false, [], 'root', true);
    const folder = new TreeNode('src', 'src', false, [], 'folder-src', false);
    root.addChild(folder);
    useWorkspaceStore().workspaces['workspace-1'] = makeWorkspace();
    seedWorkspaceTree('workspace-1', root);
    const fetchFolderChildren = vi.spyOn(useWorkspaceStore(), 'fetchFolderChildren').mockImplementation(async (workspaceId, folderPath) => {
      expect(workspaceId).toBe('workspace-1');
      expect(folderPath).toBe('src');
      folder.addChild(new TreeNode('main.ts', 'src/main.ts', true, [], 'file-main', true));
      folder.childrenLoaded = true;
    });

    const wrapper = mountSubject(workspaceContext);
    await flushPromises();
    await wrapper.get('[data-testid="mobile-files-list"] button').trigger('click');
    await flushPromises();

    expect(fetchFolderChildren).toHaveBeenCalledWith('workspace-1', 'src');
    expect(wrapper.text()).toContain('main.ts');
  });

  it('keeps the user in the current folder and shows a retryable error when folder loading fails', async () => {
    const root = new TreeNode('project', '', false, [], 'root', true);
    const folder = new TreeNode('src', 'src', false, [], 'folder-src', false);
    root.addChild(folder);
    useWorkspaceStore().workspaces['workspace-1'] = makeWorkspace();
    seedWorkspaceTree('workspace-1', root);
    vi.spyOn(useWorkspaceStore(), 'fetchFolderChildren').mockRejectedValue(new Error('Backend folder fetch failed'));

    const wrapper = mountSubject(workspaceContext);
    await flushPromises();
    await wrapper.get('[data-testid="mobile-files-list"] button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="mobile-files-sticky-context"]').text()).toContain('project');
    expect(wrapper.text()).toContain('Backend folder fetch failed');
    expect(wrapper.text()).toContain('src');
  });

  it('shows selected-run workspace unavailable instead of falling back to another workspace', async () => {
    const otherRoot = new TreeNode('other', '', false, [
      new TreeNode('leaked.txt', 'leaked.txt', true, [], 'leaked', true),
    ], 'other-root', true);
    useWorkspaceStore().workspaces['other-workspace'] = makeWorkspace({
      workspaceId: 'other-workspace',
      name: 'Other Workspace',
      workspaceConfig: { root_path: '/Users/normy/other' },
      absolutePath: '/Users/normy/other',
      workspaceRootPath: '/Users/normy/other',
    });
    seedWorkspaceTree('other-workspace', otherRoot);
    vi.spyOn(useWorkspaceStore(), 'resolveWorkspaceMetadataByRootPath').mockResolvedValue(null);

    const wrapper = mountSubject({ ...runContext, workspaceRootPath: '/Users/normy/missing' });
    await flushPromises();

    expect(wrapper.get('[data-testid="mobile-files-no-workspace"]').text()).toContain('Workspace unavailable');
    expect(wrapper.text()).toContain('/Users/normy/missing');
    expect(wrapper.text()).not.toContain('Other Workspace');
    expect(wrapper.text()).not.toContain('leaked.txt');
  });

  it('keeps workspace inactive on root load failure and retries into a successful file list', async () => {
    const workspaceStore = useWorkspaceStore();
    const fileExplorerStore = useFileExplorerStore();
    workspaceStore.workspaces['workspace-1'] = makeWorkspace();
    const acquireLiveSession = vi.spyOn(workspaceStore, 'acquireFileExplorerLiveSession').mockReturnValue(vi.fn());
    const fetchFolderChildren = vi.spyOn(fileExplorerStore, 'fetchFolderChildren');
    fetchFolderChildren.mockRejectedValueOnce(new Error('Workspace root is unavailable'));
    fetchFolderChildren.mockImplementationOnce(async (workspaceId, folderPath) => {
      expect(workspaceId).toBe('workspace-1');
      expect(folderPath).toBe('');
      const root = new TreeNode('project', '', false, [
        new TreeNode('README.md', 'README.md', true, [], 'file-readme', true),
      ], 'root', true);
      seedWorkspaceTree(workspaceId, root);
    });

    const wrapper = mountSubject(workspaceContext);
    await flushPromises();

    const unavailable = wrapper.get('[data-testid="mobile-files-no-workspace"]');
    expect(unavailable.text()).toContain('Workspace unavailable');
    expect(unavailable.text()).toContain('Workspace root is unavailable');
    expect(wrapper.find('[data-testid="mobile-files-list"]').exists()).toBe(false);
    expect(acquireLiveSession).not.toHaveBeenCalled();

    await wrapper.get('[data-testid="mobile-files-retry-workspace"]').trigger('click');
    await flushPromises();

    expect(fetchFolderChildren).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[data-testid="mobile-files-list"]').text()).toContain('README.md');
    expect(acquireLiveSession).toHaveBeenCalledWith('workspace-1', 'mobile-files:workspace-1');
  });

  it('uses workspace-wide file search results instead of only filtering the loaded tree', async () => {
    vi.useFakeTimers();
    const root = new TreeNode('project', '', false, [
      new TreeNode('loaded.txt', 'loaded.txt', true, [], 'loaded', true),
    ], 'root', true);
    useWorkspaceStore().workspaces['workspace-1'] = makeWorkspace();
    seedWorkspaceTree('workspace-1', root);
    const fileExplorerStore = useFileExplorerStore();
    const searchFiles = vi.spyOn(fileExplorerStore, 'searchFiles').mockImplementation(async (query, workspaceId) => {
      expect(workspaceId).toBe('workspace-1');
      const state = fileExplorerStore._getOrCreateWorkspaceState(workspaceId);
      state.searchResults = query
        ? [new TreeNode('unloaded.md', 'deep/unloaded.md', true, [], 'search-unloaded', true)]
        : [];
    });

    const wrapper = mountSubject(workspaceContext);
    await flushPromises();
    await wrapper.get('[data-testid="mobile-files-filters-toggle"]').trigger('click');
    await wrapper.get('[data-testid="mobile-files-deep-search"]').trigger('click');
    await wrapper.get('[data-testid="mobile-files-search"]').setValue('unloaded');
    vi.advanceTimersByTime(260);
    await flushPromises();

    expect(searchFiles).toHaveBeenCalledWith('unloaded', 'workspace-1');
    expect(wrapper.text()).toContain('unloaded.md');
    expect(wrapper.text()).not.toContain('loaded.txt');
    vi.useRealTimers();
  });

  it('opens tapped files through the file explorer read-only preview state', async () => {
    const root = new TreeNode('project', '', false, [
      new TreeNode('notes.md', 'notes.md', true, [], 'notes', true),
    ], 'root', true);
    useWorkspaceStore().workspaces['workspace-1'] = makeWorkspace();
    seedWorkspaceTree('workspace-1', root);
    const fileExplorerStore = useFileExplorerStore();
    const openFilePreview = vi.spyOn(fileExplorerStore, 'openFilePreview').mockImplementation(async (filePath, workspaceId) => {
      const state = fileExplorerStore._getOrCreateWorkspaceState(workspaceId);
      state.openFiles.push({
        path: filePath,
        type: 'Text',
        mode: 'preview',
        content: '# Notes',
        url: null,
        relativeResourceContext: { kind: 'workspace', workspaceId },
        isLoading: false,
        error: null,
      });
      state.activeFile = filePath;
    });

    const wrapper = mountSubject(workspaceContext);
    await flushPromises();
    await wrapper.get('[data-testid="mobile-files-list"] button').trigger('click');
    await flushPromises();

    expect(openFilePreview).toHaveBeenCalledWith('notes.md', 'workspace-1');
    expect(wrapper.get('[data-testid="mobile-file-viewer-stub"]').text()).toContain('workspace-1:notes.md:Text');
  });
});
