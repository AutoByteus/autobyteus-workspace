import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamOverviewPanel from '../TeamOverviewPanel.vue';
import AgentTeamEventMonitor from '../AgentTeamEventMonitor.vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testTaskRecord,
} from '~/test-support/currentTeamTestFixtures';

const labels: Record<string, string> = {
  'agentInput.components.agentInput.AgentUserInputTextArea.type_a_message': 'Type a message...',
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty': 'No delegated tasks yet',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail': 'Delegated work appears here from saved task records.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.focus': 'Focus',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.select_task': 'Select a task to read it.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.waiting_activity_notice': 'Waiting for user action in Activity.',
  'workspace.components.workspace.team.AgentTeamEventMonitor.no_active_team_session': 'No active team session',
  'workspace.components.workspace.team.AgentTeamEventMonitor.select_a_team_member_from_the': 'Select a team member',
};

const WorkflowHarness = defineComponent({
  components: { TeamOverviewPanel, AgentTeamEventMonitor, AgentUserInputTextArea },
  template: '<div><TeamOverviewPanel /><AgentTeamEventMonitor /><AgentUserInputTextArea data-test="workflow-composer" /></div>',
});

const TeamCommunicationPanelStub = defineComponent({
  name: 'TeamCommunicationPanel',
  props: ['teamContext', 'focusedAgentRunId'],
  template: '<div data-test="team-communication-panel" :data-team-run-id="teamContext.view.getRootTeamRunId()" :data-focused-agent-run-id="focusedAgentRunId" />',
});

const mountWorkflow = () => {
  setActivePinia(createPinia());
  const teacher = testAgentNode('/Teacher', { agentRunId: 'teacher-persistent-run', displayName: 'Teacher' });
  const studentOne = testAgentNode('/StudentStudyGroup/student_one', { agentRunId: 'student-one-persistent-run' });
  const studentTwo = testAgentNode('/StudentStudyGroup/student_two', { agentRunId: 'student-two-persistent-run' });
  const tasks = [
    testTaskRecord({
      taskId: 'task_0001', delegatorAgentRunId: 'teacher-persistent-run',
      recipientAddress: '/StudentStudyGroup/student_two', target: { agentRunId: 'student-two-task-run' },
      description: 'Draft the implementation handoff.',
    }),
    testTaskRecord({
      taskId: 'task_0002', delegatorAgentRunId: 'teacher-persistent-run',
      recipientAddress: '/StudentStudyGroup', target: { teamRunId: 'study-group-task-run' },
      description: 'Review the implementation as a team.',
    }),
  ];
  const teamContext = buildTestTeamContext({
    teamRunId: 'classroom-root-run', teamDefinitionName: 'Nested Classroom Test Team',
    rootChildren: [
      teacher,
      testSubTeamNode('/StudentStudyGroup', [studentOne, studentTwo], {
        teamRunId: 'study-group-persistent-run', coordinatorAddress: '/StudentStudyGroup/student_one',
      }),
    ],
    coordinatorAddress: '/Teacher', focusedAgentRunId: 'teacher-persistent-run', tasks,
  });
  useAgentTeamContextsStore().addTeamContext(teamContext);
  useAgentSelectionStore().selectRunWithoutShellNavigation('classroom-root-run', 'team');
  const teamRunStore = useAgentTeamRunStore();
  const sendMessageSpy = vi.spyOn(teamRunStore, 'sendMessageToFocusedMember').mockResolvedValue(undefined);
  const wrapper = mount(WorkflowHarness, {
    global: {
      stubs: {
        Icon: true,
        MarkdownRenderer: { props: ['content'], template: '<div data-test="markdown-renderer">{{ content }}</div>' },
        TeamTaskReferenceViewer: { template: '<div data-test="task-reference-viewer" />' },
        TeamCommunicationPanel: TeamCommunicationPanelStub,
        AgentEventMonitor: {
          props: ['conversation', 'runId', 'agentName'],
          template: '<div data-test="agent-event-monitor" :data-run-id="runId" :data-agent-name="agentName" />',
        },
      },
      mocks: { $t: (key: string) => labels[key] ?? key },
    },
  });
  return { wrapper, teamContext, sendMessageSpy };
};

const expandTasks = async (wrapper: ReturnType<typeof mount>) => {
  const body = wrapper.get('[data-test="team-delegated-tasks-body"]');
  if ((body.attributes('style') ?? '').includes('display: none')) {
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
  }
  await nextTick();
};

describe('Team Tasks focus and current AgentRun send workflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selects task-Agent details without changing the exact focused send target', async () => {
    const { wrapper, teamContext, sendMessageSpy } = mountWorkflow();
    await expandTasks(wrapper);
    await wrapper.get('[data-test="team-delegated-task-agent-entry"] [data-test="team-delegated-task-summary-row"]').trigger('click');
    await flushPromises();
    expect(teamContext.view.getFocusedAgentRunId()).toBe('teacher-persistent-run');
    expect(wrapper.get('[data-test="agent-event-monitor"]').attributes('data-run-id')).toBe('teacher-persistent-run');
    expect(wrapper.get('[data-test="team-communication-panel"]').attributes('data-focused-agent-run-id')).toBe('teacher-persistent-run');
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Draft the implementation handoff.');

    const composer = wrapper.get('[data-test="workflow-composer"]');
    await composer.get('textarea').setValue('Please continue the coordinator work.');
    await composer.get('button[title="Send message"]').trigger('click');
    await flushPromises();
    expect(sendMessageSpy).toHaveBeenCalledOnce();
    expect(sendMessageSpy).toHaveBeenCalledWith('Please continue the coordinator work.', []);
    expect(teamContext.view.getFocusedAgentRunId()).toBe('teacher-persistent-run');
  });

  it('selects a task-Team summary without making its placement a send target', async () => {
    const { wrapper, teamContext } = mountWorkflow();
    await expandTasks(wrapper);
    await wrapper.get('[data-test="team-delegated-task-team-entry"] [data-test="team-delegated-task-summary-row"]').trigger('click');
    await flushPromises();
    expect(teamContext.view.getFocusedAgentRunId()).toBe('teacher-persistent-run');
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.find('[data-test="delegated-task-member-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="delegated-task-technical-details"]').exists()).toBe(false);
  });
});
