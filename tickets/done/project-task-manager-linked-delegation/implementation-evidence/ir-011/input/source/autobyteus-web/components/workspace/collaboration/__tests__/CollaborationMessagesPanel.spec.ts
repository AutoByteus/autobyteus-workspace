import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import CollaborationMessagesPanel from '../CollaborationMessagesPanel.vue';
import CollaborationMessagesSection from '../CollaborationMessagesSection.vue';
import { buildTestTeamContext, testAgentNode, testDelegation } from '~/test-support/currentTeamTestFixtures';
import { testCollaborationMessagesContextView } from '~/test-support/teamWorkspaceContextView';
import type {
  CollaborationMessagePerspectiveRow,
  CollaborationMessagesContextView,
} from '~/types/workspace/collaborationMessagesContextView';
import type { TeamReferenceFile } from '~/types/teamReferenceFile';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamCommunicationPanel.to_counterpart': 'to',
  'workspace.components.workspace.team.TeamCommunicationPanel.from_counterpart': 'from',
  'workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate': 'Unknown teammate',
  'workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member': 'Select a team member to view communication.',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_title': 'No team messages yet',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_detail': 'Accepted inter-agent messages will appear here.',
  'workspace.components.workspace.team.TeamCommunicationPanel.select_message': 'Select a message.',
};
const testReference = (referenceId: string, path: string) => ({
  reference_id: referenceId, path, type: 'file' as const,
  created_at: '2026-04-12T10:00:00.000Z', updated_at: '2026-04-12T10:00:00.000Z',
});
const reference = testReference('ref-1', '/tmp/handoff.md');
const team = buildTestTeamContext({
  teamRunId: 'team-1', coordinatorAddress: '/focused', focusedAgentRunId: 'focused-run',
  rootChildren: [
    testAgentNode('/focused', { agentRunId: 'focused-run' }),
    testAgentNode('/reviewer', { agentRunId: 'reviewer-run' }),
  ],
  delegations: [testDelegation({ delegatorAgentRunId: 'focused-run', recipientAddress: '/reviewer', target: { agentRunId: 'task-reviewer-run' } })],
  messages: [
    { message_id: 'message-sent', sender_agent_run_id: 'focused-run', receiver_agent_run_id: 'reviewer-run', content: 'Please review the handoff.', message_type: 'handoff', created_at: '2026-04-12T10:00:00.000Z', reference_files: [reference] },
    { message_id: 'message-received', sender_agent_run_id: 'task-reviewer-run', receiver_agent_run_id: 'focused-run', content: 'The task review is complete.', message_type: 'assignment', created_at: '2026-04-12T10:01:00.000Z', reference_files: [] },
  ],
});
const BIG_REFERENCE_COUNT = 45;
const bigTeam = buildTestTeamContext({
  teamRunId: 'team-big', coordinatorAddress: '/focused', focusedAgentRunId: 'focused-run',
  rootChildren: [
    testAgentNode('/focused', { agentRunId: 'focused-run' }),
    testAgentNode('/reviewer', { agentRunId: 'reviewer-run' }),
  ],
  messages: [
    { message_id: 'message-small', sender_agent_run_id: 'focused-run', receiver_agent_run_id: 'reviewer-run', content: 'Small handoff.', message_type: 'handoff', created_at: '2026-04-12T10:00:00.000Z', reference_files: [testReference('small-0', '/repo/small-0.md'), testReference('small-1', '/repo/small-1.md'), testReference('small-2', '/repo/small-2.md')] },
    { message_id: 'message-none', sender_agent_run_id: 'reviewer-run', receiver_agent_run_id: 'focused-run', content: 'No files.', message_type: 'informational', created_at: '2026-04-12T10:01:00.000Z', reference_files: [] },
    { message_id: 'message-big', sender_agent_run_id: 'reviewer-run', receiver_agent_run_id: 'focused-run', content: 'Validation status.', message_type: 'validation_status', created_at: '2026-04-12T10:02:00.000Z', reference_files: Array.from({ length: BIG_REFERENCE_COUNT }, (_, index) => testReference(`big-${index}`, `/repo/big-${index}.md`)) },
  ],
});

