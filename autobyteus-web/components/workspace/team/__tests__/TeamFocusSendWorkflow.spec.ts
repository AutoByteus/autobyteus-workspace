import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamOverviewPanel from '../TeamOverviewPanel.vue';
import AgentTeamEventMonitor from '../AgentTeamEventMonitor.vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import {
  buildCurrentTaskExecutionTeam,
  currentTaskExecutionRootTeamRunId,
  taskAgentAddress,
  taskAgentProjection,
  taskTeamProjection,
} from '~/services/agentStreaming/__tests__/currentTaskExecutionFixture';
import { reconcileTestTaskSnapshot } from '~/test-support/currentTeamTestFixtures';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const labels: Record<string, string> = {
  'agentInput.components.agentInput.AgentUserInputTextArea.type_a_message': 'Type a message...',
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.tasks': 'Tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty': 'No delegated tasks yet',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.empty_detail': 'Delegated work appears here from saved task records.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.description_unavailable': 'Task description unavailable',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.focus': 'Focus',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.technical_details': 'Technical details',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.select_task': 'Select a task to read it.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.waiting_activity_notice': 'Waiting for user action in Activity.',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_type': 'Task type',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target_kind': 'Target kind',
  'workspace.components.workspace.team.TeamDelegatedTasksSection.target': 'Target',
  'workspace.components.workspace.team.AgentTeamEventMonitor.no_active_team_session': 'No active team session',
  'workspace.components.workspace.team.AgentTeamEventMonitor.select_a_team_member_from_the': 'Select a team member',
  'workspace.components.workspace.team.AgentTeamEventMonitor.no_activity_yet': 'No activity yet',
  'workspace.components.workspace.team.AgentTeamEventMonitor.focused_subteam': 'Focused subteam',
};

const WorkflowHarness = defineComponent({
  components: { TeamOverviewPanel, AgentTeamEventMonitor, AgentUserInputTextArea },
  template: `<div><TeamOverviewPanel /><AgentTeamEventMonitor /><AgentUserInputTextArea data-test="workflow-composer" /></div>`,
});

const TeamCommunicationPanelStub = defineComponent({
  name: 'TeamCommunicationPanel',
  props: ['teamRunId', 'focusedAddress'],
  template: `<div data-test="team-communication-panel" :data-team-run-id="teamRunId" :data-focused-address="JSON.stringify(focusedAddress)" />`,
});

const mountWorkflow = () => {
  setActivePinia(createPinia());
  const teamContextsStore = useAgentTeamContextsStore();
  const selectionStore = useAgentSelectionStore();
  const runHistoryStore = useRunHistoryStore();
  const teamRunStore = useAgentTeamRunStore();
  const teamContext = buildCurrentTaskExecutionTeam();
  const teacherAddress = createTeamExecutionAddress({
    rootTeamRunId: currentTaskExecutionRootTeamRunId,
    memberAddress: '/Teacher',
  });
  expect(teamContext.executions.focus(teacherAddress).disposition).not.toBe('rejected');

  const taskAgent = taskAgentProjection({
    address: taskAgentAddress({ memberAddress: '/StudentStudyGroup/student_two' }),
    senderAddress: teacherAddress,
    taskId: 'task_0001',
    description: 'Draft the implementation handoff.',
  });
  const taskTeam = taskTeamProjection({
    senderAddress: teacherAddress,
    taskId: 'task_0002',
    description: 'Review the implementation as a team.',
  });
  expect(reconcileTestTaskSnapshot(teamContext, [taskAgent, taskTeam]).disposition).toBe('applied');

  teamContextsStore.addTeamContext(teamContext);
  selectionStore.selectRunWithoutShellNavigation(currentTaskExecutionRootTeamRunId, 'team');

  vi.spyOn(runHistoryStore, 'refreshTreeQuietly').mockResolvedValue(undefined);
  const sendMessageSpy = vi.fn();
  vi.spyOn(teamRunStore, 'ensureTeamStreamConnected').mockResolvedValue({ sendMessage: sendMessageSpy } as any);

  const wrapper = mount(WorkflowHarness, {
    global: {
      stubs: {
        Icon: true,
        MarkdownRenderer: { props: ['content'], template: '<div data-test="markdown-renderer">{{ content }}</div>' },
        TeamTaskReferenceViewer: { template: '<div data-test="task-reference-viewer" />' },
        TeamCommunicationPanel: TeamCommunicationPanelStub,
        AgentEventMonitor: {
          props: ['conversation', 'runId', 'agentName'],
          template: `<div data-test="agent-event-monitor" :data-run-id="runId" :data-agent-name="agentName"><div v-for="(message, index) in conversation.messages" :key="index" data-test="conversation-message">{{ message.text }}</div></div>`,
        },
      },
      mocks: { $t: (key: string) => labels[key] ?? key },
    },
  });

  return { wrapper, teamContext, teamContextsStore, activeContextStore: useActiveContextStore(), sendMessageSpy, teacherAddress };
};

