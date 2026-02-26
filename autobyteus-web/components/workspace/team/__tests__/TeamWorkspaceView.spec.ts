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

const buildTeamContext = (overrides: Record<string, any> = {}) => ({
  teamRunId: 'team-1',
  config: {
    teamDefinitionName: 'Class Room Simulation',
    teamDefinitionId: 'team-def-1',
  },
  focusedMemberName: 'professor',
  members: new Map<string, any>([
    [
      'professor',
      {
        config: {
          agentDefinitionId: 'agent-professor-def',
          agentDefinitionName: 'Professor',
          agentAvatarUrl: null,
        },
        state: {
          currentStatus: AgentStatus.ExecutingTool,
          conversation: { agentName: 'Professor' },
        },
      },
    ],
  ]),
  currentStatus: AgentTeamStatus.Idle,
  ...overrides,
});

describe('TeamWorkspaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.activeTeamContext = buildTeamContext();
  });

  const mountComponent = () => mount(TeamWorkspaceView, {
    global: {
      stubs: {
        AgentTeamEventMonitor: { template: '<div data-test="team-event-monitor" />' },
        WorkspaceHeaderActions: { template: '<button type="button" data-test="new-agent" @click="$emit(\'new-agent\')" />' },
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

  it('shows focused member status in header', () => {
    const wrapper = mountComponent();
    expect(wrapper.get('[data-test="header-status"]').text()).toBe(AgentStatus.ExecutingTool);
  });

  it('shows focused member avatar in header when available', () => {
    const wrapper = mountComponent();
    const avatar = wrapper.find('img[alt="Professor avatar"]');
    expect(avatar.exists()).toBe(true);
    expect(avatar.attributes('src')).toBe('https://example.com/professor.png');
  });

  it('falls back to focused route key when focused member context is missing', () => {
    state.activeTeamContext = buildTeamContext({
      focusedMemberName: 'missing-member',
      members: new Map<string, any>(),
    });
    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('missing-member');
  });
});
