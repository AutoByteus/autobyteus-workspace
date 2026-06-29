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
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import { useTeamActiveTaskSelectionStore } from '~/stores/teamActiveTaskSelectionStore';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

const labels: Record<string, string> = {
  'agentInput.components.agentInput.AgentUserInputTextArea.type_a_message': 'Type a message...',
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.TeamActiveTasksSection.active_tasks': 'Tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_count_singular': 'task',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_count_plural': 'tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.empty': 'No active delegated tasks',
  'workspace.components.workspace.team.TeamActiveTasksSection.description_unavailable': 'Task description unavailable',
  'workspace.components.workspace.team.TeamActiveTasksSection.focus': 'Focus',
  'workspace.components.workspace.team.TeamActiveTasksSection.technical_details': 'Technical details',
  'workspace.components.workspace.team.TeamActiveTasksSection.select_task': 'Select a task to read it.',
  'workspace.components.workspace.team.TeamActiveTasksSection.waiting_activity_notice': 'Waiting for user action in Activity.',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_type': 'Task type',
  'workspace.components.workspace.team.TeamActiveTasksSection.task_id': 'Task ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.agent_run_id': 'Agent run ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.agent_team_run_id': 'Agent team run ID',
  'workspace.components.workspace.team.TeamActiveTasksSection.target_kind': 'Target kind',
  'workspace.components.workspace.team.TeamActiveTasksSection.target': 'Target',
  'workspace.components.workspace.team.AgentTeamEventMonitor.no_active_team_session': 'No active team session',
  'workspace.components.workspace.team.AgentTeamEventMonitor.select_a_team_member_from_the': 'Select a team member',
  'workspace.components.workspace.team.AgentTeamEventMonitor.no_activity_yet': 'No activity yet',
  'workspace.components.workspace.team.AgentTeamEventMonitor.focused_subteam': 'Focused subteam',
};

const makeAgentContext = (runId: string, agentName: string) => ({
  config: {
    agentDefinitionId: `${agentName}-def`,
    agentDefinitionName: agentName,
    agentAvatarUrl: null,
    isLocked: false,
  },
  requirement: '',
  contextFilePaths: [],
  isSending: false,
  state: {
    runId,
    currentStatus: AgentStatus.Idle,
    canInterrupt: false,
    conversation: {
      id: runId,
      agentName,
      messages: [],
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
    },
  },
});