const expandTasks = async (wrapper: ReturnType<typeof mount>) => {
  const tasksBody = wrapper.get('[data-test="team-delegated-tasks-body"]');
  if ((tasksBody.attributes('style') ?? '').includes('display: none')) {
    await wrapper.get('[data-test="team-delegated-tasks-header"]').trigger('click');
  }
  await nextTick();
};

const sendViaComposer = async (wrapper: ReturnType<typeof mount>, text: string) => {
  const textarea = wrapper.get('[data-test="workflow-composer"] textarea');
  await textarea.setValue(text);
  await wrapper.get('[data-test="workflow-composer"] button[title="Send message"]').trigger('click');
  await flushPromises();
  await nextTick();
};

describe('Team Tasks Focus + send-message workflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('selects task details from Tasks without changing the exact focused send target', async () => {
    const { wrapper, teamContextsStore, activeContextStore, sendMessageSpy, teacherAddress } = mountWorkflow();
    await expandTasks(wrapper);

    await wrapper.get('[data-test="team-delegated-task-agent-entry"] [data-test="team-delegated-task-summary-row"]').trigger('click');
    await flushPromises();
    await nextTick();

    expect(teamContextsStore.activeTeamContext?.executions.getFocusedAddress()).toEqual(teacherAddress);
    expect(activeContextStore.activeAgentContext?.state.runId).toBe('teacher-persistent-run');
    expect(wrapper.get('[data-test="agent-event-monitor"]').attributes('data-run-id')).toBe('teacher-persistent-run');
    expect(JSON.parse(wrapper.get('[data-test="team-communication-panel"]').attributes('data-focused-address') || 'null')).toEqual(teacherAddress);
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Draft the implementation handoff.');
    expect(wrapper.find('[data-test="left-delegated-task-actor-row"]').exists()).toBe(false);

    await sendViaComposer(wrapper, 'Please continue the coordinator work.');

    const teacherContext = teamContextsStore.activeTeamContext?.executions.getAgentContext(teacherAddress);
    expect(teacherContext?.state.conversation.messages.at(-1)).toEqual(expect.objectContaining({
      type: 'user', text: 'Please continue the coordinator work.',
    }));
    expect(wrapper.get('[data-test="conversation-message"]').text()).toContain('Please continue the coordinator work.');
    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy.mock.calls[0][0]).toBe('Please continue the coordinator work.');
    expect(sendMessageSpy.mock.calls[0][1]).toEqual(teacherAddress);
  });

  it('selects task-Team summaries without changing exact focus or reintroducing member navigation', async () => {
    const { wrapper, teamContextsStore, teacherAddress } = mountWorkflow();
    await expandTasks(wrapper);
    await flushPromises();
    await nextTick();

    await wrapper.get('[data-test="team-delegated-task-team-entry"] [data-test="team-delegated-task-summary-row"]').trigger('click');
    await flushPromises();
    await nextTick();

    expect(teamContextsStore.activeTeamContext?.executions.getFocusedAddress()).toEqual(teacherAddress);
    expect(wrapper.get('[data-test="delegated-task-task-body"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.find('[data-test="team-delegated-task-team-entry"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="left-delegated-task-actor-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="left-delegated-task-member-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="delegated-task-member-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="delegated-task-technical-details"]').exists()).toBe(false);
  });
});
