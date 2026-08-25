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
    modelValue: {
      mode: 'new' as const,
      existingWorkspaceId: null,
      newWorkspacePath: '',
    },
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

  it('renders only the controlled selection and emits complete raw replacement values', async () => {
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
        modelValue: {
          mode: 'existing',
          existingWorkspaceId: 'temp-ws',
          newWorkspacePath: '/workspace/inactive-buffer',
        },
      },
    });
    await flushPromises();

    const tabs = wrapper.findAll('[role="tab"]');
    expect(tabs[0].attributes('aria-selected')).toBe('true');
    expect(tabs[1].attributes('aria-selected')).toBe('false');

    await tabs[1].trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{
      mode: 'new',
      existingWorkspaceId: 'temp-ws',
      newWorkspacePath: '/workspace/inactive-buffer',
    }]);
    expect(wrapper.find('input[type="text"]').exists()).toBe(false);

    await wrapper.setProps({
      modelValue: {
        mode: 'new',
        existingWorkspaceId: 'temp-ws',
        newWorkspacePath: '/workspace/inactive-buffer',
      },
    });
    expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-selected')).toBe('true');

    await wrapper.get('input[type="text"]').setValue('  /workspace/raw-path  ');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{
      mode: 'new',
      existingWorkspaceId: 'temp-ws',
      newWorkspacePath: '  /workspace/raw-path  ',
    }]);
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

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([{
      mode: 'existing',
      existingWorkspaceId: 'temp-ws',
      newWorkspacePath: '',
    }]);
  });

  it('does not overwrite an explicit New choice when the initial workspace fetch resolves late', async () => {
    let resolveFetch!: () => void;
    workspaceStoreMock.fetchAllWorkspaces = vi.fn(() => new Promise<void>((resolve) => {
      resolveFetch = resolve;
    }));

    const wrapper = mount(WorkspaceSelector, {
      props: defaultProps,
    });
    await wrapper.vm.$nextTick();
    expect(workspaceStoreMock.fetchAllWorkspaces).toHaveBeenCalledTimes(1);

    await wrapper.get('[role="tab"][aria-selected="true"]').trigger('click');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{
      mode: 'new',
      existingWorkspaceId: null,
      newWorkspacePath: '',
    }]);

    workspaceStoreMock.tempWorkspaceId = 'temp-ws';
    workspaceStoreMock.tempWorkspace = { workspaceId: 'temp-ws' };
    workspaceStoreMock.workspaces = {
      'temp-ws': { workspaceId: 'temp-ws', name: 'Temp Workspace' },
    };
    workspaceStoreMock.allWorkspaces = [
      { workspaceId: 'temp-ws', name: 'Temp Workspace', absolutePath: '/tmp/default' },
    ];
    resolveFetch();
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('New');
    expect(wrapper.find('input[type="text"]').exists()).toBe(true);
    expect(wrapper.emitted('update:modelValue')).toEqual([[
      {
        mode: 'new',
        existingWorkspaceId: null,
        newWorkspacePath: '',
      },
    ]]);
  });

  it('does not create nested-scope intent when default auto-selection is disabled', async () => {
    workspaceStoreMock.tempWorkspaceId = 'temp-ws';
    workspaceStoreMock.tempWorkspace = { workspaceId: 'temp-ws' };
    workspaceStoreMock.workspaces = {
      'temp-ws': { workspaceId: 'temp-ws', name: 'Temp Workspace' },
    };

    const wrapper = mount(WorkspaceSelector, {
      props: { ...defaultProps, autoSelectDefault: false },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('select-existing')).toBeFalsy();
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
        modelValue: {
          mode: 'new',
          existingWorkspaceId: 'agent_ws_metadata',
          newWorkspacePath: '/tmp/ProjectA',
        },
        disabled: true,
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(workspaceStoreMock.fetchAllWorkspaces).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
    const input = wrapper.find('input[type="text"]');
    expect(input.exists()).toBe(true);
    expect((input.element as HTMLInputElement).value).toBe('/tmp/ProjectA');
    expect(input.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Workspace: /tmp/ProjectA');
  });

  it('does not fetch workspaces or emit selection in locked display mode', async () => {
    workspaceStoreMock.tempWorkspaceId = 'temp-ws';
    workspaceStoreMock.tempWorkspace = { workspaceId: 'temp-ws' };

    const wrapper = mount(WorkspaceSelector, {
      props: {
        ...defaultProps,
        modelValue: {
          mode: 'new',
          existingWorkspaceId: 'agent_ws_locked_reference',
          newWorkspacePath: '/tmp/LockedProject',
        },
        workspaceLocked: true,
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(workspaceStoreMock.fetchAllWorkspaces).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
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
        modelValue: {
          mode: 'existing',
          existingWorkspaceId: 'ws-1',
          newWorkspacePath: '',
        },
      },
    });

    await flushPromises();
    await wrapper.vm.$nextTick();

    await wrapper.setProps({
      modelValue: {
        mode: 'new',
        existingWorkspaceId: null,
        newWorkspacePath: '',
      },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([{
      mode: 'existing',
      existingWorkspaceId: 'temp-ws',
      newWorkspacePath: '',
    }]);
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
    expect(wrapper.emitted('update:modelValue')).toContainEqual([
      { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/selected/folder/path' },
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
    expect(wrapper.emitted('update:modelValue')).toContainEqual([
      { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/test/workspace/path' },
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
    expect(wrapper.emitted('update:modelValue')).toContainEqual([
      { mode: 'new', existingWorkspaceId: null, newWorkspacePath: '/test/workspace/path' },
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

  it('shows an exact stored Existing workspace without consulting current inventory', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: {
        ...defaultProps,
        disabled: true,
        modelValue: {
          mode: 'existing',
          existingWorkspaceId: 'historical-workspace-id',
          newWorkspacePath: '/history/root',
        },
        storedWorkspace: {
          workspaceId: 'historical-workspace-id',
          displayName: 'Saved Root Workspace',
          rootPath: '/history/root',
          availability: 'available',
        },
      },
    });
    await flushPromises();

    const storedControl = wrapper.findComponent({ name: 'SearchableSelect' });
    expect(wrapper.get('[data-test="stored-workspace-value"]').exists()).toBe(true);
    expect(storedControl.props('modelValue')).toBe('historical-workspace-id');
    expect(storedControl.props('disabled')).toBe(true);
    expect(storedControl.props('options')).toContainEqual({
      id: 'historical-workspace-id',
      name: 'Saved Root Workspace',
      description: '/history/root',
    });
    expect(wrapper.find('[data-test="stored-workspace-unavailable"]').exists()).toBe(false);
    expect(workspaceStoreMock.fetchAllWorkspaces).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('keeps a historical-only stored path visible in the disabled normal field region', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: {
        ...defaultProps,
        disabled: true,
        modelValue: {
          mode: 'new',
          existingWorkspaceId: null,
          newWorkspacePath: '/history/removed-workspace',
        },
        storedWorkspace: {
          workspaceId: null,
          displayName: '/history/removed-workspace',
          rootPath: '/history/removed-workspace',
          availability: 'historical-only',
        },
        historicalValueUnavailableMessage: 'Saved value is no longer available.',
      },
    });
    await flushPromises();

    expect((wrapper.get('input[type="text"]').element as HTMLInputElement).value)
      .toBe('/history/removed-workspace');
    expect(wrapper.get('input[type="text"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('[data-test="stored-workspace-unavailable"]').text())
      .toBe('Saved value is no longer available.');
    expect(workspaceStoreMock.fetchAllWorkspaces).not.toHaveBeenCalled();
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });
});