const buildTeamContext = () => {
  const coordinatorNode = {
    memberKind: 'agent',
    memberName: 'coordinator',
    displayName: 'Coordinator',
    memberPath: ['coordinator'],
    memberRouteKey: 'coordinator',
    memberRunId: 'coordinator-run',
    agentDefinitionId: 'coordinator-def',
  };
  const logicalWorkerNode = {
    memberKind: 'agent',
    memberName: 'worker',
    displayName: 'Worker',
    memberPath: ['worker'],
    memberRouteKey: 'worker',
    memberRunId: 'worker-run',
    agentDefinitionId: 'worker-def',
  };
  const logicalTeamNode = {
    memberKind: 'agent_team',
    memberName: 'SoftwareEngineeringTeam',
    displayName: 'Software Engineering Team',
    memberPath: ['SoftwareEngineeringTeam'],
    memberRouteKey: 'SoftwareEngineeringTeam',
    memberRunId: 'software-team-run',
    teamDefinitionId: 'software-team-def',
    children: [],
  };
  const taskAgentNode = {
    memberKind: 'agent',
    memberName: 'Worker · task_0001',
    displayName: 'Worker · task_0001',
    memberPath: ['worker', 'task-agent-run-1'],
    memberRouteKey: 'team-run__worker__task_0001',
    memberRunId: 'task-agent-run-1',
    agentDefinitionId: 'worker-def',
    isTaskAgentInstance: true,
    taskAgentRunId: 'task-agent-run-1',
    taskId: 'task_0001',
    taskDescription: 'Draft the implementation handoff.',
    taskReferenceFiles: [],
    taskArguments: { target: { kind: 'member', name: 'worker' }, description: 'Draft the implementation handoff.' },
    taskTargetKind: 'member',
    taskTargetName: 'Worker',
    taskExecutionStatus: 'active',
    logicalMemberRouteKey: 'worker',
    currentStatus: AgentStatus.Running,
  };
  const taskTeamChildNode = {
    memberKind: 'agent',
    memberName: 'solution_designer',
    displayName: 'Solution Designer',
    memberPath: ['task-team-run-1', 'solution_designer'],
    memberRouteKey: 'task-team-run-1/solution_designer',
    memberRunId: 'task-team-run-1::solution_designer',
    agentDefinitionId: 'solution-designer-def',
    isTaskTeamChildProjection: true,
    parentTaskTeamRunId: 'task-team-run-1',
    taskTeamRelativeMemberRouteKey: 'solution_designer',
    taskTeamRelativeMemberPath: ['solution_designer'],
    logicalTeamRouteKey: 'SoftwareEngineeringTeam',
    structuralSourcePath: ['SoftwareEngineeringTeam', 'solution_designer'],
  };
  const taskTeamNode = {
    memberKind: 'agent_team',
    memberName: 'Software Engineering Team · task_0002',
    displayName: 'Software Engineering Team · task_0002',
    memberPath: ['task-team-run-1'],
    memberRouteKey: 'task-team-run-1',
    memberRunId: 'task-team-run-1',
    teamDefinitionId: 'software-team-def',
    teamRunId: 'task-team-run-1',
    children: [taskTeamChildNode],
    isTaskTeamInstance: true,
    taskTeamRunId: 'task-team-run-1',
    taskId: 'task_0002',
    taskDescription: 'Review the implementation as a team.',
    taskReferenceFiles: [],
    taskArguments: { target: { kind: 'team', name: 'SoftwareEngineeringTeam' }, description: 'Review the implementation as a team.' },
    taskTargetKind: 'team',
    taskTargetName: 'Software Engineering Team',
    logicalTeamRouteKey: 'SoftwareEngineeringTeam',
    logicalTeamPath: ['SoftwareEngineeringTeam'],
    taskExecutionStatus: 'awaiting_review',
    currentStatus: AgentStatus.Running,
  };

  return {
    teamRunId: 'team-1',
    config: { teamDefinitionName: 'Engineering Team', teamDefinitionId: 'engineering-team-def', isLocked: false },
    memberTree: [coordinatorNode, logicalWorkerNode, logicalTeamNode, taskAgentNode, taskTeamNode],
    memberNodesByRouteKey: new Map<string, any>([
      ['coordinator', coordinatorNode],
      ['worker', logicalWorkerNode],
      ['SoftwareEngineeringTeam', logicalTeamNode],
      ['team-run__worker__task_0001', taskAgentNode],
      ['task-team-run-1', taskTeamNode],
      ['task-team-run-1/solution_designer', taskTeamChildNode],
    ]),
    leafAgentContextsByRouteKey: new Map<string, any>([
      ['coordinator', makeAgentContext('coordinator-run', 'Coordinator')],
      ['worker', makeAgentContext('worker-run', 'Worker')],
      ['team-run__worker__task_0001', makeAgentContext('task-agent-run-1', 'Worker Task Agent')],
      ['task-team-run-1/solution_designer', makeAgentContext('task-team-run-1::solution_designer', 'Solution Designer')],
    ]),
    coordinatorMemberRouteKey: 'coordinator',
    focusedMemberRouteKey: 'coordinator',
    currentStatus: AgentTeamStatus.Running,
    isSubscribed: false,
    historicalHydration: null,
  };
};

const WorkflowHarness = defineComponent({
  components: { TeamOverviewPanel, AgentTeamEventMonitor, AgentUserInputTextArea },
  template: `
    <div>
      <TeamOverviewPanel />
      <AgentTeamEventMonitor />
      <AgentUserInputTextArea data-test="workflow-composer" />
    </div>
  `,
});

const TeamCommunicationPanelStub = defineComponent({
  name: 'TeamCommunicationPanel',
  props: ['teamRunId', 'focusedMemberRunId', 'focusedMemberRouteKey', 'focusedMemberPath', 'focusedMemberKind'],
  template: `
    <div
      data-test="team-communication-panel"
      :data-team-run-id="teamRunId"
      :data-focused-run-id="focusedMemberRunId"
      :data-focused-route-key="focusedMemberRouteKey"
      :data-focused-kind="focusedMemberKind"
    />
  `,
});

