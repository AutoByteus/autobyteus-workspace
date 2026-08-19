import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamCommunicationPanel from '../TeamCommunicationPanel.vue';
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamCommunicationPanel.to_counterpart': 'to',
  'workspace.components.workspace.team.TeamCommunicationPanel.from_counterpart': 'from',
  'workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate': 'Unknown teammate',
  'workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member': 'Select a team member to view communication.',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_title': 'No team messages yet',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_detail': 'Accepted inter-agent messages will appear here.',
  'workspace.components.workspace.team.TeamCommunicationPanel.select_message': 'Select a message.',
};
const reference = {
  reference_id: 'ref-1', path: '/tmp/handoff.md', type: 'file' as const,
  created_at: '2026-04-12T10:00:00.000Z', updated_at: '2026-04-12T10:00:00.000Z',
};
const team = buildTestTeamContext({
  teamRunId: 'team-1', coordinatorAddress: '/focused', focusedAgentRunId: 'focused-run',
  rootChildren: [
    testAgentNode('/focused', { agentRunId: 'focused-run' }),
    testAgentNode('/reviewer', { agentRunId: 'reviewer-run' }),
  ],
  tasks: [testTaskRecord({
    taskId: 'task-1', delegatorAgentRunId: 'focused-run', recipientAddress: '/reviewer',
    target: { agentRunId: 'task-reviewer-run' },
  })],
  messages: [
    { message_id: 'message-sent', sender_agent_run_id: 'focused-run', receiver_agent_run_id: 'reviewer-run', content: 'Please review the handoff.', message_type: 'handoff', created_at: '2026-04-12T10:00:00.000Z', reference_files: [reference] },
    { message_id: 'message-received', sender_agent_run_id: 'task-reviewer-run', receiver_agent_run_id: 'focused-run', content: 'The task review is complete.', message_type: 'assignment', created_at: '2026-04-12T10:01:00.000Z', reference_files: [] },
  ],
});
const mountSubject = (focusedAgentRunId = 'focused-run') => mount(TeamCommunicationPanel, {
  props: { teamContext: team, focusedAgentRunId },
  global: {
    stubs: {
      Icon: { props: ['icon'], template: '<span v-bind="$attrs" :data-icon="icon"></span>' },
      MarkdownRenderer: { props: ['content'], template: '<article data-test="markdown-renderer">{{ content }}</article>' },
      TeamCommunicationReferenceViewer: { props: ['teamRunId', 'messageId', 'reference'], template: '<div data-test="reference-viewer">{{ teamRunId }}:{{ messageId }}:{{ reference.referenceId }}</div>' },
    },
    mocks: { $t: (key: string) => labels[key] ?? key },
  },
});

describe('TeamCommunicationPanel current AgentRun perspective', () => {
  it('renders newest-first exact persistent/task messages with human placement labels', async () => {
    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();
    const rows = wrapper.findAll('[data-test="team-communication-message-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Assignment');
    expect(rows[0].text()).toContain('from reviewer');
    expect(rows[1].text()).toContain('Handoff');
    expect(rows[1].text()).toContain('to reviewer');
    expect(wrapper.get('[data-test="team-communication-message-markdown"]').text()).toContain('The task review is complete.');
    expect(wrapper.text()).not.toContain('task-reviewer-run');
  });

  it('shows no-focused state for an unknown AgentRun rather than substituting by address', () => {
    const wrapper = mountSubject('unknown-run');
    expect(wrapper.text()).toContain('Select a team member to view communication.');
    expect(wrapper.find('[data-test="team-communication-message-row"]').exists()).toBe(false);
  });

  it('opens a selected reference by root TeamRun/message/reference identity', async () => {
    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-test="team-communication-reference-row"]').trigger('click');
    expect(wrapper.get('[data-test="reference-viewer"]').text()).toBe('team-1:message-sent:ref-1');
  });
});
