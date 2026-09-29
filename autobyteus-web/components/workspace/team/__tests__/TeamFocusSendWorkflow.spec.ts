import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, type PropType } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import CollaborationOverviewPanel from '~/components/workspace/collaboration/CollaborationOverviewPanel.vue';
import AgentTeamEventMonitor from '../AgentTeamEventMonitor.vue';
import AgentUserInputTextArea from '~/components/agentInput/AgentUserInputTextArea.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import {
  buildTestTeamContext,
  testAgentNode,
  testSubTeamNode,
  testDelegation,
} from '~/test-support/currentTeamTestFixtures';
import { testCollaborationMessagesContextView } from '~/test-support/teamWorkspaceContextView';
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView';

const labels: Record<string, string> = {
  'agentInput.components.agentInput.AgentUserInputTextArea.type_a_message': 'Type a message...',
  'workspace.components.workspace.team.TeamOverviewPanel.messages': 'Messages',
  'workspace.components.workspace.team.TeamOverviewPanel.messages_count': 'Messages',
  'workspace.components.workspace.team.AgentTeamEventMonitor.no_active_team_session': 'No active team session',
  'workspace.components.workspace.team.AgentTeamEventMonitor.select_a_team_member_from_the': 'Select a team member',
};

const WorkflowHarness = defineComponent({
  components: { CollaborationOverviewPanel, AgentTeamEventMonitor, AgentUserInputTextArea },
  props: {
    messages: { type: Object as PropType<CollaborationMessagesContextView>, required: true },
  },
  template: '<div><CollaborationOverviewPanel :messages="messages" /><AgentTeamEventMonitor /><AgentUserInputTextArea data-test="workflow-composer" /></div>',
});

const CollaborationMessagesPanelStub = defineComponent({
  name: 'CollaborationMessagesPanel',
  props: ['messages'],
  template: '<div data-test="team-communication-panel" :data-team-run-id="messages.rootRunId" :data-focused-agent-run-id="messages.focusedAgentRunId" />',
});

const mountWorkflow = () => {
  setActivePinia(createPinia());
  const teacher = testAgentNode('/Teacher', { agentRunId: 'teacher-persistent-run', displayName: 'Teacher' });
  const studentOne = testAgentNode('/StudentStudyGroup/student_one', { agentRunId: 'student-one-persistent-run' });
  const studentTwo = testAgentNode('/StudentStudyGroup/student_two', { agentRunId: 'student-two-persistent-run' });
  const tasks = [
    testDelegation({ delegatorAgentRunId: 'teacher-persistent-run', recipientAddress: '/StudentStudyGroup/student_two', target: { agentRunId: 'student-two-task-run' } }),
    testDelegation({ delegatorAgentRunId: 'teacher-persistent-run', recipientAddress: '/StudentStudyGroup', target: { teamRunId: 'study-group-task-run' } }),
  ];
  const teamContext = buildTestTeamContext({
    teamRunId: 'classroom-root-run', teamDefinitionName: 'Nested Classroom Test Team',
    rootChildren: [
      teacher,
      testSubTeamNode('/StudentStudyGroup', [studentOne, studentTwo], {
        teamRunId: 'study-group-persistent-run', coordinatorAddress: '/StudentStudyGroup/student_one',
      }),
    ],
    coordinatorAddress: '/Teacher', focusedAgentRunId: 'teacher-persistent-run', delegations: tasks,
  });
  useAgentTeamContextsStore().addTeamContext(teamContext);
  useAgentSelectionStore().selectRunWithoutShellNavigation('classroom-root-run', 'team');
  const teamRunStore = useAgentTeamRunStore();
  const sendMessageSpy = vi.spyOn(teamRunStore, 'sendMessageToFocusedMember').mockResolvedValue(undefined);
  const wrapper = mount(WorkflowHarness, {
    props: {
      messages: testCollaborationMessagesContextView(teamContext),
    },
    global: {
      stubs: {
        Icon: true,
        MarkdownRenderer: { props: ['content'], template: '<div data-test="markdown-renderer">{{ content }}</div>' },
        CollaborationMessagesPanel: CollaborationMessagesPanelStub,
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

describe('Team Messages-only collaboration and current AgentRun send workflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows no delegated-task section and keeps the exact focused send target', async () => {
    const { wrapper, teamContext, sendMessageSpy } = mountWorkflow();
    await flushPromises();
    expect(wrapper.find('[data-test="team-delegated-tasks-header"]').exists()).toBe(false);
    expect(wrapper.find('[data-test="team-delegated-task-agent-entry"]').exists()).toBe(false);
    expect(wrapper.get('[data-test="agent-event-monitor"]').attributes('data-run-id')).toBe('teacher-persistent-run');
    expect(wrapper.get('[data-test="team-communication-panel"]').attributes('data-focused-agent-run-id')).toBe('teacher-persistent-run');

    const composer = wrapper.get('[data-test="workflow-composer"]');
    await composer.get('textarea').setValue('Please continue the coordinator work.');
    await composer.get('button[title="Send message"]').trigger('click');
    await flushPromises();
    expect(sendMessageSpy).toHaveBeenCalledOnce();
    expect(sendMessageSpy).toHaveBeenCalledWith('Please continue the coordinator work.', []);
    expect(teamContext.view.getFocusedAgentRunId()).toBe('teacher-persistent-run');
  });

  it('focuses a delegated task Agent through the view and retargets the Messages perspective', async () => {
    const { wrapper, teamContext } = mountWorkflow();
    teamContext.view.focusAgent('student-two-task-run');
    await flushPromises();
    expect(teamContext.view.getFocusedAgentRunId()).toBe('student-two-task-run');
    expect(wrapper.get('[data-test="agent-event-monitor"]').attributes('data-run-id')).toBe('student-two-task-run');
  });
});
