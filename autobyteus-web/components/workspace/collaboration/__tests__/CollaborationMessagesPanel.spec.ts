import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CollaborationMessagesPanel from '../CollaborationMessagesPanel.vue';
import { buildTestTeamContext, testAgentNode, testTaskRecord } from '~/test-support/currentTeamTestFixtures';
import { testCollaborationMessagesContextView } from '~/test-support/teamWorkspaceContextView';

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
const mountSubject = (focusedAgentRunId = 'focused-run') => mount(CollaborationMessagesPanel, {
  props: {
    messages: focusedAgentRunId === 'focused-run'
      ? testCollaborationMessagesContextView(team, focusedAgentRunId)
      : { ...testCollaborationMessagesContextView(team), focusedAgentRunId },
  },
  global: {
    stubs: {
      Icon: { props: ['icon'], template: '<span v-bind="$attrs" :data-icon="icon"></span>' },
      MarkdownRenderer: { props: ['content'], template: '<article data-test="markdown-renderer">{{ content }}</article>' },
      CollaborationMessageReferenceViewer: { props: ['contentPath', 'reference'], template: '<div data-test="reference-viewer">{{ contentPath }}:{{ reference.referenceId }}</div>' },
    },
    mocks: { $t: (key: string) => labels[key] ?? key },
  },
});

describe('CollaborationMessagesPanel current AgentRun perspective', () => {
  it('renders newest-first exact persistent/task messages with human placement labels', async () => {
    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();
    const rows = wrapper.findAll('[data-test="team-communication-message-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Assignment');
    expect(rows[0].text()).toContain('from reviewer');
    expect(rows[0].text()).not.toContain('/reviewer');
    expect(rows[1].text()).toContain('Handoff');
    expect(rows[1].text()).toContain('to reviewer');
    expect(rows[1].text()).not.toContain('/reviewer');
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
    expect(wrapper.get('[data-test="reference-viewer"]').text()).toBe('team-runs/team-1/team-communication/messages/message-sent/references/ref-1/content:ref-1');
  });
});

it('keeps identity out of the list and reveals exact task provenance only on demand in the right detail', async () => {
  const wrapper = mountSubject();
  const list = wrapper.get('[data-test="team-communication-left-list"]');
  expect(list.find('[data-test="message-identity-toggle"]').exists()).toBe(false);
  expect(list.text()).not.toContain('/reviewer');
  expect(list.text()).not.toContain('Task ·');
  const button = wrapper.get('[data-test="message-identity-toggle"]');
  expect(button.attributes('aria-expanded')).toBe('false');
  expect(button.attributes('aria-label')).toBe('Participant details');
  await button.trigger('click');
  const detail = wrapper.get('[data-test="message-identity-detail"]');
  expect(detail.attributes('id')).toBe(button.attributes('aria-controls'));
  expect(detail.text()).toContain('/reviewer');
  expect(detail.text()).toContain('task-reviewer-run');
  expect(detail.text()).toContain('task-1');
  expect(detail.text()).toContain('team-1');
  await wrapper.get('[data-test="team-communication-reference-row"]').trigger('click');
  expect(wrapper.find('[data-test="message-identity-detail"]').exists()).toBe(false);
  await wrapper.findAll('[data-test="team-communication-message-summary"]')[0].trigger('click');
  expect(wrapper.get('[data-test="message-identity-toggle"]').attributes('aria-expanded')).toBe('false');
});

it('closes identity on exact subject/item changes but preserves it across same-item live updates', async () => {
  const wrapper = mountSubject();
  await wrapper.get('[data-test="message-identity-toggle"]').trigger('click');
  const original = wrapper.props('messages');
  await wrapper.setProps({ messages: { ...original, listMessages: () => original.listMessages().map((m) => ({ ...m, content: `${m.content} updated` })) } });
  expect(wrapper.get('[data-test="message-identity-toggle"]').attributes('aria-expanded')).toBe('true');
  await wrapper.setProps({ messages: { ...original, rootKind: 'agent_org', rootRunId: 'exact-other-root' } });
  expect(wrapper.get('[data-test="message-identity-toggle"]').attributes('aria-expanded')).toBe('false');
  await wrapper.get('[data-test="message-identity-toggle"]').trigger('click');
  await wrapper.findAll('[data-test="team-communication-message-summary"]')[1].trigger('click');
  expect(wrapper.get('[data-test="message-identity-toggle"]').attributes('aria-expanded')).toBe('false');
});
