import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { createTestingPinia } from '@pinia/testing';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import MobileContextSwitcher from '../MobileContextSwitcher.vue';
import MobileRemoteAccessShell from '../MobileRemoteAccessShell.vue';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceStore } from '~/stores/workspace';

const { routeState } = vi.hoisted(() => ({
  routeState: {
    current: {
      query: {} as Record<string, unknown>,
    },
  },
}));

vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>();
  return {
    ...actual,
    useRoute: () => routeState.current,
  };
});

const pairedSession = {
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'http://desktop-private.local:29695',
  credential: 'credential-1',
  pairedAt: '2026-05-18T12:00:00.000Z',
  device: {
    deviceId: 'device-1',
    displayName: 'Phone',
    clientFacingBaseUrl: 'http://desktop-private.local:29695',
    createdAt: '2026-05-18T12:00:00.000Z',
    lastSeenAt: null,
    revokedAt: null,
  },
};

const initialState = {
  mobileNodeSession: {
    session: pairedSession,
    initialized: true,
    isPairing: false,
    isCheckingStatus: false,
    lastDiagnostic: null,
    lastStatus: {
      phoneAccessEnabled: true,
      pairingAvailable: true,
      compatibilityVersion: 1,
      serverName: 'Desktop Node',
    },
  },
  runHistory: {
    workspaceGroups: [
      {
        workspaceRootPath: '/Users/normy/project',
        workspaceName: 'project',
        agentDefinitions: [
          {
            agentDefinitionId: 'agent-1',
            agentName: 'Builder Agent',
            runs: [
              {
                runId: 'run-1',
                summary: 'Implement mobile shell',
                lastActivityAt: '2026-05-18T16:00:00.000Z',
                status: 'Running',
                lastKnownStatus: 'ACTIVE',
                isActive: true,
              },
            ],
          },
        ],
        teamDefinitions: [],
      },
    ],
    resumeConfigByRunId: {},
    teamResumeConfigByTeamRunId: {},
    loading: false,
    openingRun: false,
    error: null,
  },
  agentDefinition: {
    agentDefinitions: [
      { id: 'agent-1', name: 'Builder Agent', description: 'Builds software', toolNames: [], inputProcessorNames: [], llmResponseProcessorNames: [], systemPromptProcessorNames: [], toolExecutionResultProcessorNames: [], toolInvocationPreprocessorNames: [], lifecycleProcessorNames: [], skillNames: [], instructions: '' },
    ],
    loading: false,
  },
  agentTeamDefinition: {
    agentTeamDefinitions: [
      { id: 'team-1', name: 'Software Team', description: 'Coordinates implementation', nodes: [], coordinatorMemberName: 'lead', instructions: '' },
    ],
    loading: false,
  },
  workspace: {
    workspaces: {
      'workspace-1': {
        workspaceId: 'workspace-1',
        name: 'Project Workspace',
        fileExplorer: { id: 'root', name: 'project', path: '/Users/normy/project', is_file: false, children: [] },
        nodeIdToNode: {},
        workspaceConfig: { root_path: '/Users/normy/project' },
        absolutePath: '/Users/normy/project',
      },
    },
    loading: false,
    error: null,
    workspacesFetched: true,
    fileSystemConnections: new Map(),
  },
};

const mountShell = (options: { state?: typeof initialState; stubs?: Record<string, unknown> } = {}) => mount(MobileRemoteAccessShell, {
  global: {
    plugins: [
      createTestingPinia({
        createSpy: vi.fn,
        initialState: options.state ?? initialState,
      }),
    ],
    stubs: {
      AgentEventMonitor: { template: '<div data-testid="agent-event-monitor" />' },
      AgentTeamEventMonitor: { template: '<div data-testid="team-event-monitor" />' },
      NuxtLink: { template: '<a><slot /></a>' },
      ...(options.stubs ?? {}),
    },
  },
});

