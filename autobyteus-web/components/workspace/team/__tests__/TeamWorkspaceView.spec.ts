import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import TeamWorkspaceView from '../TeamWorkspaceView.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  buildTestTeamContext,
  testAgentNode,
} from '~/test-support/currentTeamTestFixtures';
import { createPinia, setActivePinia } from 'pinia';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { useTeamStreamRecoveryStore } from '~/stores/teamStreamRecoveryStore';

const { state, teamContextsStoreMock, agentDefinitionStoreMock, teamRunConfigStoreMock,
  agentRunConfigStoreMock, selectionStoreMock, workspaceCenterViewStoreMock } = vi.hoisted(() => {
  const localState = { activeTeamContext: null as any };
  return {
    state: localState,
    // The Team's own focus; no run it delegated is selected in its tree (autobyteus-461 SR-084).
    teamContextsStoreMock: { get activeTeamContext() { return localState.activeTeamContext; }, delegatedFocusOf: () => null, selectedTreeRowOf: () => null },
    agentDefinitionStoreMock: {
      agentDefinitions: [{ id: 'agent-professor-def', name: 'Professor', avatarUrl: 'https://example.com/professor.png' }],
      fetchAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
      getAgentDefinitionById: vi.fn((id: string) => id === 'agent-professor-def'
        ? { id, name: 'Professor', avatarUrl: 'https://example.com/professor.png' }
        : null),
    },
    teamRunConfigStoreMock: { setConfig: vi.fn() },
    agentRunConfigStoreMock: { clearConfig: vi.fn() },
    selectionStoreMock: { selectedType: 'team', subject: null, beginSelectionIntent: vi.fn(() => ({ isCurrent: () => true })), clearSelection: vi.fn() },
    workspaceCenterViewStoreMock: { showConfig: vi.fn() },
  };
});

vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({ refreshTeamResumeConfig: async () => ({ teamRunId: 'team-1', executionTree: state.activeTeamContext.view.getExecutionTree() }), resolveWorkspaceMetadataByRootPath: async (path: string) => ({ workspaceId: 'ws-1', workspaceRootPath: path, displayName: 'Workspace', kind: 'filesystem' }) }) }));

vi.mock('~/stores/agentTeamContextsStore', () => ({ useAgentTeamContextsStore: () => teamContextsStoreMock }));
vi.mock('~/stores/agentDefinitionStore', () => ({ useAgentDefinitionStore: () => agentDefinitionStoreMock }));
vi.mock('~/stores/teamRunConfigStore', () => ({ useTeamRunConfigStore: () => teamRunConfigStoreMock }));
vi.mock('~/stores/agentRunConfigStore', () => ({ useAgentRunConfigStore: () => agentRunConfigStoreMock }));
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => selectionStoreMock }));
vi.mock('~/stores/workspaceCenterViewStore', () => ({ useWorkspaceCenterViewStore: () => workspaceCenterViewStoreMock }));
const copyTeamRun = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('~/composables/runSettings/useRunStart', () => ({ useRunStart: () => ({ copyTeamRun }) }));

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
    setActivePinia(createPinia());
    vi.clearAllMocks();
    state.activeTeamContext = buildTeamContext();
  });
  afterEach(async () => { await localizationRuntime.setPreference('en'); });

  const mountComponent = () => mount(TeamWorkspaceView, {
    global: { mocks: { $t: (key: string) => key }, stubs: {
      AgentTeamEventMonitor: { template: '<div data-test="team-event-monitor"><slot name="composerContext" /></div>' },
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
    expect(wrapper.find('[data-testid="agent-event-monitor"]').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'AgentEventMonitor' }).props('runId')).toBe('professor-run');
  });

  it('renders a different exact focused AgentRun without coordinator substitution', () => {
    state.activeTeamContext = buildTeamContext({ focusedAgentRunId: 'student-run' });
    state.activeTeamContext.view.getAgentContext('student-run').state.currentStatus = AgentStatus.Initializing;
    const wrapper = mountComponent();
    expect(wrapper.find('h4').text()).toBe('Student');
    expect(wrapper.get('[data-test="header-status"]').text()).toBe(AgentStatus.Initializing);
  });

  // autobyteus-541 D-A5: the stream recovers by itself; the view says so only after it keeps failing (the fifth time).
  it.each(['required', 'recovering'] as const)('shows no notice while the Team stream recovery is %s', async (progress) => {
    useTeamStreamRecoveryStore().$patch({ states: { 'team-1': progress } });
    const wrapper = mountComponent();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it.each([
    ['en', 'Live updates could not recover automatically. Select this Team member again to reload the complete conversation.'],
    ['zh-CN', '实时更新无法自动恢复。请再次选择此团队成员，以重新加载完整对话。'],
  ] as const)('shows the %s notice once the recovery keeps failing', async (locale, text) => {
    await localizationRuntime.setPreference(locale);
    useTeamStreamRecoveryStore().$patch({ states: { 'team-1': 'exhausted' } });
    const wrapper = mountComponent();
    expect(wrapper.get('[role="alert"]').text()).toBe(text);
    useTeamStreamRecoveryStore().clear('team-1');
    await flushPromises();
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
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

  it('＋ opens New chat copied from this Team run (REQ-013), with the run’s workspaces as hints', async () => {
    state.activeTeamContext = buildTestTeamContext({
      teamRunId: 'team-1', teamDefinitionName: 'Class Room Simulation', teamDefinitionId: 'team-def-1',
      rootChildren: [buildAgent('/Professor', 'Professor', 'professor-run', 'agent-professor-def')],
      coordinatorAddress: '/Professor', isActive: true,
      workspaceRootPath: '/workspace/team', configuration: { workspaceId: 'ws-1' },
    });
    const wrapper = mountComponent();
    await wrapper.get('[data-test="new-agent"]').trigger('click');
    await flushPromises();
    expect(copyTeamRun).toHaveBeenCalledWith(expect.objectContaining({ teamRunId: 'team-1', teamDefinitionId: 'team-def-1' }));
  });

});
