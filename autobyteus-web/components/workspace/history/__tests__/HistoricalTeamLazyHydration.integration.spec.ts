import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import WorkspaceAgentRunsTreePanel from '../WorkspaceAgentRunsTreePanel.vue';
import TeamWorkspaceView from '../../team/TeamWorkspaceView.vue';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';

const flushPromises = async () => {
  await Promise.resolve();
  await nextTick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

const buildWorkspaceHistoryResponse = () => ({
  listWorkspaceRunHistory: [
    {
      workspaceRootPath: '/ws/a',
      workspaceName: 'autobyteus-workspace-superrepo',
      agentDefinitions: [],
      teamDefinitions: [
        {
          teamDefinitionId: 'team-def-1',
          teamDefinitionName: 'Software Engineering Team',
          runs: [
            {
              teamRunId: 'team-1',
              teamDefinitionId: 'team-def-1',
              teamDefinitionName: 'Software Engineering Team',
              coordinatorMemberRouteKey: 'solution_designer',
              workspaceRootPath: '/ws/a',
              summary: 'Build the demo fruit shop website',
              lastActivityAt: '2026-01-01T00:05:00.000Z',
              lastKnownStatus: 'IDLE',
              deleteLifecycle: 'READY',
              isActive: false,
              members: [
                {
                  memberRouteKey: 'solution_designer',
                  memberName: 'solution_designer',
                  memberRunId: 'member-run-sd',
                  workspaceRootPath: '/ws/a',
                },
                {
                  memberRouteKey: 'architect_reviewer',
                  memberName: 'architect_reviewer',
                  memberRunId: 'member-run-ar',
                  workspaceRootPath: '/ws/a',
                },
                {
                  memberRouteKey: 'code_reviewer',
                  memberName: 'code_reviewer',
                  memberRunId: 'member-run-cr',
                  workspaceRootPath: '/ws/a',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
});

const buildTeamResumeConfigResponse = () => ({
  getTeamRunResumeConfig: {
    teamRunId: 'team-1',
    isActive: false,
    metadata: {
      teamRunId: 'team-1',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Software Engineering Team',
      coordinatorMemberRouteKey: 'solution_designer',
      runVersion: 1,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:05:00.000Z',
      memberMetadata: [
        {
          memberRouteKey: 'solution_designer',
          memberName: 'solution_designer',
          memberRunId: 'member-run-sd',
          agentDefinitionId: 'agent-sd',
          llmModelIdentifier: 'model-x',
          runtimeKind: 'AUTOBYTEUS',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
          workspaceRootPath: '/ws/a',
        },
        {
          memberRouteKey: 'architect_reviewer',
          memberName: 'architect_reviewer',
          memberRunId: 'member-run-ar',
          agentDefinitionId: 'agent-ar',
          llmModelIdentifier: 'model-x',
          runtimeKind: 'AUTOBYTEUS',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
          workspaceRootPath: '/ws/a',
        },
        {
          memberRouteKey: 'code_reviewer',
          memberName: 'code_reviewer',
          memberRunId: 'member-run-cr',
          agentDefinitionId: 'agent-cr',
          llmModelIdentifier: 'model-x',
          runtimeKind: 'AUTOBYTEUS',
          autoExecuteTools: false,
          skillAccessMode: 'PRELOADED_ONLY',
          llmConfig: null,
          workspaceRootPath: '/ws/a',
        },
      ],
    },
  },
});

const buildProjectionResponse = (memberRouteKey: string) => ({
  getTeamMemberRunProjection: {
    agentRunId: `member-run-${memberRouteKey}`,
    summary: `${memberRouteKey} summary`,
    lastActivityAt: '2026-01-01T00:05:00.000Z',
    conversation: [
      { kind: 'message', role: 'user', content: `hello from ${memberRouteKey}`, ts: 1700000000 },
      { kind: 'message', role: 'assistant', content: `reply from ${memberRouteKey}`, ts: 1700000010 },
    ],
    activities: [],
  },
});

const {
  queryMock,
  mutateMock,
  workspaceStoreMock,
  windowNodeContextStoreMock,
  agentDefinitionStoreMock,
  agentTeamDefinitionStoreMock,
  agentContextsStoreMock,
  agentRunConfigStoreMock,
  teamRunConfigStoreMock,
  agentRunStoreMock,
  agentTeamRunStoreMock,
  llmProviderConfigStoreMock,
  workspaceCenterViewStoreMock,
  addToastMock,
} = vi.hoisted(() => ({
  queryMock: vi.fn(),
  mutateMock: vi.fn(),
  workspaceStoreMock: {
    workspacesFetched: true,
    allWorkspaces: [
      {
        workspaceId: 'ws-1',
        absolutePath: '/ws/a',
        workspaceConfig: { root_path: '/ws/a' },
        name: 'autobyteus-workspace-superrepo',
      },
    ],
    workspaces: {
      'ws-1': {
        absolutePath: '/ws/a',
        workspaceConfig: { root_path: '/ws/a' },
      },
    } as Record<string, any>,
    fetchAllWorkspaces: vi.fn().mockResolvedValue(undefined),
    createWorkspace: vi.fn().mockResolvedValue('ws-1'),
  },
  windowNodeContextStoreMock: {
    waitForBoundBackendReady: vi.fn().mockResolvedValue(true),
    lastReadyError: { __v_isRef: true, value: null as string | null },
    isEmbeddedWindow: { __v_isRef: true, value: false },
  },
  agentDefinitionStoreMock: {
    agentDefinitions: [
      { id: 'agent-sd', name: 'Solution Designer', avatarUrl: 'https://example.com/sd.png' },
      { id: 'agent-ar', name: 'Architect Reviewer', avatarUrl: 'https://example.com/ar.png' },
      { id: 'agent-cr', name: 'Code Reviewer', avatarUrl: 'https://example.com/cr.png' },
    ],
    fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
    getAgentDefinitionById: vi.fn((id: string) => {
      const all = [
        { id: 'agent-sd', name: 'Solution Designer', avatarUrl: 'https://example.com/sd.png' },
        { id: 'agent-ar', name: 'Architect Reviewer', avatarUrl: 'https://example.com/ar.png' },
        { id: 'agent-cr', name: 'Code Reviewer', avatarUrl: 'https://example.com/cr.png' },
      ];
      return all.find((agent) => agent.id === id) ?? null;
    }),
  },
  agentTeamDefinitionStoreMock: {
    agentTeamDefinitions: [
      {
        id: 'team-def-1',
        name: 'Software Engineering Team',
        avatarUrl: 'https://example.com/team.png',
      },
    ],
    fetchAllAgentTeamDefinitions: vi.fn().mockResolvedValue(undefined),
  },
  agentContextsStoreMock: {
    runs: new Map<string, any>(),
    getRun: vi.fn().mockReturnValue(undefined),
  },
  agentRunConfigStoreMock: {
    clearConfig: vi.fn(),
    setTemplate: vi.fn(),
    setAgentConfig: vi.fn(),
    updateAgentConfig: vi.fn(),
  },
  teamRunConfigStoreMock: {
    clearConfig: vi.fn(),
    setConfig: vi.fn(),
  },
  agentRunStoreMock: {
    terminateRun: vi.fn().mockResolvedValue(true),
    closeAgent: vi.fn().mockResolvedValue(undefined),
    connectToAgentStream: vi.fn(),
    disconnectAgentStream: vi.fn(),
  },
  agentTeamRunStoreMock: {
    terminateTeamRun: vi.fn().mockResolvedValue(undefined),
    discardDraftTeamRun: vi.fn().mockResolvedValue(true),
    connectToTeamStream: vi.fn(),
    disconnectTeamStream: vi.fn(),
  },
  llmProviderConfigStoreMock: {
    models: ['model-x'],
    fetchProvidersWithModels: vi.fn().mockResolvedValue(undefined),
  },
  workspaceCenterViewStoreMock: {
    showChat: vi.fn(),
    showConfig: vi.fn(),
  },
  addToastMock: vi.fn(),
}));

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => ({
    query: queryMock,
    mutate: mutateMock,
  }),
}));

vi.mock('~/graphql/queries/runHistoryQueries', () => ({
  ListWorkspaceRunHistory: 'ListWorkspaceRunHistory',
  GetRunProjection: 'GetRunProjection',
  GetRunFileChanges: 'GetRunFileChanges',
  GetAgentRunResumeConfig: 'GetAgentRunResumeConfig',
  GetTeamRunResumeConfig: 'GetTeamRunResumeConfig',
  GetTeamMemberRunProjection: 'GetTeamMemberRunProjection',
}));

vi.mock('~/graphql/mutations/runHistoryMutations', () => ({
  DeleteStoredRun: 'DeleteStoredRun',
  DeleteStoredTeamRun: 'DeleteStoredTeamRun',
}));

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => workspaceStoreMock,
}));

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => windowNodeContextStoreMock,
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStoreMock,
}));

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => agentTeamDefinitionStoreMock,
}));

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => agentContextsStoreMock,
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => agentRunConfigStoreMock,
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => teamRunConfigStoreMock,
}));

