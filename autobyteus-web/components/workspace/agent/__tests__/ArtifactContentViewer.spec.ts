import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { defineComponent, reactive } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import ArtifactContentViewer from '../ArtifactContentViewer.vue';
import {
  toAgentArtifactViewerItem,
  type ArtifactViewerItem,
} from '../artifactViewerItem';
import { useFileContentDisplayModeStore } from '~/stores/fileContentDisplayMode';

const {
  determineFileTypeMock,
  mockWindowNodeContextStore,
  createObjectURLMock,
  revokeObjectURLMock,
} = vi.hoisted(() => ({
  determineFileTypeMock: vi.fn(),
  mockWindowNodeContextStore: {
    getBoundEndpoints: vi.fn(() => ({ rest: 'http://localhost:3000/rest' })),
  },
  createObjectURLMock: vi.fn(() => 'blob:artifact-preview'),
  revokeObjectURLMock: vi.fn(),
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
  const mountedWrappers: Array<ReturnType<typeof mount>> = [];
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

  const toViewerItem = (artifact: any): ArtifactViewerItem | null => {
    if (!artifact) {
      return null;
    }
    if (artifact.kind === 'agent') {
      return artifact;
    }
    return toAgentArtifactViewerItem(artifact);
  };

  const mountComponent = (artifact: any, refreshSignal = 0) =>
    mountedWrappers[mountedWrappers.length] = mount(ArtifactContentViewer, {
      props: { artifact: toViewerItem(artifact), refreshSignal },
      global: {
        stubs: {
          Icon: true,
        },
      },
    });

  const mountReactiveHost = (artifact: any, refreshSignal = 0) => {
    const state = reactive({
      artifact: toViewerItem(artifact),
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

    mountedWrappers.push(wrapper);
    return { wrapper, state };
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    determineFileTypeMock.mockReset();
    determineFileTypeMock.mockResolvedValue('Text');
    mockWindowNodeContextStore.getBoundEndpoints.mockReset();
    mockWindowNodeContextStore.getBoundEndpoints.mockReturnValue({ rest: 'http://localhost:3000/rest' });
    createObjectURLMock.mockReset();
    createObjectURLMock.mockReturnValue('blob:artifact-preview');
    revokeObjectURLMock.mockReset();
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: createObjectURLMock,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: revokeObjectURLMock,
    });
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    while (mountedWrappers.length > 0) {
      mountedWrappers.pop()?.unmount();
    }
    document.body.innerHTML = '';
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

  it('shows a maximize button and restores from maximized mode with Escape', async () => {
    const wrapper = mountComponent({
      ...defaultArtifact,
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="artifact-viewer-zen-toggle"]').attributes('title')).toBe('Maximize view');

    await wrapper.get('[data-testid="artifact-viewer-zen-toggle"]').trigger('click');
    await flushPromises();

    const maximizedShell = document.body.querySelector('[data-testid="artifact-content-viewer-shell"]');
    const restoreButton = document.body.querySelector('[data-testid="artifact-viewer-zen-toggle"]');
    expect(maximizedShell?.className).toContain('fixed');
    expect(restoreButton?.getAttribute('title')).toBe('Restore view');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await flushPromises();

    expect(wrapper.get('[data-testid="artifact-viewer-zen-toggle"]').attributes('title')).toBe('Maximize view');
    expect(wrapper.get('[data-testid="artifact-content-viewer-shell"]').classes()).not.toContain('fixed');
  });

  it('keeps edit and preview controls available while maximized', async () => {
    const wrapper = mountComponent({
      ...defaultArtifact,
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    await wrapper.get('button[title*="Edit"]').trigger('click');
    await wrapper.get('[data-testid="artifact-viewer-zen-toggle"]').trigger('click');
    await flushPromises();

    expect(document.body.querySelector('button[title*="Edit"]')).not.toBeNull();
    expect(document.body.querySelector('button[title*="Preview"]')).not.toBeNull();
  });

  it('does not inherit maximize state from the file explorer viewer', async () => {
    const fileContentDisplayModeStore = useFileContentDisplayModeStore();
    fileContentDisplayModeStore.toggleZenMode();

    const wrapper = mountComponent({
      ...defaultArtifact,
      status: 'available',
      sourceTool: 'edit_file',
    });

    await flushPromises();

    expect(wrapper.get('[data-testid="artifact-viewer-zen-toggle"]').attributes('title')).toBe('Maximize view');
    expect(wrapper.get('[data-testid="artifact-content-viewer-shell"]').classes()).not.toContain('fixed');
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

  it('fetches binary file-change content and resolves an object URL for media previews', async () => {
    const fetchMock = vi.mocked(global.fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      blob: async () => new Blob(['image-bytes'], { type: 'image/png' }),
    } as Response);

    const wrapper = mountComponent({
      ...defaultArtifact,
      path: '/Users/normy/Downloads/image.png',
      type: 'image',
      status: 'available',
      sourceTool: 'generated_output',
      content: undefined,
    });

    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/rest/runs/agent-1/file-change-content?path=%2FUsers%2Fnormy%2FDownloads%2Fimage.png',
      { cache: 'no-store' },
    );
    expect(createObjectURLMock).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="file-viewer"]').text()).toContain('blob:artifact-preview');

    wrapper.unmount();
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:artifact-preview');
  });
});
