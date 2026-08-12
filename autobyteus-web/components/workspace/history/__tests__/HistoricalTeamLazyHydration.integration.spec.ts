import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import WorkspaceAgentRunsTreePanel from '../WorkspaceAgentRunsTreePanel.vue';
import TeamWorkspaceView from '../../team/TeamWorkspaceView.vue';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const flushPromises = async () => {
  await Promise.resolve();
  await nextTick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await nextTick();
};

const agentMetadata = (address: string, agentRunId: string, agentDefinitionId: string) => ({
  kind: 'agent' as const,
  address,
  role: null,
  description: null,
  agentRunId,
  runtimeKind: 'autobyteus',
  platformAgentRunId: null,
  agentDefinitionId,
  llmModelIdentifier: 'model-x',
  autoExecuteTools: false,
  skillAccessMode: 'PRELOADED_ONLY',
  llmConfig: null,
  workspaceRootPath: '/ws/a',
  applicationExecutionContext: null,
});

const buildRootMetadata = () => ({
  kind: 'agent_team' as const,
  address: '/',
  teamDefinitionId: 'team-def-1',
  teamRunId: 'team-1',
  coordinatorAddress: '/solution_designer',
  children: [
    agentMetadata('/solution_designer', 'member-run-sd', 'agent-sd'),
    agentMetadata('/architect_reviewer', 'member-run-ar', 'agent-ar'),
    agentMetadata('/code_reviewer', 'member-run-cr', 'agent-cr'),
  ],
});

const buildWorkspaceHistoryResponse = () => ({
  listWorkspaceRunHistory: [{
    workspaceRootPath: '/ws/a',
    workspaceName: 'autobyteus-workspace-superrepo',
    agentDefinitions: [],
    teamDefinitions: [{
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Software Engineering Team',
      runs: [{
        teamRunId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Software Engineering Team',
        coordinatorAddress: '/solution_designer',
        workspaceRootPath: '/ws/a',
        summary: 'Build the demo fruit shop website',
        createdAt: '2026-01-01T00:05:00.000Z',
        isActive: false,
        rootTeam: buildRootMetadata(),
        members: [
          { memberAddress: '/solution_designer', displayName: 'solution_designer', agentRunId: 'member-run-sd', status: 'idle', workspaceRootPath: '/ws/a' },
          { memberAddress: '/architect_reviewer', displayName: 'architect_reviewer', agentRunId: 'member-run-ar', status: 'idle', workspaceRootPath: '/ws/a' },
          { memberAddress: '/code_reviewer', displayName: 'code_reviewer', agentRunId: 'member-run-cr', status: 'idle', workspaceRootPath: '/ws/a' },
        ],
      }],
    }],
  }],
});

const buildTeamResumeConfigResponse = () => ({
  getTeamRunResumeConfig: {
    teamRunId: 'team-1',
    isActive: false,
    metadata: {
      schemaVersion: 3,
      teamDefinitionName: 'Software Engineering Team',
      createdAt: '2026-01-01T00:00:00.000Z',
      archivedAt: null,
      rootTeam: buildRootMetadata(),
      handoffs: [],
    },
  },
});

const runIdByAddress: Record<string, string> = {
  '/solution_designer': 'member-run-sd',
  '/architect_reviewer': 'member-run-ar',
  '/code_reviewer': 'member-run-cr',
};

