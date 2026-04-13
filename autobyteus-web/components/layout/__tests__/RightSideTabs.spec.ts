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
    getOpenFiles: () => [],
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
    activeWorkspace: null,
  }),
}));

import RightSideTabs from '../RightSideTabs.vue';

describe('RightSideTabs', () => {
  beforeEach(() => {
    setActiveTab.mockReset();
    activeTab.value = 'progress';
    latestVisibleArtifactSignal.value = null;
  });

  const mountSubject = () => shallowMount(RightSideTabs, {
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        TabList: { template: '<div class="tab-list-stub" />' },
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

  it('switches to Artifacts when a touched file becomes newly visible', async () => {
    mountSubject();
    setActiveTab.mockClear();

    latestVisibleArtifactSignal.value = 'run-1:src/test.md:1';
    await nextTick();

    expect(setActiveTab).toHaveBeenCalledWith('artifacts');
  });

  it('does not reswitch when the artifacts tab is already active', async () => {
    activeTab.value = 'artifacts';
    mountSubject();
    setActiveTab.mockClear();

    latestVisibleArtifactSignal.value = 'run-1:src/test.md:1';
    await nextTick();

    expect(setActiveTab).not.toHaveBeenCalled();
  });
});
