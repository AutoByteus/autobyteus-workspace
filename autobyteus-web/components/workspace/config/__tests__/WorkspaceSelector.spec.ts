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
    window.history.pushState({}, '', '/');
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
    expect(wrapper.find('input[type="text"]').attributes('placeholder') || '').toMatch(/absolute path to workspace/i);
  });

  it('auto-selects temp workspace on mount when no workspace is selected', async () => {
    workspaceStoreMock.tempWorkspaceId = 'temp-ws';
    workspaceStoreMock.tempWorkspace = { workspaceId: 'temp-ws' };
    workspaceStoreMock.workspaces = {
      'temp-ws': { workspaceId: 'temp-ws', name: 'Temp Workspace' },
    };

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('select-existing')).toBeTruthy();
    expect(wrapper.emitted('select-existing')?.[0]).toEqual(['temp-ws']);
  });

  it('does not fetch workspaces or auto-select temp workspace in disabled display mode', async () => {
    workspaceStoreMock.tempWorkspaceId = 'temp-ws';
    workspaceStoreMock.tempWorkspace = { workspaceId: 'temp-ws' };
    workspaceStoreMock.workspaces = {
      'temp-ws': { workspaceId: 'temp-ws', name: 'Temp Workspace' },
    };
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'temp-ws', name: 'Temp Workspace', absolutePath: '/tmp/default' },
    ];

    const wrapper = mount(WorkspaceSelector, {
      props: {
        ...defaultProps,
        workspaceId: 'agent_ws_metadata',
        initialPath: '/tmp/ProjectA',
        disabled: true,
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(workspaceStoreMock.fetchAllWorkspaces).not.toHaveBeenCalled();
    expect(wrapper.emitted('select-existing')).toBeFalsy();
    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('/tmp/ProjectA');
    expect(input.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).not.toContain('Workspace: /tmp/ProjectA');
    expect(wrapper.text()).not.toContain('Workspace: Temp Workspace');
  });

  it('does not fetch workspaces or emit selection in locked display mode', async () => {
    workspaceStoreMock.tempWorkspaceId = 'temp-ws';
    workspaceStoreMock.tempWorkspace = { workspaceId: 'temp-ws' };

    const wrapper = mount(WorkspaceSelector, {
      props: {
        ...defaultProps,
        workspaceId: 'agent_ws_locked_reference',
        initialPath: '/tmp/LockedProject',
        workspaceLocked: true,
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(workspaceStoreMock.fetchAllWorkspaces).not.toHaveBeenCalled();
    expect(wrapper.emitted('select-existing')).toBeFalsy();
    expect((wrapper.find('input[type="text"]').element as HTMLInputElement).value).toBe('/tmp/LockedProject');
    expect(wrapper.text()).toContain('Workspace is fixed for this run.');
  });

  it('auto-selects temp workspace again when workspace selection resets to empty', async () => {
    workspaceStoreMock.tempWorkspaceId = 'temp-ws';
    workspaceStoreMock.tempWorkspace = { workspaceId: 'temp-ws' };
    workspaceStoreMock.workspaces = {
      'temp-ws': { workspaceId: 'temp-ws', name: 'Temp Workspace' },
      'ws-1': { workspaceId: 'ws-1', name: 'Workspace 1' },
    };

    const wrapper = mount(WorkspaceSelector, {
      props: {
        ...defaultProps,
        workspaceId: 'ws-1',
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    await wrapper.setProps({ workspaceId: null });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('select-existing')).toBeTruthy();
    expect(wrapper.emitted('select-existing')?.[0]).toEqual(['temp-ws']);
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
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    // Browse button should be visible
    const browseButton = wrapper.find('button[title="Browse for folder"]');
    expect(browseButton.exists()).toBe(true);
  });

  it('hides Browse button in mobile runtime even if an Electron folder API is present', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };
    window.history.pushState({}, '', '/mobile/workspace');

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('button[title="Browse for folder"]').exists()).toBe(false);
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
    expect(wrapper.emitted('load-new')).toBeFalsy();
    expect(wrapper.emitted('workspace-input-change')).toContainEqual([
      { mode: 'new', pendingPath: '/selected/folder/path' },
    ]);
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

  it('emits pending workspace input while typing without a Load action', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = false;

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    const input = wrapper.find('input[type="text"]');
    await input.setValue('/test/workspace/path');
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.find('button[title="Load workspace"]').exists()).toBe(false);
    expect(wrapper.emitted('load-new')).toBeFalsy();
    expect(wrapper.emitted('workspace-input-change')).toContainEqual([
      { mode: 'new', pendingPath: '/test/workspace/path' },
    ]);
    expect(wrapper.text()).not.toContain('Path will be loaded when you run');
    expect(wrapper.text()).not.toContain('/test/workspace/path');
  });

  it('does not invoke a hidden preload flow when Enter is pressed in New mode', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    const input = wrapper.find('input[type="text"]');
    await input.setValue('/test/workspace/path');
    await input.trigger('keydown.enter');
    await flushPromises();

    expect(wrapper.emitted('load-new')).toBeFalsy();
    expect(wrapper.emitted('workspace-input-change')).toContainEqual([
      { mode: 'new', pendingPath: '/test/workspace/path' },
    ]);
  });

  it('disables Browse button when isLoading is true', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };

    const wrapper = mount(WorkspaceSelector, {
      props: { ...defaultProps, isLoading: true },
    });
    await wrapper.vm.$nextTick();

    const browseButton = wrapper.find('button[title="Browse for folder"]');
    expect(browseButton.attributes('disabled')).toBeDefined();
  });

  it('disables Browse button when disabled prop is true', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };

    const wrapper = mount(WorkspaceSelector, {
      props: { ...defaultProps, disabled: true },
    });
    await wrapper.vm.$nextTick();

    const browseButton = wrapper.find('button[title="Browse for folder"]');
    expect(browseButton.attributes('disabled')).toBeDefined();
  });

  it('does not show normal New-mode helper text for Electron mode', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = true;
    (window as any).electronAPI = {
      showFolderDialog: vi.fn(),
    };

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Browse for a folder or enter path manually.');
    expect(wrapper.text()).not.toContain('Enter a path, then click Run to load the workspace.');
  });

  it('does not show normal New-mode helper text for browser mode', async () => {
    windowNodeContextStoreMock.isEmbeddedWindow.value = false;

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).not.toContain('Enter a path, then click Run to load the workspace.');
    expect(wrapper.text()).not.toContain('Browse for a folder or enter path manually.');
  });

  it('keeps error feedback visible below the New workspace path field', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: {
        ...defaultProps,
        error: 'Workspace path is invalid',
      },
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Workspace path is invalid');
  });

  it('renders Existing/New as left-aligned equal-width segments with centered content and strong selected state', async () => {
    workspaceStoreMock.tempWorkspaceId = 'temp-ws';
    workspaceStoreMock.tempWorkspace = { workspaceId: 'temp-ws' };
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'temp-ws', name: 'Temp Workspace', absolutePath: '/tmp/default' },
    ];

    const wrapper = mount(WorkspaceSelector, {
      props: {
        ...defaultProps,
        workspaceId: 'temp-ws',
      },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    const wrapperEl = wrapper.get('[data-test="workspace-mode-toggle-wrapper"]');
    const tablist = wrapper.get('[role="tablist"]');
    const tabs = wrapper.findAll('[role="tab"]');
    const existingTab = tabs.find((tab) => tab.text().includes('Existing'));
    const newTab = tabs.find((tab) => tab.text().includes('New'));

    expect(wrapperEl.classes()).toContain('flex');
    expect(wrapperEl.classes()).toContain('justify-start');
    expect(tablist.classes()).toContain('inline-flex');
    expect(tablist.classes()).toContain('rounded-full');
    expect(existingTab?.classes()).toContain('w-28');
    expect(existingTab?.classes()).toContain('relative');
    expect(existingTab?.classes()).toContain('items-center');
    expect(existingTab?.classes()).toContain('justify-center');
    expect(existingTab?.classes()).toContain('text-center');
    expect(newTab?.classes()).toContain('w-28');
    expect(newTab?.classes()).toContain('relative');
    expect(newTab?.classes()).toContain('items-center');
    expect(newTab?.classes()).toContain('justify-center');
    expect(newTab?.classes()).toContain('text-center');
    expect(wrapper.get('[data-test="workspace-mode-label-existing"]').classes()).toEqual(expect.arrayContaining(['block', 'w-full', 'text-center', 'leading-5']));
    expect(wrapper.get('[data-test="workspace-mode-label-new"]').classes()).toEqual(expect.arrayContaining(['block', 'w-full', 'text-center', 'leading-5']));
    expect(existingTab?.find('.i-heroicons-folder-open-20-solid').classes()).toEqual(expect.arrayContaining(['absolute', 'left-3', 'top-1/2', '-translate-y-1/2']));
    expect(newTab?.find('.i-heroicons-plus-circle-20-solid').classes()).toEqual(expect.arrayContaining(['absolute', 'left-3', 'top-1/2', '-translate-y-1/2']));
    expect(existingTab?.classes()).toContain('bg-blue-700');
    expect(existingTab?.classes()).toContain('text-white');
    expect(wrapper.text()).not.toContain('Workspace: Temp Workspace');
  });
});
