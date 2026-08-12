import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamWorkspaceView from '../TeamWorkspaceView.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { buildTestTeamContext, testAgentNode, testSubTeamNode } from '~/test-support/currentTeamTestFixtures';

const {
  state,
  teamContextsStoreMock,
  agentDefinitionStoreMock,
  teamRunConfigStoreMock,
  agentRunConfigStoreMock,
  selectionStoreMock,
  workspaceCenterViewStoreMock,
  agentTeamRunStoreMock,
} = vi.hoisted(() => {
  const localState = {
    activeTeamContext: null as any,
  };

  return {
    state: localState,
    teamContextsStoreMock: {
      get activeTeamContext() {
        return localState.activeTeamContext;
      },
      focusMemberAndEnsureHydrated: vi.fn().mockResolvedValue(undefined),
    },
    agentDefinitionStoreMock: {
      agentDefinitions: [
        {
          id: 'agent-professor-def',
          name: 'Professor',
          avatarUrl: 'https://example.com/professor.png',
        },
      ],
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
      getAgentDefinitionById: vi.fn((id: string) => {
        if (id === 'agent-professor-def') {
          return {
            id: 'agent-professor-def',
            name: 'Professor',
            avatarUrl: 'https://example.com/professor.png',
          };
        }
        return null;
      }),
    },
    teamRunConfigStoreMock: {
      setConfig: vi.fn(),
    },
    agentRunConfigStoreMock: {
      clearConfig: vi.fn(),
    },
    selectionStoreMock: {
      clearSelection: vi.fn(),
    },
    workspaceCenterViewStoreMock: {
      showConfig: vi.fn(),
    },
    agentTeamRunStoreMock: {
      sendMessageToFocusedMember: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock('~/stores/agentTeamContextsStore', () => ({
  useAgentTeamContextsStore: () => teamContextsStoreMock,
}));

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStoreMock,
}));

vi.mock('~/stores/teamRunConfigStore', () => ({
  useTeamRunConfigStore: () => teamRunConfigStoreMock,
}));

vi.mock('~/stores/agentRunConfigStore', () => ({
  useAgentRunConfigStore: () => agentRunConfigStoreMock,
}));

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => selectionStoreMock,
}));

vi.mock('~/stores/workspaceCenterViewStore', () => ({
  useWorkspaceCenterViewStore: () => workspaceCenterViewStoreMock,
}));

vi.mock('~/stores/agentTeamRunStore', () => ({
  useAgentTeamRunStore: () => agentTeamRunStoreMock,
}));

const buildAgentMemberNode = (memberAddress: string, displayName: string, agentRunId: string, agentDefinitionId: string) => testAgentNode(
  memberAddress.startsWith('/') ? memberAddress : `/${memberAddress}`,
  {
  displayName,
  agentRunId,
  agentDefinitionId,
  },
);

const buildTeamContext = (input: {
  focusedMemberAddress?: string;
  configuration?: Record<string, any>;
} = {}) => {
  const professorNode = buildAgentMemberNode('Professor', 'Professor', 'professor-run', 'agent-professor-def');
  const studentNode = buildAgentMemberNode('Student', 'Student', 'student-run', 'agent-student-def');

  return buildTestTeamContext({
    teamRunId: 'team-1',
    teamDefinitionName: 'Class Room Simulation',
    teamDefinitionId: 'team-def-1',
    rootChildren: [
      { ...professorNode, currentStatus: AgentStatus.Running },
      { ...studentNode, currentStatus: AgentStatus.Idle },
    ],
    coordinatorAddress: '/Professor',
    focusedExecutionAddress: createTeamExecutionAddress({
      rootTeamRunId: 'team-1',
      memberAddress: input.focusedMemberAddress ?? '/Professor',
    }),
    isActive: true,
    configuration: input.configuration,
  });
};

