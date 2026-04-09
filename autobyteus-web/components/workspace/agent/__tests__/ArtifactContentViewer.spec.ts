import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import ArtifactContentViewer from '../ArtifactContentViewer.vue';

const {
  determineFileTypeMock,
  mockGetRun,
  mockWorkspaceStore,
  mockWindowNodeContextStore,
} = vi.hoisted(() => ({
  determineFileTypeMock: vi.fn(),
  mockGetRun: vi.fn(),
  mockWorkspaceStore: {
    workspaces: {} as Record<string, any>,
    workspacesFetched: true,
    fetchAllWorkspaces: vi.fn(),
  },
  mockWindowNodeContextStore: {
    getBoundEndpoints: vi.fn(() => ({ rest: 'http://localhost:3000/rest' })),
  },
}));

vi.mock('~/components/fileExplorer/FileViewer.vue', () => ({
  default: {
    name: 'FileViewer',
    props: ['file', 'mode', 'readOnly', 'error'],
    template:
      '<div data-testid="file-viewer">{{ (file.content || file.url || "") + "||" + (error || "") }}</div>',
  },
}));

vi.mock('~/utils/fileExplorer/fileUtils', () => ({
  determineFileType: determineFileTypeMock,
}));

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({
    getRun: mockGetRun,
  }),
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => mockWorkspaceStore,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => mockWindowNodeContextStore,
}));