const buildProjectionResponse = (memberAddress: string) => ({
  getTeamMemberRunProjection: {
    agentRunId: runIdByAddress[memberAddress],
    summary: `${memberAddress.slice(1)} summary`,
    lastActivityAt: '2026-01-01T00:05:00.000Z',
    hasEarlierActiveTraceEvents: false,
    conversation: [
      { kind: 'message', role: 'user', content: `hello from ${memberAddress}`, ts: 1700000000 },
      { kind: 'message', role: 'assistant', content: `reply from ${memberAddress}`, ts: 1700000010 },
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
    selectDraft: vi.fn(),
  },
  agentRunStoreMock: {
    terminateRun: vi.fn().mockResolvedValue(true),
    closeAgent: vi.fn().mockResolvedValue(undefined),
    connectToAgentStream: vi.fn(),
    disconnectAgentStream: vi.fn(),
  },
  agentTeamRunStoreMock: {
    terminateTeamRun: vi.fn().mockResolvedValue(undefined),
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
  GetWorkspaceRunHistory: 'GetWorkspaceRunHistory',
  GetRunProjection: 'GetRunProjection',
  GetRunFileChanges: 'GetRunFileChanges',
  GetAgentRunResumeConfig: 'GetAgentRunResumeConfig',
  GetTeamRunResumeConfig: 'GetTeamRunResumeConfig',
  GetTeamMemberRunProjection: 'GetTeamMemberRunProjection',
  GetTeamCommunicationMessages: 'GetTeamCommunicationMessages',
  GetTaskDelegationRecords: 'GetTaskDelegationRecords',
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

  const expandTeamDefinitionGroup = async (wrapper: any) => {
    const workspaceRow = wrapper.get('[data-test="workspace-row"][data-workspace-root="/ws/a"]');
    if (workspaceRow.attributes('aria-expanded') !== 'true') {
      await workspaceRow.get('button').trigger('click');
      await flushPromises();
    }

    const teamDefinitionRow = wrapper.get('[data-test="workspace-team-definition-row-team-def-1"]');
    if (teamDefinitionRow.attributes('aria-expanded') !== 'true') {
      await teamDefinitionRow.trigger('click');
      await flushPromises();
    }
  };

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

      if (query === 'GetWorkspaceRunHistory') {
        return {
          data: {
            workspaceRunHistory: buildWorkspaceHistoryResponse().listWorkspaceRunHistory[0],
          },
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
        const memberAddress = String(variables?.memberAddress);
        projectionCalls.push(memberAddress);
        return {
          data: buildProjectionResponse(memberAddress),
          errors: [],
        };
      }

      if (query === 'GetTeamCommunicationMessages') {
        return {
          data: { getTeamCommunicationMessages: [] },
          errors: [],
        };
      }

      if (query === 'GetTaskDelegationRecords') {
        return {
          data: { getTaskDelegationRecords: [] },
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
    await runHistoryStore.fetchTree();
    await flushPromises();

    expect(runHistoryStore.workspaceGroups).toHaveLength(1);
    await expandTeamDefinitionGroup(wrapper);
    await wrapper.get('[data-test="workspace-team-row-team-1"]').trigger('click');
    await flushPromises();

    const hydratedTeam = teamContextsStore.getTeamContextById('team-1') as any;
    expect(hydratedTeam).toBeTruthy();
    expect(hydratedTeam?.executions.getFocusedAddress()).toEqual(
      createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress: '/solution_designer' }),
    );
    const memberAddress = (value: string) => createTeamExecutionAddress({
      rootTeamRunId: 'team-1',
      memberAddress: value,
    });
    expect(hydratedTeam?.executions.getAgentContext(memberAddress('/solution_designer'))?.state.conversation.messages.length).toBe(2);
    expect(hydratedTeam?.executions.getAgentContext(memberAddress('/architect_reviewer'))?.state.conversation.messages.length).toBe(0);
    expect(projectionCalls).toEqual(['/solution_designer']);
    expect(resumeConfigCalls).toBe(1);
    expect(selectionStore.selectedType).toBe('team');
    expect(selectionStore.selectedRunId).toBe('team-1');
    expect(wrapper.find('h4').text()).toBe('solution_designer');

    await wrapper.get('[data-test="workspace-team-member-team-1-/architect_reviewer"]').trigger('click');
    await flushPromises();

    const refocusedTeam = teamContextsStore.getTeamContextById('team-1') as any;
    expect(resumeConfigCalls).toBe(1);
    expect(projectionCalls).toEqual(['/solution_designer', '/architect_reviewer']);
    expect(refocusedTeam?.executions.getFocusedAddress().memberAddress).toBe('/architect_reviewer');
    expect(refocusedTeam?.executions.getAgentContext(memberAddress('/architect_reviewer'))?.state.conversation.messages.length).toBe(2);
    expect(wrapper.find('h4').text()).toBe('architect_reviewer');

    wrapper.unmount();
  });
});
