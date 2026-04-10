import { nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';

const setActiveTab = vi.fn();
const activeTab = ref('progress');
const visibleTabs = ref([
  { name: 'files', label: 'Files' },
  { name: 'progress', label: 'Activity' },
]);
const hasAwaitingApproval = ref(false);
const highlightedActivityId = ref<string | null>(null);

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

vi.mock('~/composables/useRightSideTabs', async () => {
  return {
    useRightSideTabs: () => ({
      activeTab,
      visibleTabs,
      setActiveTab,
    }),
  };
});

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => ({
    selectedType: 'agent',
  }),
}));

vi.mock('~/stores/agentArtifactsStore', () => ({
  useAgentArtifactsStore: () => ({
    getLatestVisibleArtifactSignalForRun: () => null,
  }),
}));

vi.mock('~/stores/runFileChangesStore', () => ({
  useRunFileChangesStore: () => ({
    getLatestVisibleArtifactSignalForRun: () => null,
  }),
}));

vi.mock('~/stores/agentActivityStore', () => ({
  useAgentActivityStore: () => ({
    hasAwaitingApproval: () => hasAwaitingApproval.value,
    getHighlightedActivityId: () => highlightedActivityId.value,
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
    hasAwaitingApproval.value = false;
    highlightedActivityId.value = null;
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

  it('does not auto-switch to Activity when runtime approval state changes', async () => {
    const wrapper = mountSubject();
    setActiveTab.mockClear();
    activeTab.value = 'files';

    hasAwaitingApproval.value = true;
    await nextTick();

    expect(setActiveTab).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('does not auto-switch to Activity when runtime highlighting changes', async () => {
    const wrapper = mountSubject();
    setActiveTab.mockClear();
    activeTab.value = 'files';

    highlightedActivityId.value = 'tool-1';
    await nextTick();

    expect(setActiveTab).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