describe('MobileRemoteAccessShell phone-first navigation', () => {
  beforeEach(() => {
    routeState.current = { query: {} };
    vi.clearAllMocks();
  });

  it('lands paired phones on Mobile Home with current node, primary action, and no desktop workspace link', async () => {
    const wrapper = mountShell();
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-home"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Desktop Node');
    expect(wrapper.text()).toContain('Continue latest run');
    expect(wrapper.text()).toContain('Recent work');
    expect(wrapper.text()).not.toContain('Workspace and runs');
    expect(wrapper.html()).not.toContain('href="/workspace"');
    expect(wrapper.find('[data-testid="mobile-bottom-nav"]').exists()).toBe(false);
  });

  it('explains stale desktop workspace redirects inside the paired mobile home', async () => {
    routeState.current = { query: { unsupported: 'desktopWorkspace' } };

    const wrapper = mountShell();
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-home"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('desktop workspace route is replaced');
    expect(wrapper.text()).toContain('phone-first mobile work shell');
  });

  it('continues the latest run into one mobile work shell with Chat/Runs/Files/Tools/Activity bottom navigation', async () => {
    const wrapper = mountShell();
    await nextTick();
    await wrapper.get('[data-testid="mobile-home-primary-action"]').trigger('click');
    await nextTick();
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-work-shell"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-bottom-nav"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Chat');
    expect(wrapper.text()).toContain('Runs');
    expect(wrapper.text()).toContain('Files');
    expect(wrapper.text()).toContain('Tools');
    expect(wrapper.text()).toContain('Activity');
    expect(wrapper.text()).not.toContain('Running List');

    const runHistoryStore = useRunHistoryStore();
    expect(runHistoryStore.openRun).toHaveBeenCalledWith('run-1', { selectionMode: 'mobile' });
  });

  it('keeps Start new as a focused mobile setup surface instead of mixing recent history', async () => {
    const wrapper = mountShell();
    await nextTick();
    await wrapper.get('[data-testid="mobile-home-primary-action"]').trigger('click');
    await nextTick();
    useMobileWorkStore().$patch({ activeTab: 'runs' });
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-runs-list"]').exists()).toBe(true);

    await wrapper.get('[data-testid="mobile-start-run"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-run-setup"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-runs-list"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="mobile-runs"]').text()).toContain('Start new run');
  });

  it('shows a focused context switcher with Recent, Agents, Teams, and Workspaces instead of the desktop tree', async () => {
    const wrapper = mountShell();
    await nextTick();
    const switchWorkButton = wrapper.findAll('button').find((button) => button.text().includes('Switch work'));
    expect(switchWorkButton).toBeTruthy();
    await switchWorkButton!.trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-context-switcher"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-context-segments"]').text()).toContain('Recent');
    expect(wrapper.find('[data-testid="mobile-context-segments"]').text()).toContain('Agents');
    expect(wrapper.find('[data-testid="mobile-context-segments"]').text()).toContain('Teams');
    expect(wrapper.find('[data-testid="mobile-context-segments"]').text()).toContain('Workspaces');
    expect(wrapper.text()).not.toContain('AppLeftPanel');
  });

  it('defaults no-recent mobile work picking to startable agents and teams', async () => {
    const noRecentState: typeof initialState = {
      ...initialState,
      runHistory: {
        ...initialState.runHistory,
        workspaceGroups: [],
      },
    };

    const wrapper = mountShell({ state: noRecentState });
    await nextTick();
    const switchWorkButton = wrapper.findAll('button').find((button) => button.text().includes('Switch work'));
    expect(switchWorkButton).toBeTruthy();
    await switchWorkButton!.trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-context-switcher"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-context-list"]').text()).toContain('Builder Agent');
    expect(wrapper.text()).not.toContain('No matching agents');

    await wrapper.get('[data-testid="mobile-context-segment-teams"]').trigger('click');
    await nextTick();
    expect(wrapper.find('[data-testid="mobile-context-list"]').text()).toContain('Software Team');
    expect(wrapper.text()).not.toContain('No matching teams');
  });

  it('shows a retriable catalog error instead of a false empty agent segment', async () => {
    const emptyAgentState: typeof initialState = {
      ...initialState,
      runHistory: {
        ...initialState.runHistory,
        workspaceGroups: [],
      },
      agentDefinition: {
        ...initialState.agentDefinition,
        agentDefinitions: [],
        error: null,
      },
    } as typeof initialState;

    const wrapper = mountShell({ state: emptyAgentState });
    await flushPromises();

    const agentDefinitionStore = useAgentDefinitionStore();
    vi.mocked(agentDefinitionStore.fetchAllAgentDefinitions).mockImplementation(async () => {
      agentDefinitionStore.$patch({ error: new Error('agent catalog down'), agentDefinitions: [] });
    });

    await wrapper.get('[data-testid="mobile-home-refresh"]').trigger('click');
    await flushPromises();

    const switchWorkButton = wrapper.findAll('button').find((button) => button.text().includes('Switch work'));
    expect(switchWorkButton).toBeTruthy();
    await switchWorkButton!.trigger('click');
    await nextTick();
    await wrapper.get('[data-testid="mobile-context-segment-agents"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-context-error"]').text()).toContain('agent catalog down');
    expect(wrapper.find('[data-testid="mobile-context-retry"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain('No matching agents');
  });

  it('keeps mobile components free from desktop shell imports and stale workspace routing', () => {
    const mobileDir = resolve(process.cwd(), 'components/mobile');
    const sourceFiles = [
      'MobileRemoteAccessShell.vue',
      'MobileHome.vue',
      'MobileWorkShell.vue',
      'MobileContextSwitcher.vue',
      'MobileChat.vue',
      'MobileRuns.vue',
      'MobileFiles.vue',
      'MobileTools.vue',
      'MobileActivity.vue',
      'MobileReadableWorkRow.vue',
      'MobileRunSetup.vue',
      'MobileFileViewer.vue',
      'MobileComposerContextTray.vue',
      'MobileLaunchTargetPicker.vue',
      'MobileLaunchSummary.vue',
      'MobileLaunchRuntimeModelCard.vue',
      'MobileTeamLaunchFocusPicker.vue',
      'MobileTeamMemberFocusBar.vue',
      'MobileActivityDigest.vue',
      'MobileTeamMessages.vue',
      'MobileToolActivityList.vue',
    ];

    const combined = sourceFiles.map((file) => readFileSync(resolve(mobileDir, file), 'utf-8')).join('\n');
    expect(combined).not.toContain('AppLeftPanel');
    expect(combined).not.toContain('WorkspaceMobileLayout');
    expect(combined).not.toContain('RightSideTabs');
    expect(combined).not.toContain('to="/workspace"');
  });

  it('implements Round 4 mobile parity surfaces instead of placeholders', () => {
    const mobileDir = resolve(process.cwd(), 'components/mobile');
    const runSetupSource = readFileSync(resolve(mobileDir, 'MobileRunSetup.vue'), 'utf-8');
    const runsSource = readFileSync(resolve(mobileDir, 'MobileRuns.vue'), 'utf-8');
    const filesSource = readFileSync(resolve(mobileDir, 'MobileFiles.vue'), 'utf-8');
    const fileViewerSource = readFileSync(resolve(mobileDir, 'MobileFileViewer.vue'), 'utf-8');
    const activitySource = readFileSync(resolve(mobileDir, 'MobileActivity.vue'), 'utf-8');
    const activityDigestSource = readFileSync(resolve(mobileDir, 'MobileActivityDigest.vue'), 'utf-8');
    const chatSource = readFileSync(resolve(mobileDir, 'MobileChat.vue'), 'utf-8');
    const toolsSource = readFileSync(resolve(mobileDir, 'MobileTools.vue'), 'utf-8');

    expect(runsSource).toContain('MobileRunSetup');
    expect(runSetupSource).toContain('mobile-run-agent-select');
    expect(runSetupSource).toContain('mobile-run-team-select');
    expect(runSetupSource).toContain('mobile-run-workspace-select');
    expect(runSetupSource).toContain('mobile-run-launch');
    expect(runSetupSource).toContain('MobileLaunchRuntimeModelCard');
    expect(runSetupSource).toContain('MobileTeamLaunchFocusPicker');
    expect(filesSource).toContain('MobileFileViewer');
    expect(fileViewerSource).toContain('authorized workspace file API');
    expect(fileViewerSource).toContain('mobile-file-attach');
    expect(chatSource).toContain('MobileComposerContextTray');
    expect(activitySource).toContain('MobileActivityDigest');
    expect(activityDigestSource).toContain('MobileTeamMessages');
    expect(activityDigestSource).toContain('MobileToolActivityList');
    expect(toolsSource).toContain('Terminal');
    expect(toolsSource).toContain('VncViewer');
    expect(toolsSource).not.toContain('RightSideTabs');
    expect(`${runsSource}\n${filesSource}\n${activitySource}`).not.toContain('Full content loads through authorized file APIs when this file is opened from the mobile MVP.');
    expect(`${runsSource}\n${filesSource}\n${activitySource}`).not.toContain('Configuration is shown only after this explicit start action.');
  });

  it('isolates mobile run selection from desktop workspace shell navigation', () => {
    const selectionStoreSource = readFileSync(resolve(process.cwd(), 'stores/agentSelectionStore.ts'), 'utf-8');
    const mobileShellSource = readFileSync(resolve(process.cwd(), 'components/mobile/MobileRemoteAccessShell.vue'), 'utf-8');
    const mobileAdapterSource = readFileSync(resolve(process.cwd(), 'utils/mobile/mobileSelectionAdapter.ts'), 'utf-8');

    expect(selectionStoreSource).toContain('selectRunWithoutShellNavigation');
    expect(mobileAdapterSource).toContain('selectRunWithoutShellNavigation');
    expect(mobileShellSource).toContain("selectionMode: 'mobile'");
    expect(mobileShellSource).toContain('selectMobileRun');
    expect(mobileShellSource).toContain('clearMobileRunSelection');
    expect(mobileShellSource).not.toContain('useWorkspaceCenterViewStore');
  });

  it('clears stale run selection through the pure mobile path when switching to a workspace', async () => {
    const wrapper = mountShell();
    await nextTick();
    await nextTick();

    const selectionStore = useAgentSelectionStore();
    selectionStore.$patch({ selectedRunId: 'run-1', selectedType: 'agent' });

    const switchWorkButton = wrapper.findAll('button').find((button) => button.text().includes('Switch work'));
    expect(switchWorkButton).toBeTruthy();
    await switchWorkButton!.trigger('click');
    await nextTick();

    wrapper.findComponent(MobileContextSwitcher).vm.$emit('selectContext', {
      kind: 'workspace',
      workspaceId: 'workspace-1',
      title: 'Project Workspace',
      rootPath: '/Users/normy/project',
    });
    await nextTick();

    expect(selectionStore.clearSelectionWithoutShellNavigation).toHaveBeenCalledTimes(1);
    expect(selectionStore.clearSelection).not.toHaveBeenCalled();
  });

  it('does not reuse stale authorized API reachability after a later true network failure', async () => {
    const wrapper = mountShell();
    await flushPromises();

    const sessionStore = useMobileNodeSessionStore();
    const runHistoryStore = useRunHistoryStore();
    const agentDefinitionStore = useAgentDefinitionStore();
    const teamDefinitionStore = useAgentTeamDefinitionStore();
    const workspaceStore = useWorkspaceStore();

    sessionStore.$patch({
      authorizedApiReachable: true,
      lastStatus: {
        phoneAccessEnabled: true,
        pairingAvailable: true,
        compatibilityVersion: 1,
        serverName: 'Desktop Node',
      },
      lastDiagnostic: null,
    });

    vi.mocked(sessionStore.fetchStatus).mockReset();
    vi.mocked(runHistoryStore.fetchTree).mockReset();
    vi.mocked(agentDefinitionStore.fetchAllAgentDefinitions).mockReset();
    vi.mocked(teamDefinitionStore.fetchAllAgentTeamDefinitions).mockReset();
    vi.mocked(workspaceStore.fetchAllWorkspaces).mockReset();

    vi.mocked(sessionStore.fetchStatus).mockImplementation(async () => {
      sessionStore.$patch({
        lastStatus: null,
        lastDiagnostic: {
          kind: 'network_unreachable',
          title: 'Cannot reach AutoByteus desktop',
          message: 'Your phone cannot reach the desktop node over the current private network.',
          recoveryAction: 'Check that AutoByteus is running and your LAN, VPN, or tailnet is connected.',
        },
        authorizedApiReachable: false,
      });
      return null;
    });
    vi.mocked(runHistoryStore.fetchTree).mockRejectedValue(new Error('catalog unreachable'));
    vi.mocked(agentDefinitionStore.fetchAllAgentDefinitions).mockRejectedValue(new Error('catalog unreachable'));
    vi.mocked(teamDefinitionStore.fetchAllAgentTeamDefinitions).mockRejectedValue(new Error('catalog unreachable'));
    vi.mocked(workspaceStore.fetchAllWorkspaces).mockRejectedValue(new Error('catalog unreachable'));

    await wrapper.get('[data-testid="mobile-home-refresh"]').trigger('click');
    await flushPromises();

    const statusCardText = wrapper.get('[data-testid="mobile-home-status-card"]').text();
    expect(statusCardText).toContain('Offline');
    expect(statusCardText).toContain('Cannot reach AutoByteus desktop');
    expect(statusCardText).not.toContain('Node reachable');
    expect(statusCardText).not.toContain('Phone Access status unavailable');
  });

  it('keeps post-pair checking active across the async session flip before stable Home', async () => {
    let resolveStatus!: (value: NonNullable<typeof initialState.mobileNodeSession.lastStatus>) => void;
    const statusPromise = new Promise<NonNullable<typeof initialState.mobileNodeSession.lastStatus>>((resolve) => {
      resolveStatus = resolve;
    });
    const unpairedState: typeof initialState = {
      ...initialState,
      mobileNodeSession: {
        ...initialState.mobileNodeSession,
        session: null,
        lastStatus: null,
        lastDiagnostic: null,
        authorizedApiReachable: false,
      },
    } as any;
    const PairingBootstrapStub = {
      setup(_props: unknown, { emit }: any) {
        const sessionStore = useMobileNodeSessionStore();
        async function pair() {
          emit('pairing-started');
          await nextTick();
          sessionStore.$patch({ session: pairedSession as any });
        }
        return { pair };
      },
      template: '<button type="button" data-testid="mobile-pairing-complete" @click="pair">Pair</button>',
    };

    const wrapper = mountShell({
      state: unpairedState,
      stubs: {
        MobilePairingBootstrap: PairingBootstrapStub,
      },
    });
    await nextTick();

    const sessionStore = useMobileNodeSessionStore();
    vi.mocked(sessionStore.fetchStatus).mockImplementation(async () => {
      const status = await statusPromise;
      sessionStore.$patch({ lastStatus: status, lastDiagnostic: null });
      return status;
    });

    await wrapper.get('[data-testid="mobile-pairing-complete"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-post-pair-checking"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="mobile-home"]').exists()).toBe(false);

    resolveStatus({
      phoneAccessEnabled: true,
      pairingAvailable: true,
      compatibilityVersion: 1,
      serverName: 'Desktop Node',
    });
    await flushPromises();

    expect(wrapper.find('[data-testid="mobile-post-pair-checking"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="mobile-home"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Desktop Node');
  });

});
