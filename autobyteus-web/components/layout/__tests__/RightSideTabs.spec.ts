import { describe, expect, it, vi } from 'vitest';
import { shallowMount } from '@vue/test-utils';

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
  const { ref } = await import('vue');
  return {
    useRightSideTabs: () => ({
      activeTab: ref('progress'),
      visibleTabs: ref([{ name: 'progress', label: 'Activity' }]),
      setActiveTab: vi.fn(),
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
    hasAwaitingApproval: () => false,
    getHighlightedActivityId: () => null,
  }),
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    activeWorkspace: null,
  }),
}));

import RightSideTabs from '../RightSideTabs.vue';

describe('RightSideTabs', () => {
  it('keeps the shared tab shell clipped instead of scrollable', () => {
    const wrapper = shallowMount(RightSideTabs, {
      global: {
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

    const shell = wrapper.get('[data-test="right-side-tab-content-shell"]');
    expect(shell.classes()).toContain('overflow-hidden');
    expect(shell.classes()).not.toContain('overflow-auto');
  });
});
