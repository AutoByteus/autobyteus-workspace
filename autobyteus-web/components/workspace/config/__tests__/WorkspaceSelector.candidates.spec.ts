import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import WorkspaceSelector from '../WorkspaceSelector.vue';

vi.mock('~/components/common/SearchableSelect.vue', () => ({
  default: {
    name: 'SearchableSelect',
    template: '<div class="searchable-select-stub"></div>',
    props: ['modelValue', 'options', 'disabled', 'placeholder'],
    emits: ['update:model-value'],
  },
}));

const flushPromises = async () => {
  await Promise.resolve();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
};

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

const TEMP = { workspaceId: 'temp_ws_default', name: 'temp', absolutePath: '/tmp/default', isTemp: true };
const PROTOTYPE = { workspaceId: 'agent_ws_b2', name: 'autobyteus-web-prototype', absolutePath: '/work/autobyteus-web-prototype' };
const MARKETING = { workspaceId: 'agent_ws_c3', name: 'autobyteus-marketing', absolutePath: '/work/autobyteus-marketing' };

const editableModel = (mode: 'existing' | 'new' = 'existing') => ({
  mode: 'editable' as const,
  selection: { mode, existingWorkspaceId: null, newWorkspacePath: '' },
  isLoading: false,
  error: null,
});

describe('WorkspaceSelector candidateWorkspaceIds', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    workspaceStoreMock.tempWorkspaceId = TEMP.workspaceId;
    workspaceStoreMock.tempWorkspace = TEMP;
    workspaceStoreMock.workspaces = {
      [TEMP.workspaceId]: TEMP,
      [PROTOTYPE.workspaceId]: PROTOTYPE,
      [MARKETING.workspaceId]: MARKETING,
    };
    workspaceStoreMock.allWorkspaces = [TEMP, PROTOTYPE, MARKETING];
    workspaceStoreMock.fetchAllWorkspaces = vi.fn().mockResolvedValue([]);
  });

  it('lists only the supplied ids in the given order, with no temp entry and no auto-selection', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: {
        model: editableModel(),
        autoSelectDefault: false,
        candidateWorkspaceIds: [MARKETING.workspaceId, PROTOTYPE.workspaceId, 'agent_ws_unknown'],
      },
    });
    await flushPromises();

    const options = wrapper.findComponent({ name: 'SearchableSelect' }).props('options');
    expect(options).toEqual([
      { id: MARKETING.workspaceId, name: MARKETING.name, description: MARKETING.absolutePath },
      { id: PROTOTYPE.workspaceId, name: PROTOTYPE.name, description: PROTOTYPE.absolutePath },
    ]);
    expect(wrapper.emitted('update:modelValue')).toBeUndefined();
  });

  it('never auto-selects the temp workspace when candidates are supplied, even with autoSelectDefault left on', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: {
        model: editableModel(),
        candidateWorkspaceIds: [PROTOTYPE.workspaceId],
      },
    });
    await flushPromises();

    const emitted = wrapper.emitted('update:modelValue') ?? [];
    expect(emitted.some(([selection]: any[]) => selection.existingWorkspaceId === TEMP.workspaceId)).toBe(false);
  });

  it('shows the switch-to-New helper when the candidate list is empty', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: {
        model: editableModel(),
        autoSelectDefault: false,
        candidateWorkspaceIds: [],
      },
    });
    await flushPromises();

    const existingTab = wrapper.findAll('[role="tab"]')[0]!;
    expect(existingTab.attributes('disabled')).toBeDefined();
  });

  it('keeps the existing run-configuration behavior when the prop is absent', async () => {
    const wrapper = mount(WorkspaceSelector, {
      props: { model: editableModel() },
    });
    await flushPromises();

    const options = wrapper.findComponent({ name: 'SearchableSelect' }).props('options');
    expect(options.map((option: { id: string }) => option.id)).toEqual([
      TEMP.workspaceId,
      PROTOTYPE.workspaceId,
      MARKETING.workspaceId,
    ]);
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([
      { mode: 'existing', existingWorkspaceId: TEMP.workspaceId, newWorkspacePath: '' },
    ]);
  });
});
