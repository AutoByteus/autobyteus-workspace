import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, getActivePinia, setActivePinia } from 'pinia';
import { computed, defineComponent, h, nextTick, ref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture';

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn(), route: null as any }));
vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal<typeof import('vue-router')>();
  const { reactive } = await import('vue');
  io.route = reactive({ path: '/workspace', query: {} });
  const navigate = async (location: any) => { Object.assign(io.route, location); };
  return { ...actual, useRoute: () => io.route, useRouter: () => ({ push: navigate, replace: navigate }) };
});
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }));
vi.mock('~/services/agentOrgExecution/agentOrgReferenceProjection', () => ({
  loadAgentOrgImmediateReferenceProjection: vi.fn().mockResolvedValue({ agents: {}, teams: {} }),
}));

import WorkspaceToolShell from '../WorkspaceToolShell.vue';
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue';
import { useWorkspaceToolReveal, type WorkspaceToolReveal } from '~/composables/layout/useWorkspaceToolReveal';
import { RESPONSIVE_WORKSPACE_SHELL_KEY } from '~/composables/layout/useResponsiveWorkspaceShell';
import { resolveResponsiveWorkspaceShellState } from '~/utils/layout/responsiveLayoutPolicy';
import { useRightPanel } from '~/composables/useRightPanel';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useEventMonitorFilePreview } from '~/composables/useEventMonitorFilePreview';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceHistorySubjectActions } from '~/composables/useWorkspaceHistorySubjectActions';

const wrappers: ReturnType<typeof mount>[] = [];
const previousBridge = window.electronAPI;
const flush = async () => { await flushPromises(); await nextTick(); await new Promise(resolve => setTimeout(resolve, 0)); };
const metadata = (id: string) => ({ workspaceId: id, workspaceRootPath: `/workspace/${id}`, displayName: id, kind: 'filesystem' as const });
let sequence = 0;
beforeEach(() => {
  setActivePinia(createPinia()); io.query.mockReset(); io.mutate.mockReset(); io.route.query = {};
  vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true);
  const right = useRightPanel();
  right.setRightPanelVisible(true); right.setRightPanelWorkspaceWidth(null);
  right.preferredRightPanelWidth.value = 450; right.rightPanelResizeIntent.value = 'automatic';
});
afterEach(async () => {
  wrappers.splice(0).forEach(wrapper => wrapper.unmount()); await flush();
  window.electronAPI = previousBridge; vi.restoreAllMocks();
});

// Real selected-context hydration and Files ownership. Only external GraphQL/tree/editor/native
// I/O is controlled; shell, responsive resolver, tabs lifecycle, drawer and content/error DOM are real.
const setupSelectedB = async () => {
  const pinia = getActivePinia()!;
  const workspace = useWorkspaceStore(), files = useFileExplorerStore();
  workspace.workspaces.A = { workspaceId: 'A', name: 'A', absolutePath: '/workspace/A', workspaceConfig: {} };
  workspace.cacheWorkspaceMetadata(metadata('A'));
  const draft = useAgentRunConfigStore();
  draft.setTemplate({ id: 'draft-A', name: 'Retained A' } as any);
  draft.setWorkspaceLoaded('A', '/workspace/A', metadata('A'));
  const view = JSON.parse(JSON.stringify(taskBearingView()));
  const orgRunId = `shell-org-${++sequence}`;
  view.is_active = false; view.agent_statuses = [];
  view.execution_tree.rootOrg.orgRunId = orgRunId; view.communication_messages.orgRunId = orgRunId;
  view.execution_tree.rootOrg.members[2].members.forEach((agent: any) => { agent.launchConfiguration.workspaceRootPath = '/workspace/B'; });
  io.query.mockImplementation(async ({ query, variables }: any) => {
    const op = query.definitions.find((entry: any) => entry.kind === 'OperationDefinition')?.name?.value;
    if (op === 'GetWorkspaceMetadata') throw new Error('initial projection unavailable');
    if (variables.agentRunId) return { data: { getAgentOrgMemberRunProjection: { ...variables, conversation: [], activities: [], hasEarlierActiveTraceEvents: false } } };
    return { data: { getAgentOrgRunInspection: { root_subject_kind: 'agent_org', root_run_id: orgRunId, root_org: view } } };
  });
  useRunHistoryStore().agentOrgHistory = [{ rootRunId: orgRunId, executionTree: view.execution_tree, closedTaskExecutions: [] }] as any;
  await useWorkspaceHistorySubjectActions().execute({ rootSubjectKind: 'agent_org', rootRunId: orgRunId, action: 'select', memberAddress: '/team/lead' });
  const active = useActiveContextStore(), target = active.activeWorkspaceTarget!;
  expect(target.context.config.workspaceId).toBeNull(); expect(target.context.config.workspaceMetadata).toBeNull();
  vi.spyOn(workspace, 'resolveWorkspaceMetadataByRootPath').mockResolvedValue(metadata('B'));
  vi.spyOn(workspace, 'acquireFileExplorerLiveSession').mockReturnValue(() => undefined);
  vi.spyOn(workspace, 'ensureWorkspaceMetadata').mockReturnValue(new Promise(() => {}));
  const bridge = vi.fn(async (path: string) => ({ success: true, content: `selected B bytes: ${path}` }));
  window.electronAPI = { ...previousBridge, readLocalTextFile: bridge };
  return { pinia, workspace, files, draft, active, target, bridge };
};

