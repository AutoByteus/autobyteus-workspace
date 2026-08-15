import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamWorkspaceView from '../TeamWorkspaceView.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildTestTeamContext, testAgentNode, testSubTeamNode } from '~/test-support/currentTeamTestFixtures';

const { state, teamContextsStoreMock, agentDefinitionStoreMock, teamRunConfigStoreMock,
  agentRunConfigStoreMock, selectionStoreMock, workspaceCenterViewStoreMock } = vi.hoisted(() => {
  const localState = { activeTeamContext: null as any };
  return {
    state: localState,
    teamContextsStoreMock: { get activeTeamContext() { return localState.activeTeamContext; } },
    agentDefinitionStoreMock: {
      agentDefinitions: [{ id: 'agent-professor-def', name: 'Professor', avatarUrl: 'https://example.com/professor.png' }],
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
      getAgentDefinitionById: vi.fn((id: string) => id === 'agent-professor-def'
        ? { id, name: 'Professor', avatarUrl: 'https://example.com/professor.png' }
        : null),
    },
    teamRunConfigStoreMock: { setConfig: vi.fn() },
    agentRunConfigStoreMock: { clearConfig: vi.fn() },
    selectionStoreMock: { clearSelection: vi.fn() },
    workspaceCenterViewStoreMock: { showConfig: vi.fn() },
  };
});

vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => teamContextsStoreMock }));
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => agentDefinitionStoreMock }));
vi.mock('~/stores/teamRunConfigStore', () => ({ useTeamRunConfigStore: () => teamRunConfigStoreMock }));
vi.mock('~/stores/agentRunConfigStore', () => ({ useAgentRunConfigStore: () => agentRunConfigStoreMock }));
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => selectionStoreMock }));
vi.mock('~/stores/workspaceCenterViewStore', () => ({ useWorkspaceCenterViewStore: () => workspaceCenterViewStoreMock }));

const buildAgent = (address: string, displayName: string, agentRunId: string, agentDefinitionId: string) =>
  testAgentNode(address, { displayName, agentRunId, agentDefinitionId });

const buildTeamContext = (input: { focusedAgentRunId?: string; configuration?: Record<string, any> } = {}) =>
  buildTestTeamContext({
    teamRunId: 'team-1', teamDefinitionName: 'Class Room Simulation', teamDefinitionId: 'team-def-1',
    rootChildren: [
      { ...buildAgent('/Professor', 'Professor', 'professor-run', 'agent-professor-def'), currentStatus: AgentStatus.Running },
      { ...buildAgent('/Student', 'Student', 'student-run', 'agent-student-def'), currentStatus: AgentStatus.Idle },
    ],
    coordinatorAddress: '/Professor', focusedAgentRunId: input.focusedAgentRunId ?? 'professor-run',
    isActive: true, configuration: input.configuration,
  });

