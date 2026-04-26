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
  teamWorkspaceViewStoreMock,
} = vi.hoisted(() => {
  const localState = {
    activeTeamContext: null as any,
    currentMode: 'focus' as 'focus' | 'grid' | 'spotlight',
  };

  return {
    state: localState,
    teamContextsStoreMock: {
      get activeTeamContext() {
        return localState.activeTeamContext;
      },
      setFocusedMember: vi.fn(),
      focusMemberAndEnsureHydrated: vi.fn().mockResolvedValue(undefined),
      ensureHistoricalMembersHydratedForView: vi.fn().mockResolvedValue(undefined),
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
    teamWorkspaceViewStoreMock: {
      getMode: vi.fn(() => localState.currentMode),
      setMode: vi.fn((_: string, mode: 'focus' | 'grid' | 'spotlight') => {
        localState.currentMode = mode;
      }),
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

vi.mock('~/stores/teamWorkspaceViewStore', () => ({
  useTeamWorkspaceViewStore: () => teamWorkspaceViewStoreMock,
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
          conversation: { agentName: 'Professor', messages: [] },
        },
      },
    ],
    [
      'student',
      {
        config: {
          agentDefinitionId: 'agent-student-def',
          agentDefinitionName: 'Student',
          agentAvatarUrl: null,
        },
        state: {
          currentStatus: AgentStatus.Idle,
          conversation: { agentName: 'Student', messages: [] },
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
    state.currentMode = 'focus';
    state.activeTeamContext = buildTeamContext();
  });

  const mountComponent = () => mount(TeamWorkspaceView, {
    global: {
      stubs: {
        AgentTeamEventMonitor: { template: '<div data-test="team-event-monitor" />' },
        TeamGridView: {
          template: '<button type="button" data-test="team-grid" @click="$emit(\'select-member\', \'student\')" />',
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

  it('renders the focused monitor in focus mode by default', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('[data-test="team-event-monitor"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="agent-user-input-form"]').exists()).toBe(false);
  });

  it('sets the requested mode from the mode switcher', async () => {
    const wrapper = mountComponent();
    await wrapper.get('[data-test="mode-switch"]').trigger('click');
    expect(teamWorkspaceViewStoreMock.setMode).toHaveBeenCalledWith('team-1', 'grid');
  });

  it('shows shared composer in grid mode and routes tile focus changes', async () => {
    state.currentMode = 'grid';
    const wrapper = mountComponent();
    expect(wrapper.find('[data-test="team-grid"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Replying to');
    expect(wrapper.text()).toContain('Professor');
    expect(wrapper.find('[data-test="agent-user-input-form"]').exists()).toBe(true);

    await wrapper.get('[data-test="team-grid"]').trigger('click');
    expect(teamContextsStoreMock.focusMemberAndEnsureHydrated).toHaveBeenCalledWith('team-1', 'student');
    expect(teamContextsStoreMock.ensureHistoricalMembersHydratedForView).toHaveBeenCalledWith('team-1', 'grid');
  });
});
