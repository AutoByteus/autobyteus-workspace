import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent, nextTick } from 'vue';
import type { TeamStreamServerMessage } from '@autobyteus/team-stream-contracts';
import TeamOverviewPanel from '../TeamOverviewPanel.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import {
  applyTestTeamMessage,
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty': 'No delegated tasks yet',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail': 'Delegated work appears here from saved task records.',
};

const TeamCommunicationPanelStub = defineComponent({
  name: 'TeamCommunicationPanel',
  props: ['teamContext', 'focusedAgentRunId'],
  template: '<div data-test="team-communication-panel" />',
});

const task = (taskId: string, targetAgentRunId = `${taskId}-run`) => testTaskRecord({
  taskId,
  delegatorAgentRunId: 'impl-run',
  recipientAddress: '/implementation_engineer',
  target: { agentRunId: targetAgentRunId },
  description: 'Implement the requested change.',
  createdAt: `2026-08-10T12:00:0${taskId.endsWith('1') ? '1' : '2'}.000Z`,
});

const seedActiveTeam = (input: { taskIds?: string[]; teamRunId?: string } = {}) => {
  const teamRunId = input.teamRunId ?? 'team-1';
  const team = buildTestTeamContext({
    teamRunId,
    teamDefinitionName: 'Engineering Team',
    rootChildren: [
      testAgentNode('/implementation_engineer', { agentRunId: 'impl-run' }),
      testAgentNode('/code_reviewer', { agentRunId: 'review-run' }),
    ],
    coordinatorAddress: '/implementation_engineer',
    focusedAgentRunId: 'impl-run',
    isActive: false,
    tasks: (input.taskIds ?? []).map((taskId) => task(taskId)),
    messages: [{
      message_id: 'message-1', sender_agent_run_id: 'impl-run', receiver_agent_run_id: 'review-run',
      content: 'Please review this.', message_type: 'handoff', created_at: '2026-04-12T10:00:00.000Z',
      reference_files: [],
    }],
  });
  useAgentTeamContextsStore().addTeamContext(team);
  useAgentSelectionStore().setRunSelection(teamRunId, 'team');
  return team;
};

const seedNestedTeam = () => {
  const team = buildTestTeamContext({
    teamRunId: 'team-subteam',
    teamDefinitionName: 'Nested Engineering Team',
    rootChildren: [
      testAgentNode('/program_manager', { agentRunId: 'pm-run' }),
      testSubTeamNode('/BuildSquad', [
        testAgentNode('/BuildSquad/review_lead', { agentRunId: 'review-run' }),
      ], { teamRunId: 'build-squad-run', coordinatorAddress: '/BuildSquad/review_lead' }),
    ],
    coordinatorAddress: '/program_manager',
    focusedAgentRunId: 'review-run',
    isActive: false,
    messages: [{
      message_id: 'message-to-review-lead', sender_agent_run_id: 'pm-run', receiver_agent_run_id: 'review-run',
      content: 'Please coordinate this build.', message_type: 'assignment',
      created_at: '2026-04-12T10:00:00.000Z', reference_files: [],
    }],
  });
  useAgentTeamContextsStore().addTeamContext(team);
  useAgentSelectionStore().setRunSelection('team-subteam', 'team');
  return team;
};

const mountSubject = () => mount(TeamOverviewPanel, {
  global: {
    stubs: { TeamCommunicationPanel: TeamCommunicationPanelStub },
    mocks: { $t: (key: string) => labels[key] ?? key },
  },
});
const tasksVisible = (wrapper: ReturnType<typeof mountSubject>) =>
  !(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style') ?? '').includes('display: none');
const messagesVisible = (wrapper: ReturnType<typeof mountSubject>) =>
  !(wrapper.get('[data-test="team-communication-panel"]').attributes('style') ?? '').includes('display: none');

describe('TeamOverviewPanel current execution aggregate', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    seedActiveTeam();
  });

  it('shows exact focused communication count and no removed Task Plan section', () => {
    const wrapper = mountSubject();
    expect(wrapper.text()).not.toContain('Task Plan');
    expect(wrapper.get('[data-test="team-messages-header"]').text()).toContain('1 Messages');
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('0 tasks');
    expect(messagesVisible(wrapper)).toBe(true);
    expect(tasksVisible(wrapper)).toBe(false);
  });

  it('keeps section expansion parent-owned with Messages open first', async () => {
    const wrapper = mountSubject();
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
    expect(messagesVisible(wrapper)).toBe(false);
    expect(tasksVisible(wrapper)).toBe(true);
    await wrapper.get('[data-test="team-messages-header"]').trigger('click');
    expect(messagesVisible(wrapper)).toBe(true);
    expect(tasksVisible(wrapper)).toBe(false);
  });

  it('opens Tasks immediately for a current retained task record', () => {
    seedActiveTeam({ taskIds: ['task_0001'] });
    const wrapper = mountSubject();
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(tasksVisible(wrapper)).toBe(true);
  });

  it('opens Tasks when a current sequenced activation is applied while mounted', async () => {
    const wrapper = mountSubject();
    const team = useAgentTeamContextsStore().activeTeamContext!;
    const record = task('task_0001');
    const message: Extract<TeamStreamServerMessage, { type: 'TASK_DELEGATION_EVENT' }> = {
      type: 'TASK_DELEGATION_EVENT',
      payload: {
        event_type: 'TASK_AGENT_ACTIVATED', change_sequence: 1, parent_team_run_id: 'team-1',
        execution: {
          kind: 'task_agent', address: '/implementation_engineer', agent_run_id: 'task_0001-run',
          platform_agent_run_id: null, started_at: record.created_at, settled_at: null,
        },
        task: record,
      },
    };
    expect(applyTestTeamMessage(team, message).disposition).toBe('applied');
    await nextTick();
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(tasksVisible(wrapper)).toBe(true);
  });

  it('resets Messages open and preserves exact run-based communication focus when selection changes', async () => {
    const wrapper = mountSubject();
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
    const nested = seedNestedTeam();
    await nextTick();
    expect(messagesVisible(wrapper)).toBe(true);
    expect(tasksVisible(wrapper)).toBe(false);
    const panel = wrapper.getComponent({ name: 'TeamCommunicationPanel' });
    expect(panel.props('teamContext')).toBe(nested);
    expect(panel.props('focusedAgentRunId')).toBe('review-run');
    expect(wrapper.get('[data-test="team-messages-header"]').text()).toContain('1 Messages');
  });
});