describe('ArtifactContentViewer', () => {
  const defaultArtifact = {
    id: 'agent-1:src/test.md',
    runId: 'agent-1',
    path: 'src/test.md',
    type: 'file',
    status: 'streaming',
    sourceTool: 'write_file',
    content: '# Hello',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mountComponent = (artifact: any, refreshSignal = 0) => {
    return mount(ArtifactContentViewer, {
      props: { artifact, refreshSignal },
      global: {
        stubs: {
          Icon: true,
        },
      },
    });
  };

  const mountReactiveHost = (artifact: any, refreshSignal = 0) => {
    const state = reactive({
      artifact,
      refreshSignal,
    });

    const wrapper = mount(defineComponent({
      components: { ArtifactContentViewer },
      setup: () => ({ state }),
      template: `
        <ArtifactContentViewer
          :artifact="state.artifact"
          :refresh-signal="state.refreshSignal"
        />
      `,
    }), {
      global: {
        stubs: {
          Icon: true,
        },
      },
    });

    return { wrapper, state };
  };

  beforeEach(() => {
    determineFileTypeMock.mockReset();
    determineFileTypeMock.mockResolvedValue('Text');
    mockGetRun.mockReset();
    mockGetRun.mockReturnValue({ config: { workspaceId: 'ws-1' } });
    mockWorkspaceStore.workspaces = reactive({
      'ws-1': {
        workspaceId: 'ws-1',
        absolutePath: '/workspace',
      },
    }) as Record<string, any>;
    mockWorkspaceStore.workspacesFetched = true;
    mockWorkspaceStore.fetchAllWorkspaces.mockReset();
    mockWorkspaceStore.fetchAllWorkspaces.mockImplementation(async () => {});
    mockWindowNodeContextStore.getBoundEndpoints.mockReset();
    mockWindowNodeContextStore.getBoundEndpoints.mockReturnValue({ rest: 'http://localhost:3000/rest' });
    vi.stubGlobal('fetch', vi.fn());
  });

  it('defaults to edit mode when artifact is streaming', async () => {
    const wrapper = mountComponent({ ...defaultArtifact, status: 'streaming' });
    await flushPromises();

    expect((wrapper.vm as any).viewMode).toBe('edit');
  });

  it('uses buffered write_file content and skips workspace fetch before availability', async () => {
    const fetchMock = vi.mocked(global.fetch);
    const wrapper = mountComponent({
      ...defaultArtifact,
      status: 'pending',
      sourceTool: 'write_file',
      content: 'buffered draft',
    });

    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('buffered draft');
    expect((wrapper.vm as any).viewMode).toBe('edit');
  });

  it('fetches current workspace content for available text artifacts', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'updated workspace content',
    } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/workspace/src/test.md',
      status: 'available',
      sourceTool: 'edit_file',
      workspaceRoot: '/workspace',
      content: 'stale local copy',
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/rest/workspaces/ws-1/content?path=src%2Ftest.md',
      { cache: 'no-store' },
    );
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('updated workspace content');
    expect((wrapper.vm as any).viewMode).toBe('preview');
  });

  it('resolves edit_file content against the best matching loaded workspace root', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'alternate workspace content',
    } as Response);

    mockWorkspaceStore.workspaces = reactive({
      'ws-1': {
        workspaceId: 'ws-1',
        absolutePath: '/workspace-a',
      },
      'ws-2': {
        workspaceId: 'ws-2',
        absolutePath: '/workspace-b',
      },
    }) as Record<string, any>;

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/workspace-b/src/test.md',
      status: 'available',
      sourceTool: 'edit_file',
      workspaceRoot: '/workspace-a',
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/rest/workspaces/ws-2/content?path=src%2Ftest.md',
      { cache: 'no-store' },
    );
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('alternate workspace content');
  });

  it('keeps edit_file blank until workspace fetch is available, then refetches after in-place metadata updates', async () => {
    const fetchMock = vi.mocked(global.fetch);
    mockGetRun.mockReturnValue({ config: { workspaceId: null } });
    const { wrapper, state } = mountReactiveHost(reactive({
      ...defaultArtifact,
      path: 'src/test.md',
      status: 'pending',
      sourceTool: 'edit_file',
      content: '@@ -1 +1 @@',
      workspaceRoot: null,
    }));

    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="file-viewer"]').text()).not.toContain('@@ -1 +1 @@');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'workspace-backed content',
    } as Response);

    state.artifact.workspaceRoot = '/workspace';
    state.artifact.status = 'available';
    state.artifact.updatedAt = new Date(Date.now() + 1_000).toISOString();

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/rest/workspaces/ws-1/content?path=src%2Ftest.md',
      { cache: 'no-store' },
    );
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('workspace-backed content');
  });

  it('refreshes the workspace catalog once before giving up on an unresolved absolute edit_file path', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'workspace content after catalog refresh',
    } as Response);

    const workspaces = reactive<Record<string, any>>({});
    mockWorkspaceStore.workspaces = workspaces;
    mockWorkspaceStore.workspacesFetched = false;
    mockGetRun.mockReturnValue({ config: { workspaceId: null } });
    mockWorkspaceStore.fetchAllWorkspaces.mockImplementation(async () => {
      workspaces['ws-2'] = {
        workspaceId: 'ws-2',
        absolutePath: '/workspace-b',
      };
      mockWorkspaceStore.workspacesFetched = true;
    });

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/workspace-b/src/test.md',
      status: 'available',
      sourceTool: 'edit_file',
      workspaceRoot: null,
    });

    await flushPromises();
    await flushPromises();

    expect(mockWorkspaceStore.fetchAllWorkspaces).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/rest/workspaces/ws-2/content?path=src%2Ftest.md',
      { cache: 'no-store' },
    );
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('workspace content after catalog refresh');
  });

  it('does not prepend an extra slash for absolute artifact paths in the header', async () => {
    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/workspace/src/test.md',
      status: 'available',
      sourceTool: 'edit_file',
      workspaceRoot: '/workspace',
    });

    await flushPromises();

    const headerPath = wrapper.get('[data-testid="artifact-path-display"]').text();
    expect(headerPath).toBe('/workspace/src/test.md');
    expect(headerPath.startsWith('//')).toBe(false);
    expect(wrapper.text()).not.toContain('//workspace/src/test.md');
  });

  it('shows deleted state when workspace content returns 404', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/workspace/src/missing.md',
      status: 'available',
      sourceTool: 'edit_file',
      workspaceRoot: '/workspace',
    });

    await flushPromises();

    expect(wrapper.text()).toContain('File not found');
  });

  it('surfaces fetch errors for non-404 failures', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '',
    } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/workspace/src/test.md',
      status: 'available',
      sourceTool: 'edit_file',
      workspaceRoot: '/workspace',
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('Failed to fetch content (500)');
  });

  it('retries workspace fetch when the refresh signal changes', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => '',
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => 'retried workspace content',
      } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/workspace/src/test.md',
      status: 'available',
      sourceTool: 'edit_file',
      workspaceRoot: '/workspace',
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('Failed to fetch content (500)');

    await wrapper.setProps({ refreshSignal: 1 });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('retried workspace content');
  });
});
