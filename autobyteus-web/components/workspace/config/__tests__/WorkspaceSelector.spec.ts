import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import WorkspaceSelector from '../WorkspaceSelector.vue';

// Mock the SearchableSelect component
vi.mock('~/components/common/SearchableSelect.vue', () => ({
  default: {
    name: 'SearchableSelect',
    template: '<div class="searchable-select-stub"></div>',
    props: ['modelValue', 'options', 'disabled', 'placeholder'],
    emits: ['update:model-value'],
  }
}));

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

describe('WorkspaceSelector', () => {
  const { workspaceStoreMock, windowNodeContextStoreMock } = vi.hoisted(() => ({
    workspaceStoreMock: {
      tempWorkspaceId: null as string | null,
      tempWorkspace: null as any,
      workspaces: {} as Record<string, any>,
      allWorkspaces: [] as any[],
      fetchAllWorkspaces: vi.fn().mockResolvedValue([]),
    },
    windowNodeContextStoreMock: {
      isEmbeddedWindow: { __v_isRef: true, value: false },
    },
  }));

  vi.mock('~/stores/workspace', () => ({
    useWorkspaceStore: () => workspaceStoreMock,
  }));

  vi.mock('~/stores/windowNodeContextStore', () => ({
    useWindowNodeContextStore: () => windowNodeContextStoreMock,
  }));

  beforeEach(() => {
    setActivePinia(createPinia());
    workspaceStoreMock.tempWorkspaceId = null;
    workspaceStoreMock.tempWorkspace = null;
    workspaceStoreMock.workspaces = {};
    workspaceStoreMock.allWorkspaces = [];
    workspaceStoreMock.fetchAllWorkspaces = vi.fn().mockResolvedValue([]);
    windowNodeContextStoreMock.isEmbeddedWindow.value = false;
    
    // Reset window.electronAPI mock
    delete (window as any).electronAPI;
  });

  const defaultProps = {
    workspaceId: null,
    isLoading: false,
    error: null,
    disabled: false,
  };

  it('renders with New tab selected by default when no workspaces exist', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    // Should show the path input (New mode) when no workspaces exist
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.find('input[placeholder="/absolute/path/to/workspace"]').exists()).toBe(true);
  });

  it('hides Browse button when not in Electron environment', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = false;

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    // Browse button should not be visible
    const browseButton = wrapper.find('button[title="Browse for folder"]');
    expect(browseButton.exists()).toBe(false);
  });

  it('shows Browse button when in Electron environment', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    // Browse button should be visible
    const browseButton = wrapper.find('button[title="Browse for folder"]');
    expect(browseButton.exists()).toBe(true);
  });

  it('calls showFolderDialog when Browse button is clicked', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;

    const mockShowFolderDialog = vi.fn().mockResolvedValue({
      canceled: false,
      path: '/selected/folder/path',
    });
    
    (window as any).electronAPI = {
      showFolderDialog: mockShowFolderDialog,
    };

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    const browseButton = wrapper.find('button[title="Browse for folder"]');
    await browseButton.trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(mockShowFolderDialog).toHaveBeenCalled();
  });

  it('does not update path when dialog is canceled', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;

    const mockShowFolderDialog = vi.fn().mockResolvedValue({
      canceled: true,
      path: null,
    });
    
    (window as any).electronAPI = {
      showFolderDialog: mockShowFolderDialog,
    };

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    // Set initial value
    const input = wrapper.find('input[type="text"]');
    await input.setValue('/initial/path');

    const browseButton = wrapper.find('button[title="Browse for folder"]');
    await browseButton.trigger('click');
    await wrapper.vm.$nextTick();

    // Path should remain unchanged
    expect((input.element as HTMLInputElement).value).toBe('/initial/path');
    expect(wrapper.emitted('load-new')).toBeFalsy();
  });

  it('emits load-new when Load button is clicked with path', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = false;

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    const input = wrapper.find('input[type="text"]');
    await input.setValue('/test/workspace/path');

    const loadButton = wrapper.find('button[title="Load workspace"]');
    await loadButton.trigger('click');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('load-new')).toBeTruthy();
    expect(wrapper.emitted('load-new')![0]).toEqual(['/test/workspace/path']);
  });

  it('disables Browse button when isLoading is true', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;

    const wrapper = mount(WorkspaceSelector, {
      props: { ...defaultProps, isLoading: true },
    });
    await wrapper.vm.$nextTick();

    const browseButton = wrapper.find('button[title="Browse for folder"]');
    expect(browseButton.attributes('disabled')).toBeDefined();
  });

  it('disables Browse button when disabled prop is true', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;

    const wrapper = mount(WorkspaceSelector, {
      props: { ...defaultProps, disabled: true },
    });
    await wrapper.vm.$nextTick();

    const browseButton = wrapper.find('button[title="Browse for folder"]');
    expect(browseButton.attributes('disabled')).toBeDefined();
  });

  it('shows helper text for Electron mode', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Browse for a folder or enter path manually.');
  });

  it('shows helper text for browser mode', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = false;

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Enter path to load a new workspace.');
  });
});