const mountShell = (pinia: any, width: number, height: number) => {
  const viewport = ref({ width, height });
  const right = useRightPanel();
  const policy = computed(() => resolveResponsiveWorkspaceShellState({
    viewportWidth: viewport.value.width, viewportHeight: viewport.value.height,
    leftPanelPreference: 'visible', leftPanelPreferredWidth: 320,
    rightPanelPreference: right.isRightPanelVisible.value ? 'visible' : 'hidden-by-user',
    rightPanelPreferredWidth: right.rightPanelWidth.value, rightPanelResizeIntent: right.rightPanelResizeIntent.value,
  }));
  let reveal!: WorkspaceToolReveal;
  const result = ref('');
  let path = '/workspace/B/brief.md';
  const Consumer = defineComponent({ setup() {
    reveal = useWorkspaceToolReveal()!; // same setup-captured capability as the real monitor
    const activate = async () => {
      result.value = (await useEventMonitorFilePreview({ revealTool: reveal, isOriginCurrent: () => true }).openPath({
        id: path, rawCandidate: path, normalizedCandidate: path, sourceKind: 'prose', displayLabel: path, previewType: 'Text',
      })).status;
    };
    return () => h('button', { 'data-test': 'file-origin', onClick: activate }, 'Open selected file');
  } });
  const errors: unknown[] = [];
  const wrapper = mount(WorkspaceToolShell, {
    attachTo: document.body, slots: { default: Consumer }, global: {
      plugins: [pinia], provide: { [RESPONSIVE_WORKSPACE_SHELL_KEY as symbol]: policy },
      config: { errorHandler: error => errors.push(error) },
      stubs: {
        FileViewer: { props: ['file', 'readOnly'], template: '<article data-test="rendered-file" :data-read-only="readOnly">{{ file.content }}</article>' },
        ProgressPanel: true, TerminalPanel: true, BrowserPanel: true, VncViewer: true, ArtifactsTab: true, CollaborationOverviewPanel: true,
      },
    },
  });
  wrappers.push(wrapper); setActivePinia(pinia);
  return { wrapper, viewport, policy, right, result, errors, reveal: () => reveal, setPath: (value: string) => { path = value; } };
};

