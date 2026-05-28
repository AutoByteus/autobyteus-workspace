import { nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';

const setActiveTab = vi.fn();
const activeTab = ref('progress');
const visibleTabs = ref([
  { name: 'files', label: 'Files' },
  { name: 'progress', label: 'Activity' },
  { name: 'artifacts', label: 'Artifacts' },
]);
const latestVisibleArtifactSignal = ref<string | null>(null);
const openFilesForActiveWorkspace = ref<string[]>([]);
const activeWorkspaceForTabs = ref<{ workspaceId: string } | null>(null);

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({
    activeAgentContext: { state: { runId: 'run-1' } },
    activeConfig: null,
  }),
}));

vi.mock('~/stores/agentTodoStore', () => ({
  useAgentTodoStore: () => ({
    getTodos: () => [],
  }),
}));

vi.mock('~/stores/fileExplorer', () => ({
  useFileExplorerStore: () => ({
    getOpenFiles: () => openFilesForActiveWorkspace.value,
  }),
}));

vi.mock('~/composables/useRightPanel', () => ({
  useRightPanel: () => ({
    toggleRightPanel: vi.fn(),
  }),
}));

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => ({
    activeTab,
    visibleTabs,
    setActiveTab,
  }),
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    selectedType: 'agent',
  }),
}));

vi.mock('~/stores/runFileChangesStore', () => ({
  useRunFileChangesStore: () => ({
    getLatestVisibleArtifactSignalForRun: () => latestVisibleArtifactSignal.value,
  }),
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    activeWorkspace: activeWorkspaceForTabs.value,
  }),
}));

import RightSideTabs from '../RightSideTabs.vue';

describe('RightSideTabs', () => {
  beforeEach(() => {
    setActiveTab.mockReset();
    activeTab.value = 'progress';
    visibleTabs.value = [
      { name: 'files', label: 'Files' },
      { name: 'progress', label: 'Activity' },
      { name: 'artifacts', label: 'Artifacts' },
    ];
    latestVisibleArtifactSignal.value = null;
    openFilesForActiveWorkspace.value = [];
    activeWorkspaceForTabs.value = null;
  });

  const mountSubject = (props: Record<string, unknown> = {}) => shallowMount(RightSideTabs, {
    props,
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        TabList: {
          name: 'TabList',
          props: ['tabs', 'selectedTab'],
          template: '<div class="tab-list-stub" />',
        },
        TeamOverviewPanel: { template: '<div class="team-overview-stub" />' },
        Terminal: { template: '<div class="terminal-stub" />' },
        VncViewer: { template: '<div class="vnc-stub" />' },
        FileExplorerLayout: { template: '<div class="file-layout-stub" />' },
        ArtifactsTab: { template: '<div class="artifacts-stub" />' },
        BrowserPanel: { template: '<div class="browser-panel-stub" />' },
        ProgressPanel: { template: '<div class="progress-stub" />' },
      },
    },
  });

  it('keeps the shared tab shell clipped instead of scrollable', () => {
    const wrapper = mountSubject();

    const shell = wrapper.get('[data-test="right-side-tab-content-shell"]');
    expect(shell.classes()).toContain('overflow-hidden');
    expect(shell.classes()).not.toContain('overflow-auto');
  });

  it('does not switch to Artifacts when a touched file becomes newly visible', async () => {
    mountSubject();
    setActiveTab.mockClear();

    latestVisibleArtifactSignal.value = 'run-1:src/test.md:1';
    await nextTick();

    expect(setActiveTab).not.toHaveBeenCalledWith('artifacts');
    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it('does not let repeated artifact signals steal focus from the current tab', async () => {
    activeTab.value = 'terminal';
    mountSubject();
    setActiveTab.mockClear();

    latestVisibleArtifactSignal.value = 'run-1:src/test.md:1';
    await nextTick();
    latestVisibleArtifactSignal.value = 'run-1:src/other.md:2';
    await nextTick();

    expect(setActiveTab).not.toHaveBeenCalled();
  });

  it('filters the Files tab and blocks FileExplorerLayout in mobile tools mode', () => {
    activeTab.value = 'files';

    const wrapper = mountSubject({ mode: 'mobile-tools' });

    const tabList = wrapper.getComponent({ name: 'TabList' });
    expect(tabList.props('tabs')).toEqual([
      { name: 'progress', label: 'Activity' },
      { name: 'artifacts', label: 'Artifacts' },
    ]);
    expect(wrapper.find('.file-layout-stub').exists()).toBe(false);
  });

  it('auto-switches to Files when an open file appears in desktop mode', async () => {
    activeTab.value = 'progress';
    activeWorkspaceForTabs.value = { workspaceId: 'ws-1' };
    const wrapper = mountSubject();
    setActiveTab.mockClear();

    openFilesForActiveWorkspace.value = ['src/example.ts'];
    await nextTick();

    expect(setActiveTab).toHaveBeenCalledWith('files');
    wrapper.unmount();
  });

  it('does not auto-switch to Files when open files change in mobile tools mode', async () => {
    activeTab.value = 'progress';
    activeWorkspaceForTabs.value = { workspaceId: 'ws-1' };
    const wrapper = mountSubject({ mode: 'mobile-tools' });
    setActiveTab.mockClear();

    openFilesForActiveWorkspace.value = ['src/example.ts'];
    await nextTick();

    expect(setActiveTab).not.toHaveBeenCalledWith('files');
    wrapper.unmount();
  });
});