const mountWorkflow = () => {
  setActivePinia(createPinia());
  const teamContextsStore = useAgentTeamContextsStore();
  const selectionStore = useAgentSelectionStore();
  const communicationStore = useTeamCommunicationStore();
  const runHistoryStore = useRunHistoryStore();
  const teamRunStore = useAgentTeamRunStore();
  const teamContext = buildTeamContext();
  teamContextsStore.addTeamContext(teamContext as any);
  selectionStore.$patch({ selectedType: 'team', selectedRunId: 'team-1' });
  communicationStore.replaceProjection('team-1', [
    {
      messageId: 'message-for-task-team-member',
      teamRunId: 'team-1',
      senderRunId: 'task-team-run-1::solution_designer',
      senderMemberKind: 'agent',
      senderMemberName: 'Solution Designer',
      senderMemberPath: ['task-team-run-1', 'solution_designer'],
      senderMemberRouteKey: 'task-team-run-1/solution_designer',
      receiverRunId: 'coordinator-run',
      receiverMemberKind: 'agent',
      receiverMemberName: 'Coordinator',
      receiverMemberPath: ['coordinator'],
      receiverMemberRouteKey: 'coordinator',
      content: 'Existing focused-member message.',
      messageType: 'handoff',
      createdAt: '2026-06-28T00:00:00.000Z',
      updatedAt: '2026-06-28T00:00:00.000Z',
      referenceFiles: [],
    },
  ]);

  vi.spyOn(runHistoryStore, 'refreshTreeQuietly').mockResolvedValue(undefined);
  const sendMessageSpy = vi.fn();
  vi.spyOn(teamRunStore, 'ensureTeamStreamConnected').mockResolvedValue({
    sendMessage: sendMessageSpy,
  } as any);

  const wrapper = mount(WorkflowHarness, {
    global: {
      stubs: {
        Icon: true,
        MarkdownRenderer: {
          props: ['content'],
          template: '<div data-test="markdown-renderer">{{ content }}</div>',
        },
        TeamTaskReferenceViewer: {
          template: '<div data-test="task-reference-viewer" />',
        },
        TeamCommunicationPanel: TeamCommunicationPanelStub,
        AgentEventMonitor: {
          props: ['conversation', 'runId', 'agentName'],
          template: `
            <div data-test="agent-event-monitor" :data-run-id="runId" :data-agent-name="agentName">
              <div v-for="(message, index) in conversation.messages" :key="index" data-test="conversation-message">
                {{ message.text }}
              </div>
            </div>
          `,
        },
      },
      mocks: {
        $t: (key: string) => labels[key] ?? key,
      },
    },
  });

  return {
    wrapper,
    teamContext,
    teamContextsStore,
    activeContextStore: useActiveContextStore(),
    sendMessageSpy,
  };
};

const expandTasks = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.get('[data-test="team-active-tasks-header"]').trigger('click');
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('focuses a task target from Tasks, sends to that focused target, and renders the submitted message', async () => {
    const { wrapper, teamContextsStore, activeContextStore, sendMessageSpy } = mountWorkflow();
    await expandTasks(wrapper);

    await wrapper.get('[data-test="active-task-focus-primary"]').trigger('click');
    await flushPromises();
    await nextTick();

    expect(teamContextsStore.activeTeamContext?.focusedMemberRouteKey).toBe('team-run__worker__task_0001');
    expect(activeContextStore.activeAgentContext?.state.runId).toBe('task-agent-run-1');
    expect(wrapper.get('[data-test="agent-event-monitor"]').attributes('data-run-id')).toBe('task-agent-run-1');
    expect(wrapper.get('[data-test="team-communication-panel"]').attributes('data-focused-route-key')).toBe('team-run__worker__task_0001');

    await sendViaComposer(wrapper, 'Please continue the task-agent draft.');

    const taskAgentContext = teamContextsStore.activeTeamContext?.leafAgentContextsByRouteKey.get('team-run__worker__task_0001');
    expect(taskAgentContext?.state.conversation.messages.at(-1)).toEqual(expect.objectContaining({
      type: 'user',
      text: 'Please continue the task-agent draft.',
    }));
    expect(wrapper.get('[data-test="conversation-message"]').text()).toContain('Please continue the task-agent draft.');
    expect(sendMessageSpy).toHaveBeenCalledTimes(1);
    expect(sendMessageSpy.mock.calls[0][0]).toBe('Please continue the task-agent draft.');
    expect(sendMessageSpy.mock.calls[0][1]).toEqual({
      segments: [
        { kind: 'member', memberRouteKey: 'worker' },
        { kind: 'task_agent', taskAgentRunId: 'task-agent-run-1' },
      ],
    });
  });

  it('uses shared task selection for task-team right detail without reintroducing right-side member navigation', async () => {
    const { wrapper } = mountWorkflow();
    useTeamActiveTaskSelectionStore().selectTask('team-1', 'task-team-run-1');
    await expandTasks(wrapper);
    await flushPromises();
    await nextTick();

    expect(wrapper.get('[data-test="active-task-task-body"]').text()).toContain('Review the implementation as a team.');
    expect(wrapper.find('[data-test="task-team-active-task-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="active-task-member-row"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="active-task-technical-details"]').exists()).toBe(false);
  });
});
