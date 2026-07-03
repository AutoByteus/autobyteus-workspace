import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamWorkspaceView from '../TeamWorkspaceView.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

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
    activeExecutionFocusedMemberRouteKey: '' as string,
  };

  return {
    state: localState,
    teamContextsStoreMock: {
      get activeTeamContext() {
        return localState.activeTeamContext;
      },
      get activeExecutionFocusedMemberRouteKey() {
        return localState.activeExecutionFocusedMemberRouteKey;
      },
      get activeExecutionFocusedMemberContext() {
        const routeKey = teamContextsStoreMock.activeExecutionFocusedMemberRouteKey;
        return routeKey
          ? localState.activeTeamContext?.leafAgentContextsByRouteKey.get(routeKey) ?? null
          : null;
      },
      get activeExecutionFocusedMemberNode() {
        const routeKey = teamContextsStoreMock.activeExecutionFocusedMemberRouteKey;
        return routeKey
          ? localState.activeTeamContext?.memberNodesByRouteKey.get(routeKey) ?? null
          : null;
      },
      setFocusedMember: vi.fn(),
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

const buildAgentMemberNode = (memberRouteKey: string, displayName: string, memberRunId: string, agentDefinitionId: string) => ({
  memberKind: 'agent',
  memberName: memberRouteKey,
  displayName,
  memberPath: [memberRouteKey],
  memberRouteKey,
  memberRunId,
  agentDefinitionId,
});

const buildTeamContext = (overrides: Record<string, any> = {}) => {
  const professorNode = buildAgentMemberNode('professor', 'Professor', 'professor-run', 'agent-professor-def');
  const studentNode = buildAgentMemberNode('student', 'Student', 'student-run', 'agent-student-def');

  return {
    teamRunId: 'team-1',
    config: {
      teamDefinitionName: 'Class Room Simulation',
      teamDefinitionId: 'team-def-1',
    },
    focusedMemberRouteKey: 'professor',
    memberTree: [professorNode, studentNode],
    memberNodesByRouteKey: new Map<string, any>([
      ['professor', professorNode],
      ['student', studentNode],
    ]),
    leafAgentContextsByRouteKey: new Map<string, any>([
      ['professor', {
        config: {
          agentDefinitionId: 'agent-professor-def',
          agentDefinitionName: 'Professor',
          agentAvatarUrl: null,
        },
        state: {
          runId: 'professor-run',
          currentStatus: AgentStatus.Running,
          conversation: { agentName: 'Professor', messages: [] },
        },
      }],
      ['student', {
        config: {
          agentDefinitionId: 'agent-student-def',
          agentDefinitionName: 'Student',
          agentAvatarUrl: null,
        },
        state: {
          runId: 'student-run',
          currentStatus: AgentStatus.Idle,
          conversation: { agentName: 'Student', messages: [] },
        },
      }],
    ]),
    currentStatus: AgentTeamStatus.Idle,
    ...overrides,
  };
};

describe('TeamWorkspaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.activeTeamContext = buildTeamContext();
    state.activeExecutionFocusedMemberRouteKey = 'professor';
  });

  const mountComponent = () => mount(TeamWorkspaceView, {
    global: {
      stubs: {
        AgentTeamEventMonitor: { template: '<div data-test="team-event-monitor"><slot name="composerContext" /></div>' },
        SelfEvolutionComposerCta: {
          props: ['target'],
          template: '<div data-test="self-evolution-cta" :data-kind="target && target.kind" :data-team-run-id="target && target.teamRunId" :data-member-run-id="target && target.memberRunId" />',
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

  it('falls back to the team title when no active execution focus is available', () => {
    state.activeTeamContext = buildTeamContext({
      focusedMemberRouteKey: 'missing-member',
      memberTree: [],
      memberNodesByRouteKey: new Map<string, any>(),
      leafAgentContextsByRouteKey: new Map<string, any>(),
    });
    state.activeExecutionFocusedMemberRouteKey = '';
    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('Class Room Simulation');
  });

  it('shows roster focus in the header when active execution falls back to the coordinator', () => {
    const context = buildTeamContext({
      coordinatorMemberRouteKey: 'professor',
      focusedMemberRouteKey: 'student',
    });
    context.leafAgentContextsByRouteKey.get('student').state.currentStatus = AgentStatus.Initializing;
    state.activeTeamContext = context;
    state.activeExecutionFocusedMemberRouteKey = 'professor';

    const wrapper = mountComponent();

    expect(wrapper.find('h4').text()).toBe('Student');
    expect(wrapper.get('[data-test="header-status"]').text()).toBe(AgentStatus.Initializing);
  });

  it('keeps roster focus in the header after simplifying the shell controls', () => {
    state.activeTeamContext = buildTeamContext({
      coordinatorMemberRouteKey: 'professor',
      focusedMemberRouteKey: 'student',
    });
    state.activeExecutionFocusedMemberRouteKey = 'professor';

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
      config: {
        teamDefinitionName: 'Class Room Simulation',
        teamDefinitionId: 'team-def-1',
        llmModelIdentifier: 'gpt-5.4',
        runtimeKind: 'codex_app_server',
        workspaceId: 'ws-1',
        autoExecuteTools: true,
        skillAccessMode: 'GLOBAL_DISCOVERY',
        isLocked: true,
        llmConfig: {
          reasoning_effort: 'xhigh',
          nested: { values: ['xhigh'] },
        },
        memberOverrides: {
          professor: {
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

    const sourceConfig = state.activeTeamContext.config;
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
        professor: expect.objectContaining({
          llmConfig: {
            reasoning_effort: 'medium',
            nested: { values: ['medium'] },
          },
        }),
      }),
    }));

    (seed.llmConfig.nested.values as string[]).push('mutated');
    (seed.memberOverrides.professor.llmConfig.nested.values as string[]).push('mutated');
    expect(sourceConfig.llmConfig.nested.values).toEqual(['xhigh']);
    expect(sourceConfig.memberOverrides.professor.llmConfig.nested.values).toEqual(['medium']);
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalledTimes(1);
    expect(selectionStoreMock.clearSelection).toHaveBeenCalledTimes(1);
  });

  it('renders the focused monitor directly', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-test="team-event-monitor"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="team-delegated-task-executions-bar"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="agent-user-input-form"]').exists()).toBe(false);
  });

  it('passes the focused member run to the composer self-evolution CTA', () => {
    const wrapper = mountComponent();
    const cta = wrapper.get('[data-test="self-evolution-cta"]');
    expect(cta.attributes('data-kind')).toBe('team-member');
    expect(cta.attributes('data-team-run-id')).toBe('team-1');
    expect(cta.attributes('data-member-run-id')).toBe('professor-run');
  });

  it('preserves the shared composer only for a focused subteam', async () => {
    const professorNode = buildAgentMemberNode('professor', 'Professor', 'professor-run', 'agent-professor-def');
    const studentNode = buildAgentMemberNode('subteam/student', 'Student', 'student-run', 'agent-student-def');
    const subteamNode = {
      memberKind: 'agent_team',
      memberName: 'subteam',
      displayName: 'Review Subteam',
      memberPath: ['subteam'],
      memberRouteKey: 'subteam',
      children: [studentNode],
    };

    state.activeTeamContext = buildTeamContext({
      focusedMemberRouteKey: 'subteam',
      memberTree: [professorNode, subteamNode],
      memberNodesByRouteKey: new Map<string, any>([
        ['professor', professorNode],
        ['subteam', subteamNode],
        ['subteam/student', studentNode],
      ]),
      leafAgentContextsByRouteKey: new Map<string, any>([
        ['professor', {
          config: {
            agentDefinitionId: 'agent-professor-def',
            agentDefinitionName: 'Professor',
            agentAvatarUrl: null,
          },
          state: {
            runId: 'professor-run',
            currentStatus: AgentStatus.Running,
            conversation: { agentName: 'Professor', messages: [] },
          },
        }],
        ['subteam/student', {
          config: {
            agentDefinitionId: 'agent-student-def',
            agentDefinitionName: 'Student',
            agentAvatarUrl: null,
          },
          state: {
            runId: 'student-run',
            currentStatus: AgentStatus.Idle,
            conversation: { agentName: 'Student', messages: [] },
          },
        }],
      ]),
    });
    state.activeExecutionFocusedMemberRouteKey = 'professor';

    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('Replying to');
    expect(wrapper.text()).toContain('Review Subteam');
    expect(wrapper.find('[data-test="agent-user-input-form"]').exists()).toBe(false);
    expect(wrapper.find('textarea').exists()).toBe(true);

    await wrapper.find('textarea').setValue('hello subteam');
    await wrapper.get('button[type="submit"]').trigger('submit');

    expect(agentTeamRunStoreMock.sendMessageToFocusedMember).toHaveBeenCalledWith('hello subteam', []);
  });
});