const mountOptions = {
  global: {
    stubs: {
      Icon: { props: ['icon'], template: '<span v-bind="$attrs" :data-icon="icon"></span>' },
      MarkdownRenderer: { props: ['content'], template: '<article data-test="markdown-renderer">{{ content }}</article>' },
      CollaborationMessageReferenceViewer: { props: ['contentPath', 'reference'], template: '<div data-test="reference-viewer">{{ contentPath }}:{{ reference.referenceId }}</div>' },
    },
    mocks: { $t: (key: string) => labels[key] ?? key },
  },
};
const mountPanel = (
  messages: CollaborationMessagesContextView,
  rows: readonly CollaborationMessagePerspectiveRow[] = messages.listMessages(),
) => mount(CollaborationMessagesPanel, { ...mountOptions, props: { messages, rows } });
const mountSubject = (focusedAgentRunId = 'focused-run') => mountPanel(
  focusedAgentRunId === 'focused-run'
    ? testCollaborationMessagesContextView(team, focusedAgentRunId)
    : { ...testCollaborationMessagesContextView(team), focusedAgentRunId },
);
const mountBig = (rows?: readonly CollaborationMessagePerspectiveRow[]) =>
  mountPanel(testCollaborationMessagesContextView(bigTeam), rows);
const messageRows = (wrapper: ReturnType<typeof mountPanel>) =>
  wrapper.findAll('[data-test="team-communication-message-row"]');

describe('CollaborationMessagesPanel current AgentRun perspective', () => {
  it('renders newest-first exact persistent/task messages with human placement labels', async () => {
    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();
    const rows = messageRows(wrapper);
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

  it('opens a reference of the selected message by root TeamRun/message/reference identity', async () => {
    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-test="team-communication-reference-row"]').exists()).toBe(false);
    await wrapper.findAll('[data-test="team-communication-message-summary"]')[1].trigger('click');
    await wrapper.get('[data-test="team-communication-reference-row"]').trigger('click');
    expect(wrapper.get('[data-test="reference-viewer"]').text()).toBe('team-runs/team-1/team-communication/messages/message-sent/references/ref-1/content:ref-1');
  });
});

describe('CollaborationMessagesPanel bounded reference files', () => {
  it('shows a file count on every message with files and reference rows only under the selected message', async () => {
    const wrapper = mountBig();
    await wrapper.vm.$nextTick();
    const [big, none, small] = messageRows(wrapper);
    expect(big.classes()).toContain('border-blue-500');
    expect(big.get('[data-test="team-communication-reference-count"]').text()).toContain('45');
    expect(big.get('[data-test="team-communication-reference-count"]').attributes('title')).toBe('45 reference files');
    expect(none.find('[data-test="team-communication-reference-count"]').exists()).toBe(false);
    expect(small.get('[data-test="team-communication-reference-count"]').text()).toContain('3');

    expect(big.findAll('[data-test="team-communication-reference-row"]')).toHaveLength(20);
    expect(none.find('[data-test="team-communication-reference-row"]').exists()).toBe(false);
    expect(small.find('[data-test="team-communication-reference-row"]').exists()).toBe(false);
    expect(big.get('[data-test="team-communication-show-all-references"]').text()).toBe('Show all 45 files');
  });

  it('reveals and opens every reference of the selected message through Show all', async () => {
    const wrapper = mountBig();
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-test="team-communication-show-all-references"]').trigger('click');
    const references = wrapper.findAll('[data-test="team-communication-reference-row"]');
    expect(references).toHaveLength(BIG_REFERENCE_COUNT);
    expect(wrapper.find('[data-test="team-communication-show-all-references"]').exists()).toBe(false);
    await references[BIG_REFERENCE_COUNT - 1].trigger('click');
    expect(wrapper.get('[data-test="reference-viewer"]').text())
      .toBe('team-runs/team-big/team-communication/messages/message-big/references/big-44/content:big-44');
  });

  it('shows no Show all control when the selected message is within the preview limit', async () => {
    const wrapper = mountBig();
    await wrapper.vm.$nextTick();
    await messageRows(wrapper)[2].get('[data-test="team-communication-message-summary"]').trigger('click');
    expect(wrapper.findAll('[data-test="team-communication-reference-row"]')).toHaveLength(3);
    expect(wrapper.find('[data-test="team-communication-show-all-references"]').exists()).toBe(false);
  });

  it('collapses Show all when the selected message, focused member or root changes', async () => {
    const wrapper = mountBig();
    await wrapper.vm.$nextTick();
    const showAll = async () => wrapper.get('[data-test="team-communication-show-all-references"]').trigger('click');
    const referenceCount = () => wrapper.findAll('[data-test="team-communication-reference-row"]').length;

    await showAll();
    expect(referenceCount()).toBe(BIG_REFERENCE_COUNT);
    await messageRows(wrapper)[2].get('[data-test="team-communication-message-summary"]').trigger('click');
    await messageRows(wrapper)[0].get('[data-test="team-communication-message-summary"]').trigger('click');
    expect(referenceCount()).toBe(20);

    const original = wrapper.props('messages');
    await showAll();
    await wrapper.setProps({ messages: { ...original, focusedAgentRunId: 'reviewer-run' } });
    expect(referenceCount()).toBe(20);

    await showAll();
    await wrapper.setProps({ messages: { ...original, focusedAgentRunId: 'reviewer-run', rootRunId: 'other-root' } });
    expect(referenceCount()).toBe(20);
  });

  it('keeps Show all across a same-message live update of the rows', async () => {
    const wrapper = mountBig();
    await wrapper.vm.$nextTick();
    await wrapper.get('[data-test="team-communication-show-all-references"]').trigger('click');
    const original = wrapper.props('rows');
    await wrapper.setProps({ rows: original.map((message) => ({ ...message, content: `${message.content} updated` })) });
    expect(wrapper.findAll('[data-test="team-communication-reference-row"]')).toHaveLength(BIG_REFERENCE_COUNT);
  });

  it('reads reference identities only for displayed reference rows, on mount and on a member switch', async () => {
    const reads = new Set<string>();
    const countingReference = (source: TeamReferenceFile): TeamReferenceFile => Object.freeze({
      get referenceId() {
        reads.add(source.path);
        return source.referenceId;
      },
      path: source.path,
      type: source.type,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    });
    // The Section owns the rows, as in production, so only rendering can read identities.
    const countingView = (focusedAgentRunId: string): CollaborationMessagesContextView => {
      const view = testCollaborationMessagesContextView(bigTeam, focusedAgentRunId);
      return {
        ...view,
        listMessages: () => view.listMessages()
          .map((message) => ({ ...message, referenceFiles: message.referenceFiles.map(countingReference) })),
      };
    };
    const firstTwenty = Array.from({ length: 20 }, (_, index) => `/repo/big-${index}.md`).sort();
    const wrapper = mount(CollaborationMessagesSection, { ...mountOptions, props: { messages: countingView('focused-run') } });
    await wrapper.vm.$nextTick();
    expect(wrapper.findAll('[data-test="team-communication-reference-row"]')).toHaveLength(20);
    expect([...reads].sort()).toEqual(firstTwenty);

    reads.clear();
    await wrapper.setProps({ messages: countingView('reviewer-run') });
    expect(wrapper.findAll('[data-test="team-communication-message-row"]')).toHaveLength(3);
    expect([...reads].sort()).toEqual(firstTwenty);
  });
});

