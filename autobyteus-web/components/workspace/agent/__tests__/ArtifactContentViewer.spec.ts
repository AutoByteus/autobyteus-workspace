import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import ArtifactContentViewer from '../ArtifactContentViewer.vue';

const {
  determineFileTypeMock,
  mockWindowNodeContextStore,
} = vi.hoisted(() => ({
  determineFileTypeMock: vi.fn(),
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

  const mountComponent = (artifact: any, refreshSignal = 0) =>
    mount(ArtifactContentViewer, {
      props: { artifact, refreshSignal },
      global: {
        stubs: {
          Icon: true,
        },
      },
    });

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
    mockWindowNodeContextStore.getBoundEndpoints.mockReset();
    mockWindowNodeContextStore.getBoundEndpoints.mockReturnValue({ rest: 'http://localhost:3000/rest' });
    vi.stubGlobal('fetch', vi.fn());
  });

  it('defaults to edit mode when artifact is streaming', async () => {
    const wrapper = mountComponent({ ...defaultArtifact, status: 'streaming' });
    await flushPromises();

    expect((wrapper.vm as any).viewMode).toBe('edit');
  });

  it('uses buffered write_file content and skips server fetch before availability', async () => {
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

  it('fetches available text artifacts from the run-scoped server route', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'updated artifact content',
    } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: 'src/test.md',
      status: 'available',
      sourceTool: 'edit_file',
      content: 'stale local copy',
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/rest/runs/agent-1/file-change-content?path=src%2Ftest.md',
      { cache: 'no-store' },
    );
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('updated artifact content');
    expect((wrapper.vm as any).viewMode).toBe('preview');
  });

  it('fetches external absolute edit_file paths from the run-scoped server route', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'downloads file content',
    } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/apply_patch_test.txt',
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/rest/runs/agent-1/file-change-content?path=%2FUsers%2Fnormy%2FDownloads%2Fapply_patch_test.txt',
      { cache: 'no-store' },
    );
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('downloads file content');
  });

  it('keeps edit_file blank until a server-backed fetch URL is available, then refetches after path updates', async () => {
    const fetchMock = vi.mocked(global.fetch);
    const { wrapper, state } = mountReactiveHost(reactive({
      ...defaultArtifact,
      path: '',
      status: 'pending',
      sourceTool: 'edit_file',
      content: '@@ -1 +1 @@',
    }));

    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Content not available yet');
    expect(wrapper.text()).not.toContain('@@ -1 +1 @@');

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => 'workspace-backed content',
    } as Response);

    state.artifact.path = '/Users/normy/Downloads/apply_patch_test.txt';
    state.artifact.status = 'available';
    state.artifact.updatedAt = new Date(Date.now() + 1_000).toISOString();

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/rest/runs/agent-1/file-change-content?path=%2FUsers%2Fnormy%2FDownloads%2Fapply_patch_test.txt',
      { cache: 'no-store' },
    );
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('workspace-backed content');
  });

  it('does not prepend an extra slash for absolute artifact paths in the header', async () => {
    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/apply_patch_test.txt',
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    const headerPath = wrapper.get('[data-testid="artifact-path-display"]').text();
    expect(headerPath).toBe('/Users/normy/Downloads/apply_patch_test.txt');
    expect(headerPath.startsWith('//')).toBe(false);
    expect(wrapper.text()).not.toContain('//Users/normy/Downloads/apply_patch_test.txt');
  });

  it('shows deleted state when the server artifact route returns 404', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/missing.txt',
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(wrapper.text()).toContain('File not found');
  });

  it('shows a pending state for edit_file rows that are not available yet', async () => {
    const fetchMock = vi.mocked(global.fetch);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/pending.txt',
      status: 'pending',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Content not available yet');
    expect(wrapper.text()).not.toContain('File not found');
  });

  it('shows a pending state when the server reports content is not ready yet', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => '',
    } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/pending.txt',
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.text()).toContain('Content not available yet');
    expect(wrapper.text()).not.toContain('File not found');
  });

  it('shows an explicit failure error for failed file-change rows', async () => {
    const fetchMock = vi.mocked(global.fetch);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/failed.txt',
      status: 'failed',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain(
      'This file change failed before the final content could be captured.',
    );
    expect(wrapper.text()).not.toContain('Content not available yet');
  });

  it('does not render buffered draft text for failed write_file rows', async () => {
    const fetchMock = vi.mocked(global.fetch);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/failed-write.txt',
      status: 'failed',
      sourceTool: 'write_file',
      content: 'draft that should not be shown',
    });

    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain(
      'This file change failed before the final content could be captured.',
    );
    expect(wrapper.find('[data-testid="file-viewer"]').text()).not.toContain(
      'draft that should not be shown',
    );
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
      path: '/Users/normy/Downloads/apply_patch_test.txt',
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('Failed to fetch content (500)');
  });

  it('retries server fetch when the refresh signal changes', async () => {
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
        text: async () => 'retried artifact content',
      } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/apply_patch_test.txt',
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('Failed to fetch content (500)');

    await wrapper.setProps({ refreshSignal: 1 });
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('retried artifact content');
  });

  it('fails closed for non-text file-change previews instead of using the text-only route', async () => {
    determineFileTypeMock.mockResolvedValue('Image');
    const fetchMock = vi.mocked(global.fetch);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/image.png',
      status: 'available',
      sourceTool: 'edit_file',
      content: undefined,
    });

    await flushPromises();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('Preview unavailable');
    expect(wrapper.text()).toContain('Preview is currently available only for text file changes.');
  });
});
