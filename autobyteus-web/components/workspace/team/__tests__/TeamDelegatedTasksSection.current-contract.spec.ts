import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { describe, expect, it } from 'vitest';
import TeamDelegatedTasksSection from '../TeamDelegatedTasksSection.vue';
import { handleTaskExecutionProjectionMessage } from '~/services/agentStreaming/teamTaskExecutionEventRouter';
import {
  buildCurrentTaskExecutionTeam,
  taskAgentAddress,
  taskAgentEvent,
  taskTeamEvent,
} from '~/services/agentStreaming/__tests__/currentTaskExecutionFixture';
import { useTaskDelegationStore } from '~/stores/taskDelegationStore';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty': 'No delegated tasks yet',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail': 'Delegated work appears here.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.description_unavailable': 'Task description unavailable',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.technical_details': 'Technical details',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.select_task': 'Select a task to read it.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_type': 'Task type',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target_kind': 'Target kind',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target': 'Target',
};

describe('TeamDelegatedTasksSection current task execution contract', () => {
  it('shows the real task count and distinct task Agent/AgentTeam details from exact projections', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const team = buildCurrentTaskExecutionTeam();
    expect(handleTaskExecutionProjectionMessage(team, taskTeamEvent() as any)).toMatchObject({ outcome: 'handled' });
    const taskAgentExecutionAddress = taskAgentAddress({
      memberAddress: '/StudentStudyGroup/student_two',
      taskTeamRunIds: ['task-team-outer'],
      taskAgentRunId: 'task-agent-inside-team-run-2',
    });
    expect(handleTaskExecutionProjectionMessage(team, taskAgentEvent({
      address: taskAgentExecutionAddress,
      taskId: 'task-agent-inside-team-0002',
      description: 'Check the supporting student calculation.',
    }) as any)).toMatchObject({ outcome: 'handled' });

    const wrapper = mount(TeamDelegatedTasksSection, {
      props: { teamContext: team, collapsed: false },
      global: {
        plugins: [pinia],
        stubs: {
          Icon: { template: '<span />' },
          MarkdownRenderer: {
            props: ['content'],
            template: '<div data-test="markdown-renderer">{{ content }}</div>',
          },
          TeamTaskReferenceViewer: { template: '<div />' },
        },
        mocks: { $t: (key: string) => labels[key] ?? key },
      },
    });

    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('2 tasks');
    expect(wrapper.get('[data-test="team-delegated-task-team-entry"]').text())
      .toContain('Coordinate the study-group exercise.');
    expect(wrapper.get('[data-test="team-delegated-task-agent-entry"]').text())
      .toContain('Check the supporting student calculation.');
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text())
      .toContain('Coordinate the study-group exercise.');

    await wrapper.get('[data-test="team-delegated-task-agent-entry"] [data-test="team-delegated-task-summary-row"]').trigger('click');
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text())
      .toContain('Check the supporting student calculation.');
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).not.toContain('0 tasks');

    useTaskDelegationStore().replaceRecords(team.teamRunId, [{
      taskId: 'task-team-outer-0001',
      status: 'active',
      senderAddress: team.focusedExecutionAddress,
      receiverAddress: createTeamExecutionAddress({
        rootTeamRunId: team.teamRunId,
        memberAddress: '/StudentStudyGroup',
      }),
      receiverTargetKind: 'agent_team',
      content: 'Coordinate the study-group exercise.',
      referenceFiles: [],
      taskRun: {
        address: createTeamExecutionAddress({
          rootTeamRunId: team.teamRunId,
          taskTeamRunIds: ['task-team-outer'],
          memberAddress: '/StudentStudyGroup',
        }),
        startedAt: '2026-08-10T12:00:00.000Z',
      },
      updates: [],
      createdAt: '2026-08-10T12:00:00.000Z',
    }]);
    await wrapper.setProps({ focusedAddress: team.focusedExecutionAddress });
    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(wrapper.get('[data-test="team-delegated-task-team-entry"]').text())
      .toContain('Coordinate the study-group exercise.');
  });
});