for (const [label, width, height, hidden, expected] of [
  ['ordinary first host', 992, 700, false, 'drawer'],
  ['narrow', 650, 700, false, 'drawer'],
  ['short height', 1440, 450, false, 'drawer'],
  ['wide visible dock', 1600, 900, false, 'dock'],
  ['wide user-hidden redocks', 1600, 900, true, 'dock'],
] as const) {
  it(`one activation visibly reveals selected B read-only: ${label}`, async () => {
    const selected = await setupSelectedB();
    if (hidden) useRightPanel().setRightPanelVisible(false);
    useRightSideTabs().setActiveTab('progress');
    const shell = mountShell(selected.pinia, width, height); await flush(); setActivePinia(selected.pinia);
    if (expected === 'drawer' || hidden) expect(shell.wrapper.find('#contentViewer').exists()).toBe(false);
    const conversation = selected.target.context.conversation;
    const origin = shell.wrapper.get('[data-test="file-origin"]'); (origin.element as HTMLElement).focus();
    await origin.trigger('click'); await flush();
    expect(shell.result.value).toBe('opened');
    expect(shell.wrapper.get('#contentViewer').isVisible()).toBe(true);
    expect(shell.wrapper.get('[data-test="rendered-file"]').text()).toBe('selected B bytes: /workspace/B/brief.md');
    expect(shell.wrapper.get('[data-test="rendered-file"]').attributes('data-read-only')).toBe('true');
    expect(shell.wrapper.getComponent(FileExplorerTabs).props('workspaceId')).toBe('B');
    expect(shell.wrapper.find('[data-test="workspace-right-tool-drawer"]').exists()).toBe(expected === 'drawer');
    expect(shell.wrapper.find('[data-test="workspace-right-panel"]').exists()).toBe(expected === 'dock');
    expect(document.activeElement).toBe(shell.wrapper.get('[data-event-monitor-active-file-tab="true"]').element);
    expect(selected.draft.config?.workspaceId).toBe('A'); expect(selected.workspace.activeWorkspace?.workspaceId).toBe('A');
    expect(selected.active.activeWorkspaceTarget?.context).toBe(selected.target.context);
    expect(selected.target.context.conversation).toBe(conversation);
    // Repeated requests are idempotent, never a toggle or duplicate read/tab.
    expect(await shell.reveal()('files')).toBe(true); await flush();
    expect(shell.wrapper.get('#contentViewer').isVisible()).toBe(true);
    expect(selected.bridge).toHaveBeenCalledTimes(1); expect(selected.files.getOpenFiles('B')).toHaveLength(1);
    if (expected === 'drawer') {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await flush();
      expect(shell.wrapper.find('#contentViewer').exists()).toBe(false); expect(document.activeElement).toBe(origin.element);
      await origin.trigger('click'); await flush(); expect(shell.wrapper.get('#contentViewer').isVisible()).toBe(true);
      await shell.wrapper.get('[data-test="workspace-right-tool-drawer-backdrop"]').trigger('click'); await flush();
      expect(document.activeElement).toBe(origin.element);
    }
    expect(shell.errors).toEqual([]);
  });
}

for (const error of ['local-file-preview:unavailable', 'local-file-preview:not-regular-file']) {
  it(`reveals the stored ordinary error on the fresh drawer with one activation: ${error}`, async () => {
    const selected = await setupSelectedB();
    selected.bridge.mockResolvedValue({ success: false, errorCode: error.split(':')[1] } as any);
    const shell = mountShell(selected.pinia, 992, 700); await flush(); setActivePinia(selected.pinia);
    shell.setPath('/workspace/B/missing.md');
    await shell.wrapper.get('[data-test="file-origin"]').trigger('click'); await flush();
    expect(shell.result.value).toBe('opened');
    expect(shell.wrapper.get('#contentViewer [role="alert"]').isVisible()).toBe(true);
    expect(shell.wrapper.get('#contentViewer [role="alert"]').text()).not.toContain('host workspace');
    expect(selected.files.getActiveFileData('B')?.error).toBe(error);
    expect(shell.errors).toEqual([]);
  });
}

it('does not publish after shell disposal, including disposal during the render flush', async () => {
  const selected = await setupSelectedB();
  const shell = mountShell(selected.pinia, 992, 700); await flush();
  const capability = shell.reveal();
  const pending = capability('files'); shell.wrapper.unmount();
  expect(await pending).toBe(false);
  useRightSideTabs().setActiveTab('progress'); shell.right.setRightPanelVisible(false);
  expect(await capability('files')).toBe(false);
  expect(useRightSideTabs().activeTab.value).toBe('progress'); expect(shell.right.isRightPanelVisible.value).toBe(false);
});
