import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
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

  const mountComponent = (artifact: any) => {
    return mount(ArtifactContentViewer, {
      props: { artifact },
      global: {
        stubs: {
          Icon: true,
        },
      },
    });
  };

  beforeEach(() => {
    determineFileTypeMock.mockReset();
    determineFileTypeMock.mockResolvedValue('Text');
    mockGetRun.mockReset();
    mockGetRun.mockReturnValue({ config: { workspaceId: 'ws-1' } });
    mockWorkspaceStore.workspaces = {
      'ws-1': {
        workspaceId: 'ws-1',
        absolutePath: '/workspace',
      },
    };
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
});
