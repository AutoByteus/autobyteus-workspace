import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamCommunicationPanel from '../TeamCommunicationPanel.vue';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamCommunicationPanel.sent_messages': 'Sent',
  'workspace.components.workspace.team.TeamCommunicationPanel.received_messages': 'Received',
  'workspace.components.workspace.team.TeamCommunicationPanel.sent_to': 'Sent to',
  'workspace.components.workspace.team.TeamCommunicationPanel.received_from': 'Received from',
  'workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate': 'Unknown teammate',
  'workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member': 'Select a team member to view communication.',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_title': 'No team messages yet',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_detail': 'Accepted inter-agent messages will appear here with their reference files.',
  'workspace.components.workspace.team.TeamCommunicationPanel.select_message': 'Select a message to read the full content.',
};

const mountSubject = () => mount(TeamCommunicationPanel, {
  props: {
    teamRunId: 'team-1',
    focusedMemberRunId: 'focused-run',
    focusedMemberName: 'Focused Member',
  },
  global: {
    stubs: {
      Icon: true,
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

  it('renders focused member sent and received communication with reference files under the Team tab owner', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-sent',
        teamRunId: 'team-1',
        senderRunId: 'focused-run',
        senderMemberName: 'Focused Member',
        receiverRunId: 'reviewer-run',
        receiverMemberName: 'A Very Long Reviewer Name That Should Still Be Grouped Once',
        content: 'Please review the full handoff. Raw path /tmp/handoff.md stays plain text.',
        messageType: 'handoff',
        createdAt: '2026-04-12T10:00:00.000Z',
        updatedAt: '2026-04-12T10:00:00.000Z',
        referenceFiles: [
          { referenceId: 'ref-1', path: '/tmp/handoff.md', type: 'file', createdAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
          { referenceId: 'ref-2', path: '/tmp/appendix.md', type: 'file', createdAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
        ],
      },
      {
        messageId: 'message-received',
        teamRunId: 'team-1',
        senderRunId: 'designer-run',
        senderMemberName: 'Solution Designer',
        receiverRunId: 'focused-run',
        receiverMemberName: 'Focused Member',
        content: 'Please implement this new UI ownership model.',
        messageType: 'assignment',
        createdAt: '2026-04-12T10:01:00.000Z',
        updatedAt: '2026-04-12T10:01:00.000Z',
        referenceFiles: [
          { referenceId: 'ref-3', path: '/tmp/design-spec.md', type: 'file', createdAt: '2026-04-12T10:01:00.000Z', updatedAt: '2026-04-12T10:01:00.000Z' },
        ],
      },
    ]);

    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();

    const text = wrapper.text();
    expect(wrapper.get('[data-test="team-communication-left-list"]').exists()).toBe(true);
    expect(wrapper.get('[data-test="team-communication-detail-pane"]').exists()).toBe(true);
    expect(text).toContain('Sent');
    expect(text).toContain('A Very Long Reviewer Name That Should Still Be Grouped Once');
    expect(text).not.toContain('To A Very Long Reviewer Name That Should Still Be Grouped Once');
    expect(text).toContain('Received');
    expect(text).toContain('Solution Designer');
    expect(text).not.toContain('From Solution Designer');
    expect(text).toContain('handoff.md');
    expect(text).toContain('appendix.md');
    expect(text).toContain('design-spec.md');
    expect(text).toContain('Raw path /tmp/handoff.md stays plain text.');
    expect(wrapper.findAll('a[href*="/tmp/handoff.md"]').length).toBe(0);
    expect(text).not.toContain('Sent Artifacts');
    expect(text).not.toContain('Received Artifacts');
  });

  it('opens a selected reference using the selected message and reference ids', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-sent',
        teamRunId: 'team-1',
        senderRunId: 'focused-run',
        senderMemberName: 'Focused Member',
        receiverRunId: 'reviewer-run',
        receiverMemberName: 'Reviewer',
        content: 'See the attachment.',
        messageType: 'handoff',
        createdAt: '2026-04-12T10:00:00.000Z',
        updatedAt: '2026-04-12T10:00:00.000Z',
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
