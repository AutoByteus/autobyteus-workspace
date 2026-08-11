import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { defineComponent } from 'vue';
import { describe, expect, it } from 'vitest';
import TeamOverviewPanel from '../TeamOverviewPanel.vue';
import { handleTaskExecutionProjectionMessage } from '~/services/agentStreaming/teamTaskExecutionEventRouter';
import {
  buildCurrentTaskExecutionTeam,
  taskAgentEvent,
  taskTeamCoordinatorAddress,
  taskTeamEvent,
} from '~/services/agentStreaming/__tests__/currentTaskExecutionFixture';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { useTaskDelegationStore } from '~/stores/taskDelegationStore';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
};

const TeamCommunicationPanelStub = defineComponent({
  name: 'TeamCommunicationPanel',
  template: '<div data-test="team-communication-panel" />',
});

const mountTeam = (team = buildCurrentTaskExecutionTeam()) => {
  setActivePinia(createPinia());
  useAgentTeamContextsStore().addTeamContext(team);
  useAgentSelectionStore().$patch({ selectedRunId: team.teamRunId, selectedType: 'team' });
  const wrapper = mount(TeamOverviewPanel, {
    global: {
      stubs: { TeamCommunicationPanel: TeamCommunicationPanelStub, Icon: { template: '<span />' } },
      mocks: { $t: (key: string) => labels[key] ?? key },
    },
  });
  return { team: useAgentTeamContextsStore().activeTeamContext!, wrapper };
};

const delegatedTasksVisible = (wrapper: ReturnType<typeof mountTeam>['wrapper']): boolean =>
  !(wrapper.get('[data-test="team-delegated-tasks-body"]').attributes('style') ?? '').includes('display: none');

describe('TeamOverviewPanel current live-task visibility', () => {
  it('counts and opens a task Agent already materialized under stable focus', () => {
    const team = buildCurrentTaskExecutionTeam();
    expect(handleTaskExecutionProjectionMessage(team, taskAgentEvent() as any)).toMatchObject({ outcome: 'handled' });

    const { wrapper } = mountTeam(team);

    expect(wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(delegatedTasksVisible(wrapper)).toBe(true);
  });

  it('counts and auto-opens a task Team for its focused sender before refresh without disappearing after ingress record hydration', async () => {
    const team = buildCurrentTaskExecutionTeam();
    const mounted = mountTeam(team);

    expect(mounted.wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('0 tasks');
    expect(delegatedTasksVisible(mounted.wrapper)).toBe(false);

    expect(handleTaskExecutionProjectionMessage(mounted.team, taskTeamEvent() as any))
      .toMatchObject({ outcome: 'handled' });
    await mounted.wrapper.vm.$nextTick();

    expect(mounted.wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(delegatedTasksVisible(mounted.wrapper)).toBe(true);
    expect(mounted.wrapper.text()).toContain('Coordinate the study-group exercise.');

    useTaskDelegationStore().replaceRecords(mounted.team.teamRunId, [{
      taskId: 'task-team-outer-0001',
      status: 'active',
      senderAddress: createTeamExecutionAddress({
        rootTeamRunId: mounted.team.teamRunId,
        memberAddress: '/Teacher',
      }),
      receiverAddress: taskTeamCoordinatorAddress(),
      receiverTargetKind: 'agent_team',
      content: 'Coordinate the study-group exercise.',
      referenceFiles: [],
      taskRun: {
        address: createTeamExecutionAddress({
          rootTeamRunId: mounted.team.teamRunId,
          taskTeamRunIds: ['task-team-outer'],
          memberAddress: '/StudentStudyGroup',
        }),
        startedAt: '2026-08-10T12:00:00.000Z',
      },
      updates: [],
      createdAt: '2026-08-10T12:00:00.000Z',
    }]);
    await mounted.wrapper.vm.$nextTick();

    expect(mounted.wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(delegatedTasksVisible(mounted.wrapper)).toBe(true);
    expect(mounted.wrapper.text()).toContain('Coordinate the study-group exercise.');
  });

  it('keeps the supported target-placement view without conflating it with the concrete task execution', async () => {
    const team = buildCurrentTaskExecutionTeam();
    team.focusedExecutionAddress = createTeamExecutionAddress({
      rootTeamRunId: team.teamRunId,
      memberAddress: '/StudentStudyGroup',
    });
    const mounted = mountTeam(team);

    expect(handleTaskExecutionProjectionMessage(mounted.team, taskTeamEvent() as any))
      .toMatchObject({ outcome: 'handled' });
    await mounted.wrapper.vm.$nextTick();

    expect(mounted.wrapper.get('[data-test="team-delegated-tasks-header"]').text()).toContain('1 task');
    expect(delegatedTasksVisible(mounted.wrapper)).toBe(true);
  });
});
