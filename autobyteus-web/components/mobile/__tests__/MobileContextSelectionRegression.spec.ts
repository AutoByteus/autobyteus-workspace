import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileChat from '../MobileChat.vue';
import MobileComposerContextTray from '../MobileComposerContextTray.vue';
import MobileRunSetup from '../MobileRunSetup.vue';
import MobileTeamMemberFocusBar from '../MobileTeamMemberFocusBar.vue';
import MobileToolActivityList from '../MobileToolActivityList.vue';
import MobileWorkShell from '../MobileWorkShell.vue';
import { useMobileFileContextCoordinator } from '~/composables/mobile/useMobileFileContextCoordinator';
import { useMobilePendingTeamRunAttachments } from '~/composables/mobile/useMobilePendingTeamRunAttachments';
import { useMobilePromotedRunContextSync } from '~/composables/mobile/useMobilePromotedRunContextSync';
import { useMobileWorkCatalog } from '~/composables/mobile/useMobileWorkCatalog';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentActivityStore, type ToolActivity } from '~/stores/agentActivityStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useMobileWorkStore } from '~/stores/mobileWorkStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { DEFAULT_AGENT_RUNTIME_KIND, type AgentRunConfig } from '~/types/agent/AgentRunConfig';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { AgentTeamContext, AgentTeamMemberNode, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import type { Conversation } from '~/types/conversation';
import type { MobileWorkContext } from '~/types/mobileWork';
import { createWorkspaceContextAttachment } from '~/utils/contextFiles/contextAttachmentModel';

const { createMobileRunFromConfigMock } = vi.hoisted(() => ({
  createMobileRunFromConfigMock: vi.fn(),
}));

vi.mock('~/composables/mobile/useMobileRunLaunchCoordinator', () => ({
  useMobileRunLaunchCoordinator: () => ({
    createMobileRunFromConfig: createMobileRunFromConfigMock,
  }),
}));

let pinia: Pinia;

const agentRunContext: MobileWorkContext = {
  kind: 'agent-run',
  runId: 'run-1',
  agentDefinitionId: 'agent-1',
  title: 'Builder Agent',
  summary: 'Existing run',
  workspaceRootPath: '/Users/normy/project',
  isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z',
  statusLabel: 'Running',
};

const workspaceContext: MobileWorkContext = {
  kind: 'workspace',
  workspaceId: 'workspace-1',
  title: 'Project Workspace',
  rootPath: '/Users/normy/project',
};

function makeAgentRunConfig(agentDefinitionId = 'agent-1'): AgentRunConfig {
  return {
    agentDefinitionId,
    agentDefinitionName: 'Builder Agent',
    llmModelIdentifier: 'test-model',
    runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
    workspaceId: 'workspace-1',
    autoExecuteTools: false,
    skillAccessMode: 'GLOBAL_DISCOVERY',
    isLocked: false,
  };
}

function makeAgentContext(runId = 'run-1'): AgentContext {
  const conversation: Conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-05-18T16:00:00.000Z',
    updatedAt: '2026-05-18T16:00:00.000Z',
    agentDefinitionId: 'agent-1',
  };
  return new AgentContext(makeAgentRunConfig(), new AgentRunState(runId, conversation));
}

function seedActiveAgentRun(): AgentContext {
  const run = makeAgentContext('run-1');
  useAgentContextsStore().runs.set('run-1', run);
  useAgentSelectionStore().selectRunWithoutShellNavigation('run-1', 'agent');
  return run;
}