describe('TeamWorkspaceView current aggregate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.activeTeamContext = buildTeamContext();
  });

  const mountComponent = () => mount(TeamWorkspaceView, {
    global: { stubs: {
      AgentTeamEventMonitor: { template: '<div data-test="team-event-monitor"><slot name="composerContext" /></div>' },
      SkillImprovementComposerCta: {
        props: ['target'],
        template: '<div data-test="skill-improvement-cta" :data-kind="target && target.kind" :data-team-run-id="target && target.teamRunId" :data-agent-run-id="target && target.agentRunId" />',
      },
      WorkspaceHeaderActions: {
        template: '<div><button data-test="new-agent" @click="$emit(\'new-agent\')" /><button data-test="edit-config" @click="$emit(\'edit-config\')" /></div>',
      },
      AgentStatusDisplay: { props: ['status'], template: '<div data-test="header-status">{{ status }}</div>' },
    } },
  });

  it('renders exact focused Agent identity, status, avatar, and composer target from the current view', () => {
    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('Professor');
    expect(wrapper.get('[data-test="header-status"]').text()).toBe(AgentStatus.Running);
    expect(wrapper.get('img[alt="Professor avatar"]').attributes('src')).toBe('https://example.com/professor.png');
    expect(wrapper.get('[data-test="team-event-monitor"]').exists()).toBe(true);
    const cta = wrapper.get('[data-test="skill-improvement-cta"]');
    expect(cta.attributes()).toMatchObject({
      'data-kind': 'team-member', 'data-team-run-id': 'team-1', 'data-agent-run-id': 'professor-run',
    });
  });

  it('renders a different exact focused AgentRun without coordinator substitution', () => {
    state.activeTeamContext = buildTeamContext({ focusedAgentRunId: 'student-run' });
    state.activeTeamContext.view.getAgentContext('student-run').state.currentStatus = AgentStatus.Initializing;
    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('Student');
    expect(wrapper.get('[data-test="header-status"]').text()).toBe(AgentStatus.Initializing);
  });

  it('rejects an unresolved initial AgentRun focus instead of substituting another identity', () => {
    expect(() => buildTeamContext({ focusedAgentRunId: 'missing-run' }))
      .toThrow('Initial focused AgentRun is missing.');
  });

  it('opens selected Team configuration from the header action', async () => {
    const wrapper = mountComponent();
    await wrapper.get('[data-test="edit-config"]').trigger('click');
    expect(workspaceCenterViewStoreMock.showConfig).toHaveBeenCalledTimes(1);
  });

  it('seeds an editable new Team configuration without sharing nested LLM config state', async () => {
    state.activeTeamContext = buildTeamContext({ configuration: {
      teamDefinitionName: 'Class Room Simulation', teamDefinitionId: 'team-def-1',
      llmModelIdentifier: 'gpt-5.4', runtimeKind: 'codex_app_server', workspaceId: 'ws-1',
      autoExecuteTools: true, skillAccessMode: 'PRELOADED_ONLY', isLocked: true,
      llmConfig: { reasoning_effort: 'xhigh', nested: { values: ['xhigh'] } },
      memberOverrides: { '/Professor': {
        agentDefinitionId: 'agent-professor-def', llmModelIdentifier: 'gpt-5.3-codex',
        llmConfig: { reasoning_effort: 'medium', nested: { values: ['medium'] } },
      } },
    } });
    const sourceConfig = state.activeTeamContext.view.getConfigurationView();
    const wrapper = mountComponent();
    await wrapper.get('[data-test="new-agent"]').trigger('click');
    const seed = teamRunConfigStoreMock.setConfig.mock.calls[0]?.[0];
    expect(seed).toEqual(expect.objectContaining({ isLocked: false }));
    seed.llmConfig.nested.values.push('mutated');
    seed.memberOverrides['/Professor'].llmConfig.nested.values.push('mutated');
    expect((sourceConfig.llmConfig as any).nested.values).toEqual(['xhigh']);
    expect((sourceConfig.memberOverrides['/Professor']!.llmConfig as any).nested.values).toEqual(['medium']);
    expect(agentRunConfigStoreMock.clearConfig).toHaveBeenCalledTimes(1);
    expect(selectionStoreMock.clearSelection).toHaveBeenCalledTimes(1);
  });

  it('keeps configured Team placement non-focusable while retaining its exact Agent child focus', () => {
    const professor = buildAgent('/Professor', 'Professor', 'professor-run', 'agent-professor-def');
    const student = buildAgent('/subteam/student', 'Student', 'student-run', 'agent-student-def');
    state.activeTeamContext = buildTestTeamContext({
      teamRunId: 'team-1', teamDefinitionId: 'team-def-1', teamDefinitionName: 'Class Room Simulation',
      rootChildren: [professor, testSubTeamNode('/subteam', [student], {
        displayName: 'Review Subteam', teamRunId: 'subteam-run', coordinatorAddress: '/subteam/student',
      })],
      coordinatorAddress: '/Professor', focusedAgentRunId: 'student-run',
    });
    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('student');
    expect(wrapper.get('[data-test="skill-improvement-cta"]').attributes('data-agent-run-id')).toBe('student-run');
  });
});