it('keeps identity out of the list and reveals exact delegated provenance only on demand in the right detail', async () => {
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
  expect(detail.text()).toContain('team-1');
  await wrapper.findAll('[data-test="team-communication-message-summary"]')[1].trigger('click');
  await wrapper.get('[data-test="message-identity-toggle"]').trigger('click');
  expect(wrapper.find('[data-test="message-identity-detail"]').exists()).toBe(true);
  await wrapper.get('[data-test="team-communication-reference-row"]').trigger('click');
  expect(wrapper.find('[data-test="message-identity-detail"]').exists()).toBe(false);
  await wrapper.findAll('[data-test="team-communication-message-summary"]')[0].trigger('click');
  expect(wrapper.get('[data-test="message-identity-toggle"]').attributes('aria-expanded')).toBe('false');
});

it('closes identity on exact subject/item changes but preserves it across same-item live updates', async () => {
  const wrapper = mountSubject();
  await wrapper.get('[data-test="message-identity-toggle"]').trigger('click');
  const original = wrapper.props('messages');
  const originalRows = wrapper.props('rows');
  await wrapper.setProps({ rows: originalRows.map((m) => ({ ...m, content: `${m.content} updated` })) });
  expect(wrapper.get('[data-test="message-identity-toggle"]').attributes('aria-expanded')).toBe('true');
  await wrapper.setProps({ messages: { ...original, rootKind: 'agent_org', rootRunId: 'exact-other-root' } });
  expect(wrapper.get('[data-test="message-identity-toggle"]').attributes('aria-expanded')).toBe('false');
  await wrapper.get('[data-test="message-identity-toggle"]').trigger('click');
  await wrapper.findAll('[data-test="team-communication-message-summary"]')[1].trigger('click');
  expect(wrapper.get('[data-test="message-identity-toggle"]').attributes('aria-expanded')).toBe('false');
});