describe('TeamWorkspaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.activeTeamContext = buildTeamContext();
  });

  const mountComponent = () => mount(TeamWorkspaceView, {
    global: {
      stubs: {
        AgentTeamEventMonitor: { template: '<div data-test="team-event-monitor"><slot name="composerContext" /></div>' },
        SkillImprovementComposerCta: {
          props: ['target'],
          template: '<div data-test="skill-improvement-cta" :data-kind="target && target.kind" :data-team-run-id="target && target.teamRunId" :data-agent-run-id="target && target.agentRunId" />',
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
        TokenUsageHeaderChip: { template: '<div data-test="token-usage-header-chip" />' },
        AgentStatusDisplay: {
          props: ['status'],
          template: '<div data-test="header-status">{{ status }}</div>',
        },
      },
    },
  });

  it('shows focused member name in header', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('Professor');
  });

  it('does not render the token usage header chip', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-test="token-usage-header-chip"]').exists()).toBe(false);
  });

  it('shows focused member status in header', () => {
    const wrapper = mountComponent();
    expect(wrapper.get('[data-test="header-status"]').text()).toBe(AgentStatus.Running);
  });

  it('shows focused member avatar in header when available', () => {
    const wrapper = mountComponent();
    const avatar = wrapper.find('img[alt="Professor avatar"]');
    expect(avatar.exists()).toBe(true);
    expect(avatar.attributes('src')).toBe('https://example.com/professor.png');
  });

  it('rejects an unresolved initial focus instead of substituting another identity', () => {
    expect(() => buildTeamContext({ focusedMemberAddress: '/missing-member' }))
      .toThrow('Initial Team focus must resolve to an Agent.');
  });

  it('shows roster focus in the header when active execution falls back to the coordinator', () => {
    const context = buildTeamContext({ focusedMemberAddress: '/Student' });
    context.executions.getAgentContext(createTeamExecutionAddress({
      rootTeamRunId: 'team-1', memberAddress: '/Student',
    }))!.state.currentStatus = AgentStatus.Initializing;
    state.activeTeamContext = context;

    const wrapper = mountComponent();

    expect(wrapper.find('h4').text()).toBe('Student');
    expect(wrapper.get('[data-test="header-status"]').text()).toBe(AgentStatus.Initializing);
  });

  it('keeps roster focus in the header after simplifying the shell controls', () => {
    state.activeTeamContext = buildTeamContext({ focusedMemberAddress: '/Student' });

    const wrapper = mountComponent();

    expect(wrapper.find('h4').text()).toBe('Student');
  });

  it('opens selected team config from header action', async () => {
    const wrapper = mountComponent();
    await wrapper.get('[data-test="edit-config"]').trigger('click');
    expect(workspaceCenterViewStoreMock.showConfig).toHaveBeenCalledTimes(1);
  });

  it('seeds a new team config from the selected run without sharing nested global or member llmConfig', async () => {
    state.activeTeamContext = buildTeamContext({
      configuration: {
        teamDefinitionName: 'Class Room Simulation',
        teamDefinitionId: 'team-def-1',
        llmModelIdentifier: 'gpt-5.4',
        runtimeKind: 'codex_app_server',
        workspaceId: 'ws-1',
        autoExecuteTools: true,
        skillAccessMode: 'PRELOADED_ONLY',
        isLocked: true,
        llmConfig: {
          reasoning_effort: 'xhigh',
          nested: { values: ['xhigh'] },
        },
        memberOverrides: {
          '/Professor': {
            agentDefinitionId: 'agent-professor-def',
            llmModelIdentifier: 'gpt-5.3-codex',
            llmConfig: {
              reasoning_effort: 'medium',
              nested: { values: ['medium'] },
            },
          },
        },
      },
    });

    const sourceConfig = state.activeTeamContext.topology.getConfigurationView();
    const wrapper = mountComponent();
    await wrapper.get('[data-test="new-agent"]').trigger('click');

    const seed = teamRunConfigStoreMock.setConfig.mock.calls[0]?.[0];
    expect(seed).toEqual(expect.objectContaining({
      isLocked: false,
      llmConfig: {
        reasoning_effort: 'xhigh',
        nested: { values: ['xhigh'] },
      },
      memberOverrides: expect.objectContaining({
        '/Professor': expect.objectContaining({
          llmConfig: {
            reasoning_effort: 'medium',
            nested: { values: ['medium'] },
          },
        }),
      }),
    }));

    (seed.llmConfig.nested.values as string[]).push('mutated');
    (seed.memberOverrides['/Professor'].llmConfig.nested.values as string[]).push('mutated');
    expect(sourceConfig.llmConfig.nested.values).toEqual(['xhigh']);
    expect(sourceConfig.memberOverrides['/Professor'].llmConfig.nested.values).toEqual(['medium']);
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalledTimes(1);
    expect(selectionStoreMock.clearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders the focused monitor directly', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-test="team-event-monitor"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="team-delegated-task-executions-bar"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="agent-user-input-form"]').exists()).toBe(false);
  });

  it('passes the focused member run to the composer skill-improvement CTA', () => {
    const wrapper = mountComponent();
    const cta = wrapper.get('[data-test="skill-improvement-cta"]');
    expect(cta.attributes('data-kind')).toBe('team-member');
    expect(cta.attributes('data-team-run-id')).toBe('team-1');
    expect(cta.attributes('data-agent-run-id')).toBe('professor-run');
  });

  it('keeps focus on an exact Agent and does not substitute a non-focusable AgentTeam', () => {
    const professorNode = buildAgentMemberNode('/Professor', 'Professor', 'professor-run', 'agent-professor-def');
    const studentNode = buildAgentMemberNode('/subteam/student', 'Student', 'student-run', 'agent-student-def');
    const subteamNode = testSubTeamNode('/subteam', [studentNode], {
      displayName: 'Review Subteam',
      teamRunId: 'subteam-run',
      coordinatorAddress: '/subteam/student',
    });

    state.activeTeamContext = buildTestTeamContext({
        teamRunId: 'team-1',
        teamDefinitionId: 'team-def-1',
        teamDefinitionName: 'Class Room Simulation',
        rootChildren: [professorNode, subteamNode],
        coordinatorAddress: '/professor',
        focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: 'team-1', memberAddress: '/Professor' }),
    });

    const wrapper = mountComponent();

    expect(wrapper.find('h4').text()).toBe('Professor');
    expect(wrapper.find('[data-test="agent-user-input-form"]').exists()).toBe(false);
    expect(wrapper.find('textarea').exists()).toBe(false);
    expect(agentTeamRunStoreMock.sendMessageToFocusedMember).not.toHaveBeenCalled();
  });
});
