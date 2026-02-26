import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamWorkspaceView from '../TeamWorkspaceView.vue';

const {
  state,
  teamContextsStoreMock,
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
  teamId: 'team-1',
  config: {
    teamDefinitionName: 'Class Room Simulation',
    teamDefinitionId: 'team-def-1',
  },
  focusedMemberName: 'coordinator',
  members: new Map<string, any>([
    [
      'coordinator',
      {
        config: { agentDefinitionName: 'Reflective Storyteller' },
        state: {
          currentStatus: 'executing_tool',
          conversation: { agentName: 'Reflective Storyteller' },
        },
      },
    ],
  ]),
  currentStatus: 'idle',
  ...overrides,
});

describe('TeamWorkspaceView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.activeTeamContext = buildTeamContext();
  });

  const mountComponent = () =>
    mount(TeamWorkspaceView, {
      global: {
        stubs: {
          AgentTeamEventMonitor: { template: '<div data-test="team-event-monitor" />' },
          WorkspaceHeaderActions: { template: '<button type="button" data-test="new-agent" @click="$emit(\'new-agent\')" />' },
        },
      },
    });

  it('shows focused member name in header', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('h4').text()).toBe('Reflective Storyteller');
  });

  it('shows focused member status in header', () => {
    const wrapper = mountComponent();

    expect(wrapper.get('[title="Agent Status: Executing Tool"]').exists()).toBe(true);
  });

  it('falls back to focused member route leaf when member display name is unavailable', () => {
    state.activeTeamContext = buildTeamContext({
      focusedMemberName: 'sub-team/researcher',
      members: new Map<string, any>([
        [
          'sub-team/researcher',
          {
            config: { agentDefinitionName: '' },
            state: { conversation: { agentName: '' } },
          },
        ],
      ]),
    });

    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('researcher');
  });

  it('falls back to team name when focused member is not set', () => {
    state.activeTeamContext = buildTeamContext({
      focusedMemberName: '',
    });

    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('Class Room Simulation');
  });

  it('falls back to team status when focused member context is unavailable', () => {
    state.activeTeamContext = buildTeamContext({
      focusedMemberName: 'missing-member',
      members: new Map<string, any>(),
      currentStatus: 'idle',
    });

    const wrapper = mountComponent();
    expect(wrapper.get('[title="Agent Status: Idle"]').exists()).toBe(true);
  });
});
