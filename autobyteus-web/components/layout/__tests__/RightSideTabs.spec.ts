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
const activeWorkspaceTarget = ref<any>(null);

vi.mock('~/stores/activeContextStore', () => ({
  useActiveContextStore: () => ({
    activeAgentContext: { state: { runId: 'run-1' } },
    activeConfig: null,
    get activeWorkspaceTarget() { return activeWorkspaceTarget.value; },
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
    activeWorkspaceTarget.value = null;
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
        CollaborationOverviewPanel: {
          name: 'CollaborationOverviewPanel',
          props: ['messages', 'tasks'],
          template: '<div class="collaboration-overview-stub" />',
        },
        TerminalPanel: {
          name: 'TerminalPanel',
          props: ['active'],
          template: '<div class="terminal-panel-stub" />',
        },
        VncViewer: { template: '<div class="vnc-stub" />' },
        FileExplorerLayout: {
          name: 'FileExplorerLayout',
          props: ['active', 'layout'],
          template: '<div class="file-layout-stub" />',
        },
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

  it('preserves personal tab styling defaults without custom overflow chrome', () => {
    const wrapper = mountSubject();

    const tabList = wrapper.getComponent({ name: 'TabList' });
    expect(tabList.props('density')).toBeUndefined();
    expect(tabList.props('showOverflowAffordances')).toBeUndefined();
    expect(tabList.props('previousLabel')).toBeUndefined();
    expect(tabList.props('nextLabel')).toBeUndefined();
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

  it('uses stacked file explorer layout in drawer mode', () => {
    activeTab.value = 'files';
    visibleTabs.value = [
      { name: 'files', label: 'Files' },
      { name: 'terminal', label: 'Terminal' },
    ];

    const wrapper = mountSubject({ mode: 'drawer' });

    const fileLayout = wrapper.getComponent({ name: 'FileExplorerLayout' });
    expect(fileLayout.props('active')).toBe(true);
    expect(fileLayout.props('layout')).toBe('stacked');
  });

  it('mounts the root-neutral Messages overview for a direct AgentOrg Agent', () => {
    const messages = { rootKind: 'agent_org', rootRunId: 'org-run' };
    activeWorkspaceTarget.value = {
      kind: 'agent_org_direct_agent',
      collaborationMessages: messages,
      collaborationTasks: { rootKind: 'agent_org', rootRunId: 'org-run', focusedAgentRunId: 'direct' },
      context: { config: { workspaceId: null, workspaceMetadata: null } },
    };
    activeTab.value = 'teamMembers';
    visibleTabs.value = [{ name: 'teamMembers', label: 'Org', ariaLabel: 'Agent Org' }];

    const wrapper = mountSubject();

    const overview = wrapper.getComponent({ name: 'CollaborationOverviewPanel' });
    expect(overview.props('messages')).toStrictEqual(messages);
    expect(overview.props('tasks')).toMatchObject({ rootKind: 'agent_org', focusedAgentRunId: 'direct' });
  });

  it('tracks the compound collaboration root when Team and AgentOrg run IDs collide', async () => {
    activeWorkspaceTarget.value = {
      kind: 'standalone_team_member',
      collaborationMessages: { rootKind: 'agent_team', rootRunId: 'shared-run-id' },
      team: {},
      context: { config: { workspaceId: null, workspaceMetadata: null } },
    };
    const wrapper = mountSubject();
    setActiveTab.mockClear();

    activeWorkspaceTarget.value = {
      kind: 'agent_org_direct_agent',
      collaborationMessages: { rootKind: 'agent_org', rootRunId: 'shared-run-id' },
      context: { config: { workspaceId: null, workspaceMetadata: null } },
    };
    await nextTick();

    expect(setActiveTab).toHaveBeenCalledWith('teamMembers');
    wrapper.unmount();
  });

  it('hides the docked-panel toggle in drawer mode', () => {
    const wrapper = mountSubject({ mode: 'drawer' });

    expect(wrapper.find('[data-test="right-side-panel-toggle"]').exists()).toBe(false);
  });

  it('keeps Files lazy before first selection even when Terminal is selected first', () => {
    activeTab.value = 'terminal';
    visibleTabs.value = [
      { name: 'files', label: 'Files' },
      { name: 'terminal', label: 'Terminal' },
      { name: 'progress', label: 'Activity' },
    ];

    const wrapper = mountSubject();

    expect(wrapper.find('.terminal-panel-stub').exists()).toBe(true);
    expect(wrapper.find('.file-layout-stub').exists()).toBe(false);
  });

  it('keeps TerminalPanel lazy until first selection and cached inactive after tab switch', async () => {
    activeTab.value = 'progress';
    visibleTabs.value = [
      { name: 'files', label: 'Files' },
      { name: 'terminal', label: 'Terminal' },
      { name: 'progress', label: 'Activity' },
    ];
    const wrapper = mountSubject();

    expect(wrapper.find('.terminal-panel-stub').exists()).toBe(false);

    activeTab.value = 'terminal';
    await nextTick();

    let terminalPanel = wrapper.getComponent({ name: 'TerminalPanel' });
    expect(terminalPanel.props('active')).toBe(true);
    expect(wrapper.get('[data-test="right-side-terminal-panel"]').attributes('style')).toBeUndefined();

    activeTab.value = 'progress';
    await nextTick();

    terminalPanel = wrapper.getComponent({ name: 'TerminalPanel' });
    expect(terminalPanel.props('active')).toBe(false);
    expect(wrapper.find('.terminal-panel-stub').exists()).toBe(true);
    expect(wrapper.get('[data-test="right-side-terminal-panel"]').attributes('style')).toContain('display: none');
  });

  it('caches Files after first use and marks it inactive when switching to Terminal', async () => {
    activeTab.value = 'files';
    visibleTabs.value = [
      { name: 'files', label: 'Files' },
      { name: 'terminal', label: 'Terminal' },
      { name: 'progress', label: 'Activity' },
    ];
    const wrapper = mountSubject();

    let fileLayout = wrapper.getComponent({ name: 'FileExplorerLayout' });
    expect(fileLayout.props('active')).toBe(true);
    expect(fileLayout.props('layout')).toBe('split');

    activeTab.value = 'terminal';
    await nextTick();

    expect(wrapper.find('.terminal-panel-stub').exists()).toBe(true);
    fileLayout = wrapper.getComponent({ name: 'FileExplorerLayout' });
    expect(fileLayout.props('active')).toBe(false);
    expect(wrapper.find('.file-layout-stub').exists()).toBe(true);
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