vi.mock('~/stores/agentRunStore', () => ({
  useAgentRunStore: () => agentRunStoreMock,
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => agentTeamRunStoreMock,
}));

vi.mock('~/stores/llmProviderConfig', () => ({
  useLLMProviderConfigStore: () => llmProviderConfigStoreMock,
}));

vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => workspaceCenterViewStoreMock,
}));

vi.mock('~/composables/useNativeFolderDialog', () => ({
  pickFolderPath: vi.fn().mockResolvedValue(null),
}));

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}));

const Harness = defineComponent({
  components: {
    WorkspaceAgentRunsTreePanel,
    TeamWorkspaceView,
  },
  template: `
    <div>
      <WorkspaceAgentRunsTreePanel />
      <TeamWorkspaceView />
    </div>
  `,
});

describe('Historical team lazy hydration integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  const mountHarness = () => mount(Harness, {
    global: {
      stubs: {
        Icon: { template: '<span class="icon-stub" />' },
        ConfirmationModal: { template: '<div data-test="confirmation-modal" />' },
        AgentTeamEventMonitor: { template: '<div data-test="team-event-monitor" />' },
        TeamGridView: {
          template: '<div data-test="team-grid" />',
        },
        TeamSpotlightView: {
          template: '<div data-test="team-spotlight" />',
        },
        TeamWorkspaceModeSwitch: {
          props: ['mode'],
          template: '<button type="button" data-test="mode-switch" @click="$emit(\'update:mode\', \'grid\')">{{ mode }}</button>',
        },
        AgentUserInputForm: { template: '<div data-test="agent-user-input-form" />' },
        WorkspaceHeaderActions: {
          template: `
            <div>
              <button type="button" data-test="new-agent" @click="$emit('new-agent')" />
              <button type="button" data-test="edit-config" @click="$emit('edit-config')" />
            </div>
          `,
        },
        AgentStatusDisplay: {
          props: ['status'],
          template: '<div data-test="header-status">{{ status }}</div>',
        },
      },
    },
  });

  it('opens a historical team through the sidebar and lazily hydrates only the newly selected member', async () => {
    const projectionCalls: string[] = [];
    let resumeConfigCalls = 0;

    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
      if (query === 'ListWorkspaceRunHistory') {
        return {
          data: buildWorkspaceHistoryResponse(),
          errors: [],
        };
      }

      if (query === 'GetTeamRunResumeConfig') {
        resumeConfigCalls += 1;
        expect(variables).toEqual({ teamRunId: 'team-1' });
        return {
          data: buildTeamResumeConfigResponse(),
          errors: [],
        };
      }

      if (query === 'GetTeamMemberRunProjection') {
        const memberRouteKey = String(variables?.memberRouteKey);
        projectionCalls.push(memberRouteKey);
        return {
          data: buildProjectionResponse(memberRouteKey),
          errors: [],
        };
      }

      throw new Error(`Unexpected query: ${String(query)}`);
    });

    const wrapper = mountHarness();
    const runHistoryStore = useRunHistoryStore();
    const teamContextsStore = useAgentTeamContextsStore();
    const selectionStore = useAgentSelectionStore();

    await flushPromises();

    expect(runHistoryStore.workspaceGroups).toHaveLength(1);
    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    const hydratedTeam = teamContextsStore.getTeamContextById('team-1');
    expect(hydratedTeam).toBeTruthy();
    expect(hydratedTeam?.focusedMemberName).toBe('solution_designer');
    expect(hydratedTeam?.members.get('solution_designer')?.state.conversation.messages.length).toBe(2);
    expect(hydratedTeam?.members.get('architect_reviewer')?.state.conversation.messages.length).toBe(0);
    expect(hydratedTeam?.historicalHydration?.memberProjectionLoadStateByRouteKey).toEqual({
      solution_designer: 'loaded',
      architect_reviewer: 'unloaded',
      code_reviewer: 'unloaded',
    });
    expect(projectionCalls).toEqual(['solution_designer']);
    expect(resumeConfigCalls).toBe(1);
    expect(selectionStore.selectedType).toBe('team');
    expect(selectionStore.selectedRunId).toBe('team-1');
    expect(wrapper.find('h4').text()).toBe('solution_designer');

    await wrapper.get('[data-test="workspace-team-member-team-1-architect_reviewer"]').trigger('click');
    await flushPromises();

    expect(resumeConfigCalls).toBe(1);
    expect(projectionCalls).toEqual(['solution_designer', 'architect_reviewer']);
    expect(hydratedTeam?.focusedMemberName).toBe('architect_reviewer');
    expect(hydratedTeam?.members.get('architect_reviewer')?.state.conversation.messages.length).toBe(2);
    expect(hydratedTeam?.historicalHydration?.memberProjectionLoadStateByRouteKey).toEqual({
      solution_designer: 'loaded',
      architect_reviewer: 'loaded',
      code_reviewer: 'unloaded',
    });
    expect(wrapper.find('h4').text()).toBe('architect_reviewer');

    wrapper.unmount();
  });

  it('hydrates the remaining historical members only after entering a broader team mode', async () => {
    const projectionCalls: string[] = [];

    queryMock.mockImplementation(async ({ query, variables }: { query: string; variables?: Record<string, unknown> }) => {
      if (query === 'ListWorkspaceRunHistory') {
        return {
          data: buildWorkspaceHistoryResponse(),
          errors: [],
        };
      }

      if (query === 'GetTeamRunResumeConfig') {
        return {
          data: buildTeamResumeConfigResponse(),
          errors: [],
        };
      }

      if (query === 'GetTeamMemberRunProjection') {
        const memberRouteKey = String(variables?.memberRouteKey);
        projectionCalls.push(memberRouteKey);
        return {
          data: buildProjectionResponse(memberRouteKey),
          errors: [],
        };
      }

      throw new Error(`Unexpected query: ${String(query)}`);
    });

    const wrapper = mountHarness();
    const teamContextsStore = useAgentTeamContextsStore();

    await flushPromises();

    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    expect(projectionCalls).toEqual(['solution_designer']);
    expect(teamContextsStore.getTeamContextById('team-1')?.historicalHydration?.memberProjectionLoadStateByRouteKey).toEqual({
      solution_designer: 'loaded',
      architect_reviewer: 'unloaded',
      code_reviewer: 'unloaded',
    });

    await wrapper.get('[data-test="mode-switch"]').trigger('click');
    await flushPromises();

    expect(projectionCalls).toEqual([
      'solution_designer',
      'architect_reviewer',
      'code_reviewer',
    ]);
    expect(teamContextsStore.getTeamContextById('team-1')?.historicalHydration?.memberProjectionLoadStateByRouteKey).toEqual({
      solution_designer: 'loaded',
      architect_reviewer: 'loaded',
      code_reviewer: 'loaded',
    });

    wrapper.unmount();
  });
});
