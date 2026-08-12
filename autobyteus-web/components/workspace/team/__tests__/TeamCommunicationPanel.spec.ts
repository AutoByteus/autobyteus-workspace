import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamCommunicationPanel from '../TeamCommunicationPanel.vue';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import { createTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamCommunicationPanel.to_counterpart': 'to',
  'workspace.components.workspace.team.TeamCommunicationPanel.from_counterpart': 'from',
  'workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate': 'Unknown teammate',
  'workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member': 'Select a team member to view communication.',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_title': 'No team messages yet',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_detail': 'Accepted inter-agent messages will appear here with their reference files.',
  'workspace.components.workspace.team.TeamCommunicationPanel.select_message': 'Select a message to read the full content.',
};

const member = (memberName: string): TeamExecutionAddress => createTeamExecutionAddress({
  rootTeamRunId: 'team-1',
  memberAddress: `/${memberName}`,
});

const taskTeamChild = (taskTeamRunId: string, memberName: string): TeamExecutionAddress => createTeamExecutionAddress({
  rootTeamRunId: 'team-1',
  taskTeamRunIds: [taskTeamRunId],
  memberAddress: `/BuildSquad/${memberName}`,
});

const mountSubject = (propOverrides: Record<string, unknown> = {}) => mount(TeamCommunicationPanel, {
  props: {
    teamRunId: 'team-1',
    focusedAddress: member('focused'),
    ...propOverrides,
  },
  global: {
    stubs: {
      Icon: {
        props: ['icon'],
        template: '<span v-bind="$attrs" :data-icon="icon"></span>',
      },
      MarkdownRenderer: {
        props: ['content'],
        template: '<article data-test="markdown-renderer">{{ content }}</article>',
      },
      TeamCommunicationReferenceViewer: {
        props: ['teamRunId', 'messageId', 'reference'],
        template: '<div data-test="reference-viewer">{{ messageId }}:{{ reference.referenceId }}</div>',
      },
    },
    mocks: {
      $t: (key: string) => labels[key] ?? key,
    },
  },
});

describe('TeamCommunicationPanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders compact newest-first address-based message rows with reference icons', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-sent',
        senderAddress: member('focused'),
        receiverAddress: member('reviewer'),
        content: 'Please review the full handoff. Raw path /tmp/handoff.md stays plain text.',
        messageType: 'handoff',
        createdAt: '2026-04-12T10:00:00.000Z',
        referenceFiles: [
          { referenceId: 'ref-1', path: '/tmp/handoff.md', type: 'file', createdAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
          { referenceId: 'ref-2', path: '/tmp/appendix.txt', type: 'file', createdAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
        ],
      },
      {
        messageId: 'message-received',
        senderAddress: member('solution_designer'),
        receiverAddress: member('focused'),
        content: 'Please implement this new UI ownership model.',
        messageType: 'assignment',
        createdAt: '2026-04-12T10:01:00.000Z',
        referenceFiles: [
          { referenceId: 'ref-3', path: '/tmp/design-spec.md', type: 'file', createdAt: '2026-04-12T10:01:00.000Z', updatedAt: '2026-04-12T10:01:00.000Z' },
        ],
      },
    ]);

    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();

    const rows = wrapper.findAll('[data-test="team-communication-message-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Assignment');
    expect(rows[0].text()).toContain('from /solution_designer');
    expect(rows[1].text()).toContain('Handoff');
    expect(rows[1].text()).toContain('to /reviewer');
    expect(wrapper.get('[data-test="team-communication-message-markdown"]').text()).toContain('Please implement this new UI ownership model.');
    expect(wrapper.findAll('[data-test="team-communication-reference-row"]')).toHaveLength(3);
    expect(wrapper.find('a[href*="/tmp/handoff.md"]').exists()).toBe(false);
  });

  it('shows the empty state when no exact address match exists', () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-other-task-team-run',
        senderAddress: member('program_manager'),
        receiverAddress: taskTeamChild('task-team-run-2', 'review_lead'),
        content: 'Wrong task-team run.',
        messageType: 'assignment',
        createdAt: '2026-04-12T10:00:00.000Z',
        referenceFiles: [],
      },
    ]);

    const wrapper = mountSubject({ focusedAddress: taskTeamChild('task-team-run-1', 'review_lead') });

    expect(wrapper.text()).toContain('No team messages yet');
    expect(wrapper.find('[data-test="team-communication-message-row"]').exists()).toBe(false);
  });

  it('opens a selected reference using the selected message and reference ids', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-sent',
        senderAddress: member('focused'),
        receiverAddress: member('reviewer'),
        content: 'See the attachment.',
        messageType: 'handoff',
        createdAt: '2026-04-12T10:00:00.000Z',
        referenceFiles: [
          { referenceId: 'ref-1', path: '/tmp/handoff.md', type: 'file', createdAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
        ],
      },
    ]);

    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();
    await wrapper.findAll('button').find((button) => button.text().trim() === 'handoff.md')!.trigger('click');

    expect(wrapper.get('[data-test="reference-viewer"]').text()).toBe('message-sent:ref-1');
  });
});