function seedActiveTeamRun(teamRunId = 'team-run-1'): AgentTeamContext {
  const leadNode: AgentTeamMemberNode = {
    memberKind: 'agent',
    memberName: 'lead',
    displayName: 'Lead',
    memberPath: ['lead'],
    memberRouteKey: 'lead',
    memberRunId: 'lead-run',
    agentDefinitionId: 'agent-1',
  };
  const reviewerNode: AgentTeamMemberNode = {
    memberKind: 'agent',
    memberName: 'reviewer',
    displayName: 'Reviewer',
    memberPath: ['reviewer'],
    memberRouteKey: 'reviewer',
    memberRunId: 'reviewer-run',
    agentDefinitionId: 'agent-1',
  };
  const context: AgentTeamContext = {
    teamRunId,
    config: {
      teamDefinitionId: 'team-1',
      teamDefinitionName: 'Software Team',
      runtimeKind: DEFAULT_AGENT_RUNTIME_KIND,
      workspaceId: 'workspace-1',
      llmModelIdentifier: 'test-model',
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: 'PRELOADED_ONLY',
      memberOverrides: {},
      isLocked: false,
    },
    memberTree: [leadNode, reviewerNode],
    memberNodesByRouteKey: new Map([
      ['lead', leadNode],
      ['reviewer', reviewerNode],
    ]),
    leafAgentContextsByRouteKey: new Map([
      ['lead', makeAgentContext('lead-run')],
      ['reviewer', makeAgentContext('reviewer-run')],
    ]),
    coordinatorMemberRouteKey: 'lead',
    historicalHydration: null,
    focusedMemberRouteKey: 'lead',
    currentStatus: AgentTeamStatus.Offline,
    isSubscribed: false,
    taskPlan: null,
    taskStatuses: null,
  };
  useAgentTeamContextsStore().teams.set(context.teamRunId, context);
  useAgentSelectionStore().selectRunWithoutShellNavigation(context.teamRunId, 'team');
  useMobileWorkStore().selectContext({
    kind: 'team-run',
    teamRunId: context.teamRunId,
    teamDefinitionId: 'team-1',
    title: 'Software Team',
    summary: 'Existing team run',
    workspaceRootPath: '/Users/normy/project',
    focusedMemberRouteKey: 'lead',
    isActive: true,
    lastActivityAt: '2026-05-18T16:00:00.000Z',
    statusLabel: 'Running',
  }, 'chat');
  return context;
}

function seedCatalog(): void {
  useAgentDefinitionStore().agentDefinitions = [
    {
      id: 'agent-1',
      name: 'Builder Agent',
      description: 'Builds software',
      instructions: '',
      toolNames: [],
      inputProcessorNames: [],
      llmResponseProcessorNames: [],
      systemPromptProcessorNames: [],
      toolExecutionResultProcessorNames: [],
      toolInvocationPreprocessorNames: [],
      lifecycleProcessorNames: [],
      skillNames: [],
      defaultLaunchConfig: { runtimeKind: DEFAULT_AGENT_RUNTIME_KIND, llmModelIdentifier: 'test-model', llmConfig: null },
    },
  ];
  useAgentTeamDefinitionStore().agentTeamDefinitions = [
    {
      id: 'team-1',
      name: 'Software Team',
      description: 'Coordinates implementation',
      instructions: '',
      coordinatorMemberName: 'lead',
      nodes: [],
    },
  ];
  const workspaceStore = useWorkspaceStore();
  workspaceStore.workspaces = {
    'workspace-1': {
      workspaceId: 'workspace-1',
      name: 'Project Workspace',
      fileExplorer: { id: 'root', name: 'project', path: '/Users/normy/project', is_file: false, children: [] } as any,
      nodeIdToNode: {},
      workspaceConfig: { root_path: '/Users/normy/project' },
      absolutePath: '/Users/normy/project',
    },
  };
  workspaceStore.workspacesFetched = true;
}

function mountWithPinia(component: any, options: any = {}) {
  return mount(component, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [pinia, ...(options.global?.plugins ?? [])],
      stubs: {
        RuntimeModelConfigFields: { template: '<div data-testid="runtime-model-config-fields" />' },
        ...(options.global?.stubs ?? {}),
      },
    },
  });
}

describe('mobile context selection stale-run regression', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    seedCatalog();
    createMobileRunFromConfigMock.mockResolvedValue({ context: agentRunContext });
  });

  it('does not show an existing run monitor after switching mobile Chat to a non-run context', async () => {
    seedActiveAgentRun();

    const wrapper = mountWithPinia(MobileChat, {
      props: { context: workspaceContext },
      global: {
        stubs: {
          AgentEventMonitor: { template: '<div data-testid="agent-event-monitor" />' },
          AgentTeamEventMonitor: { template: '<div data-testid="team-event-monitor" />' },
        },
      },
    });

    expect(wrapper.find('[data-testid="agent-event-monitor"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Start or open a run');

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(wrapper.find('[data-testid="agent-event-monitor"]').exists()).toBe(true);
  });

  it('routes non-run file attachments to mobile draft state instead of the stale selected run', () => {
    const run = seedActiveAgentRun();
    const coordinator = useMobileFileContextCoordinator();

    const draftResult = coordinator.attachWorkspaceFile('/Users/normy/project/draft.md', workspaceContext);

    expect(draftResult.target).toBe('mobile-draft');
    expect(run.contextFilePaths).toHaveLength(0);
    expect(useMobileWorkStore().draftContextAttachments).toHaveLength(1);
    expect(useMobileWorkStore().draftContextAttachments[0].locator).toBe('/Users/normy/project/draft.md');

    const activeRunResult = coordinator.attachWorkspaceFile('/Users/normy/project/run.md', agentRunContext);

    expect(activeRunResult.target).toBe('active-run');
    expect(run.contextFilePaths.map((attachment) => attachment.locator)).toEqual(['/Users/normy/project/run.md']);
    expect(useMobileWorkStore().draftContextAttachments.map((attachment) => attachment.locator)).toEqual(['/Users/normy/project/draft.md']);
  });

  it('shows composer attachments from the current mobile context only', async () => {
    const run = seedActiveAgentRun();
    run.contextFilePaths.push(createWorkspaceContextAttachment('/Users/normy/project/active.md'));
    useMobileWorkStore().addDraftContextAttachment(createWorkspaceContextAttachment('/Users/normy/project/draft.md'));

    const wrapper = mountWithPinia(MobileComposerContextTray, {
      props: { context: workspaceContext },
    });

    expect(wrapper.findAll('[data-testid="mobile-composer-context-item"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('draft.md');
    expect(wrapper.text()).not.toContain('active.md');

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(wrapper.findAll('[data-testid="mobile-composer-context-item"]')).toHaveLength(1);
    expect(wrapper.text()).toContain('active.md');
    expect(wrapper.text()).not.toContain('draft.md');
  });

  it('reconciles mobile current agent-run context when a temporary run is promoted after first send', async () => {
    const tempRunId = 'temp-agent-mobile-1';
    const permanentRunId = 'agent-run-permanent-1';
    const run = makeAgentContext(tempRunId);
    const agentContextsStore = useAgentContextsStore();
    const mobileWorkStore = useMobileWorkStore();
    agentContextsStore.runs.set(tempRunId, run);
    useAgentSelectionStore().selectRunWithoutShellNavigation(tempRunId, 'agent');
    mobileWorkStore.selectContext({
      kind: 'agent-run',
      runId: tempRunId,
      agentDefinitionId: 'agent-1',
      title: 'Builder Agent',
      summary: 'New agent run',
      workspaceRootPath: '/Users/normy/project',
      isActive: true,
      lastActivityAt: '2026-05-18T16:00:00.000Z',
      statusLabel: 'Ready',
    }, 'chat');
    useMobilePromotedRunContextSync();

    agentContextsStore.promoteTemporaryId(tempRunId, permanentRunId);
    await nextTick();

    expect(useAgentSelectionStore().selectedRunId).toBe(permanentRunId);
    expect(mobileWorkStore.currentContext?.kind).toBe('agent-run');
    if (mobileWorkStore.currentContext?.kind === 'agent-run') {
      expect(mobileWorkStore.currentContext.runId).toBe(permanentRunId);
      expect(mobileWorkStore.currentContext.agentDefinitionId).toBe('agent-1');
    }
  });

  it('reconciles mobile current team-run context and pending state when a temporary team is promoted after first send', async () => {
    const tempTeamRunId = 'temp-team-mobile-1';
    const permanentTeamRunId = 'team-permanent-1';
    const teamContext = seedActiveTeamRun(tempTeamRunId);
    const teamContextsStore = useAgentTeamContextsStore();
    const mobileWorkStore = useMobileWorkStore();
    const pendingAttachment = createWorkspaceContextAttachment('/Users/normy/project/pending-team.md');
    mobileWorkStore.addPendingTeamRunAttachment(tempTeamRunId, pendingAttachment);
    await teamContextsStore.focusMemberAndEnsureHydrated(tempTeamRunId, 'reviewer');
    mobileWorkStore.updateFocusedTeamMember(tempTeamRunId, 'reviewer');
    useMobilePromotedRunContextSync();

    teamContextsStore.promoteTemporaryTeamRunId(tempTeamRunId, permanentTeamRunId);
    await nextTick();

    expect(useAgentSelectionStore().selectedRunId).toBe(permanentTeamRunId);
    expect(mobileWorkStore.currentContext?.kind).toBe('team-run');
    if (mobileWorkStore.currentContext?.kind === 'team-run') {
      expect(mobileWorkStore.currentContext.teamRunId).toBe(permanentTeamRunId);
      expect(mobileWorkStore.currentContext.focusedMemberRouteKey).toBe('reviewer');
    }
    expect(teamContext.teamRunId).toBe(permanentTeamRunId);
    expect(mobileWorkStore.getPendingTeamRunAttachments(tempTeamRunId)).toHaveLength(0);
    expect(mobileWorkStore.getPendingTeamRunAttachments(permanentTeamRunId).map((attachment) => attachment.locator)).toEqual([
      '/Users/normy/project/pending-team.md',
    ]);
  });

  it('keeps pending team run attachments visible across focus changes and flushes them to the focused leaf before send', async () => {
    const teamContext = seedActiveTeamRun();
    const mobileWorkStore = useMobileWorkStore();
    const pendingAttachment = createWorkspaceContextAttachment('/Users/normy/project/team-draft.md');
    mobileWorkStore.addPendingTeamRunAttachment('team-run-1', pendingAttachment);

    const contextRef = ref(mobileWorkStore.currentContext);
    const tray = mountWithPinia(MobileComposerContextTray, {
      props: { context: contextRef.value },
    });

    expect(tray.text()).toContain('team-draft.md');
    expect(teamContext.leafAgentContextsByRouteKey.get('lead')?.contextFilePaths).toHaveLength(0);
    expect(teamContext.leafAgentContextsByRouteKey.get('reviewer')?.contextFilePaths).toHaveLength(0);

    await useAgentTeamContextsStore().focusMemberAndEnsureHydrated('team-run-1', 'reviewer');
    mobileWorkStore.updateFocusedTeamMember('team-run-1', 'reviewer');
    contextRef.value = mobileWorkStore.currentContext;
    await tray.setProps({ context: contextRef.value });

    expect(tray.text()).toContain('team-draft.md');

    const bridge = useMobilePendingTeamRunAttachments(contextRef);
    await bridge.beforeSend();

    expect(teamContext.leafAgentContextsByRouteKey.get('lead')?.contextFilePaths).toHaveLength(0);
    expect(teamContext.leafAgentContextsByRouteKey.get('reviewer')?.contextFilePaths.map((attachment) => attachment.locator)).toEqual([
      '/Users/normy/project/team-draft.md',
    ]);
    expect(mobileWorkStore.getPendingTeamRunAttachments('team-run-1')).toHaveLength(0);
    expect(bridge.error.value).toBeNull();
  });

  it('blocks pending team run attachment flush for non-leaf focus without consuming pending files', async () => {
    const teamContext = seedActiveTeamRun();
    const subteamNode: TeamMemberNode = {
      memberKind: 'agent_team',
      memberName: 'qa-team',
      displayName: 'QA Team',
      memberPath: ['qa-team'],
      memberRouteKey: 'qa-team',
      teamDefinitionId: 'qa-team',
      children: [],
    };
    teamContext.memberNodesByRouteKey.set(subteamNode.memberRouteKey, subteamNode);
    teamContext.memberTree.push(subteamNode);
    teamContext.focusedMemberRouteKey = subteamNode.memberRouteKey;

    const mobileWorkStore = useMobileWorkStore();
    mobileWorkStore.updateFocusedTeamMember('team-run-1', subteamNode.memberRouteKey);
    mobileWorkStore.addPendingTeamRunAttachment(
      'team-run-1',
      createWorkspaceContextAttachment('/Users/normy/project/team-draft.md'),
    );

    const bridge = useMobilePendingTeamRunAttachments(ref(mobileWorkStore.currentContext));
    await expect(bridge.beforeSend()).rejects.toThrow('Choose a team member before sending with pending context files.');

    expect(mobileWorkStore.getPendingTeamRunAttachments('team-run-1').map((attachment) => attachment.locator)).toEqual([
      '/Users/normy/project/team-draft.md',
    ]);
    expect(teamContext.leafAgentContextsByRouteKey.get('lead')?.contextFilePaths).toHaveLength(0);
    expect(bridge.error.value).toBe('Choose a team member before sending with pending context files.');
  });

  it('uses draft attachment count for run setup and launches with the next-run draft', async () => {
    seedActiveAgentRun().contextFilePaths.push(createWorkspaceContextAttachment('/Users/normy/project/active.md'));
    useMobileWorkStore().addDraftContextAttachment(createWorkspaceContextAttachment('/Users/normy/project/draft.md'));

    const wrapper = mountWithPinia(MobileRunSetup, {
      props: { context: workspaceContext },
    });
    await nextTick();

    expect(wrapper.get('[data-testid="mobile-run-setup-context-count"]').text()).toContain('1 file');
    await wrapper.get('[data-testid="mobile-run-agent-select-toggle"]').trigger('click');
    await nextTick();
    await wrapper.get('[data-testid="mobile-run-agent-select-option"]').trigger('click');
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-run-prompt"]').exists()).toBe(false);
    await wrapper.get('form').trigger('submit');
    await nextTick();

    expect(createMobileRunFromConfigMock).toHaveBeenCalledWith({
      kind: 'agent',
      agentDefinitionId: 'agent-1',
      workspaceId: 'workspace-1',
    });
  });


  it('updates both team focus and the mobile work context when changing an existing team-run target', async () => {
    const teamContext = seedActiveTeamRun();

    const wrapper = mountWithPinia(MobileTeamMemberFocusBar, {
      props: { context: useMobileWorkStore().currentContext },
    });

    expect(wrapper.get('[data-testid="mobile-team-focus-label"]').text()).toContain('lead');

    await wrapper.get('[data-testid="mobile-team-focus-select-toggle"]').trigger('click');
    await nextTick();
    const reviewerOption = wrapper
      .findAll('[data-testid="mobile-team-focus-select-option"]')
      .find((option) => option.text().includes('reviewer'));
    expect(reviewerOption).toBeTruthy();
    await reviewerOption!.trigger('click');
    await flushPromises();

    expect(teamContext.focusedMemberRouteKey).toBe('reviewer');
    const currentContext = useMobileWorkStore().currentContext;
    expect(currentContext?.kind).toBe('team-run');
    if (currentContext?.kind === 'team-run') {
      expect(currentContext.focusedMemberRouteKey).toBe('reviewer');
    }
    expect(useMobileWorkStore().getRememberedFocusedTeamMember('team-run-1')).toBe('reviewer');
  });

  it('hides existing-run Message target on Runs while keeping it on focused work tabs', async () => {
    seedActiveTeamRun();
    const wrapper = mountWithPinia(MobileWorkShell, {
      props: {
        context: useMobileWorkStore().currentContext,
        activeTab: 'runs',
      },
      global: {
        stubs: {
          MobileChat: { template: '<div data-testid="mobile-chat-stub" />' },
          MobileRuns: { template: '<div data-testid="mobile-runs-stub" />' },
          MobileFiles: { template: '<div data-testid="mobile-files-stub" />' },
          MobileActivity: { template: '<div data-testid="mobile-activity-stub" />' },
        },
      },
    });

    expect(wrapper.find('[data-testid="mobile-team-member-focus-bar"]').exists()).toBe(false);

    await wrapper.setProps({ activeTab: 'chat' });
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-team-member-focus-bar"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="mobile-team-focus-select"]').text()).toContain('Message target');
  });

  it('prefers remembered valid team focus when mapping Recent team runs and falls back safely when stale', () => {
    const runHistoryStore = useRunHistoryStore();
    runHistoryStore.workspaceGroups = [
      {
        workspaceRootPath: '/Users/normy/project',
        workspaceName: 'project',
        agentDefinitions: [],
        teamDefinitions: [
          {
            teamDefinitionId: 'team-1',
            teamDefinitionName: 'Software Team',
            runs: [
              {
                teamRunId: 'team-run-1',
                teamDefinitionId: 'team-1',
                teamDefinitionName: 'Software Team',
                summary: 'Existing team run',
                lastActivityAt: '2026-05-18T16:00:00.000Z',
                status: 'Running',
                lastKnownStatus: 'ACTIVE',
                isActive: true,
                coordinatorMemberRouteKey: 'lead',
                members: [
                  { memberRouteKey: 'lead', memberName: 'lead', memberRunId: 'lead-run' },
                  { memberRouteKey: 'reviewer', memberName: 'reviewer', memberRunId: 'reviewer-run' },
                ],
              },
            ],
          },
        ],
      },
    ] as any;

    const mobileWorkStore = useMobileWorkStore();
    mobileWorkStore.rememberFocusedTeamMember('team-run-1', 'reviewer');
    const { recentWorkItems } = useMobileWorkCatalog();
    const rememberedContext = recentWorkItems.value[0]?.context;
    expect(rememberedContext?.kind).toBe('team-run');
    if (rememberedContext?.kind === 'team-run') {
      expect(rememberedContext.focusedMemberRouteKey).toBe('reviewer');
    }

    mobileWorkStore.rememberFocusedTeamMember('team-run-1', 'missing-member');
    const fallbackContext = recentWorkItems.value[0]?.context;
    expect(fallbackContext?.kind).toBe('team-run');
    if (fallbackContext?.kind === 'team-run') {
      expect(fallbackContext.focusedMemberRouteKey).toBe('lead');
    }
  });

  it('does not leak stale run or tool activity into non-run mobile activity contexts', async () => {
    seedActiveAgentRun();
    const activity: ToolActivity = {
      invocationId: 'tool-1',
      toolName: 'read_file',
      type: 'tool_call',
      status: 'success',
      contextText: '/Users/normy/project/active.md',
      arguments: {},
      logs: [],
      result: null,
      error: null,
      timestamp: new Date('2026-05-18T16:05:00.000Z'),
    };
    useAgentActivityStore().addActivity('run-1', activity);

    const wrapper = mountWithPinia(MobileToolActivityList, {
      props: { context: workspaceContext },
    });

    expect(wrapper.find('[data-testid="mobile-tool-activity-row"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Select a run to see run and tool history.');
    expect(wrapper.text()).not.toContain('read_file');

    await wrapper.setProps({ context: agentRunContext });
    await nextTick();

    expect(wrapper.find('[data-testid="mobile-tool-activity-row"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('read_file');
  });
});
