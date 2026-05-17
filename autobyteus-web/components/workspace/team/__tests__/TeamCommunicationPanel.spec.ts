import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TeamCommunicationPanel from '../TeamCommunicationPanel.vue';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';

const labels: Record<string, string> = {
  'workspace.components.workspace.team.TeamCommunicationPanel.sent_messages': 'Sent',
  'workspace.components.workspace.team.TeamCommunicationPanel.received_messages': 'Received',
  'workspace.components.workspace.team.TeamCommunicationPanel.to_counterpart': 'to',
  'workspace.components.workspace.team.TeamCommunicationPanel.from_counterpart': 'from',
  'workspace.components.workspace.team.TeamCommunicationPanel.unknown_teammate': 'Unknown teammate',
  'workspace.components.workspace.team.TeamCommunicationPanel.no_focused_member': 'Select a team member to view communication.',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_title': 'No team messages yet',
  'workspace.components.workspace.team.TeamCommunicationPanel.empty_detail': 'Accepted inter-agent messages will appear here with their reference files.',
  'workspace.components.workspace.team.TeamCommunicationPanel.select_message': 'Select a message to read the full content.',
  'workspace.components.workspace.team.TeamCommunicationPanel.represents_subteam': 'Represents',
};

const mountSubject = (propOverrides: Record<string, unknown> = {}) => mount(TeamCommunicationPanel, {
  props: {
    teamRunId: 'team-1',
    focusedMemberRunId: 'focused-run',
    focusedMemberName: 'Focused Member',
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

  it('renders compact newest-first email-like message rows with file-type reference icons under the Team tab owner', async () => {
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
          { referenceId: 'ref-2', path: '/tmp/appendix.txt', type: 'file', createdAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
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
    expect(wrapper.find('[data-test="team-communication-left-list"]').exists()).toBe(true);
    expect(wrapper.find('[data-test="team-communication-detail-pane"]').exists()).toBe(true);
    const rows = wrapper.findAll('[data-test="team-communication-message-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('Assignment');
    expect(rows[0].text()).toContain('from Solution Designer');
    expect(rows[1].text()).toContain('Handoff');
    expect(rows[1].text()).toContain('to A Very Long Reviewer Name That Should Still Be Grouped Once');
    expect(wrapper.get('[data-test="team-communication-message-markdown"]').text()).toContain('Please implement this new UI ownership model.');

    expect(text).not.toContain('Sent');
    expect(text).toContain('A Very Long Reviewer Name That Should Still Be Grouped Once');
    expect(text).toContain('Handoff');
    expect(text).toContain('to A Very Long Reviewer Name That Should Still Be Grouped Once');
    expect(text).not.toContain('To A Very Long Reviewer Name That Should Still Be Grouped Once');
    expect(text).not.toContain('Received');
    expect(text).toContain('Assignment');
    expect(text).toContain('Solution Designer');
    expect(text).toContain('from Solution Designer');
    expect(text).not.toContain('From Solution Designer');
    expect(text).toContain('handoff.md');
    expect(text).toContain('appendix.txt');
    expect(text).toContain('design-spec.md');

    await rows[1].get('[data-test="team-communication-message-summary"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-test="team-communication-message-markdown"]').text()).toContain('Raw path /tmp/handoff.md stays plain text.');
    expect(wrapper.findAll('a[href*="/tmp/handoff.md"]').length).toBe(0);
    expect(text).not.toContain('Sent Artifacts');
    expect(text).not.toContain('Received Artifacts');

    const directionIcons = wrapper.findAll('[data-test="team-communication-direction-icon"]').map((icon) => icon.attributes('data-icon'));
    expect(directionIcons).toContain('heroicons:paper-airplane');
    expect(directionIcons).toContain('heroicons:inbox-arrow-down');

    const referenceIcons = wrapper.findAll('[data-test="team-communication-reference-icon"]').map((icon) => icon.attributes('data-icon'));
    expect(referenceIcons).toContain('vscode-icons:file-type-markdown');
    expect(referenceIcons).toContain('vscode-icons:file-type-text');
  });

  it('displays nested breadcrumbs and team badges for subteam and nested leaf participants', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-subteam',
        teamRunId: 'team-1',
        senderRunId: 'focused-run',
        senderMemberKind: 'agent',
        senderMemberName: 'program_manager',
        senderMemberPath: ['program_manager'],
        senderMemberRouteKey: 'program_manager',
        receiverRunId: 'build-squad-run',
        receiverMemberKind: 'agent_team',
        receiverMemberName: 'BuildSquad',
        receiverMemberPath: ['BuildSquad'],
        receiverMemberRouteKey: 'BuildSquad',
        content: 'Please coordinate this build.',
        messageType: 'assignment',
        createdAt: '2026-04-12T10:00:00.000Z',
        updatedAt: '2026-04-12T10:00:00.000Z',
        referenceFiles: [],
      },
      {
        messageId: 'message-from-nested-leaf',
        teamRunId: 'team-1',
        senderRunId: 'review-run',
        senderMemberKind: 'agent',
        senderMemberName: 'review_lead',
        senderMemberPath: ['BuildSquad', 'review_lead'],
        senderMemberRouteKey: 'BuildSquad/review_lead',
        receiverRunId: 'focused-run',
        receiverMemberKind: 'agent',
        receiverMemberName: 'program_manager',
        receiverMemberPath: ['program_manager'],
        receiverMemberRouteKey: 'program_manager',
        content: 'Review is complete.',
        messageType: 'status_update',
        createdAt: '2026-04-12T10:01:00.000Z',
        updatedAt: '2026-04-12T10:01:00.000Z',
        referenceFiles: [],
      },
    ]);

    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();

    const text = wrapper.text();
    expect(text).toContain('to BuildSquad');
    expect(text).toContain('from BuildSquad / review_lead');
    expect(wrapper.find('[data-test="team-communication-counterpart-kind"]').text()).toBe('Team');

    const rows = wrapper.findAll('[data-test="team-communication-message-row"]');
    await rows[1].get('[data-test="team-communication-message-summary"]').trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.get('[data-test="team-communication-detail-counterpart-kind"]').text()).toBe('Team');
  });

  it('shows a focused subteam message by route/path when the subteam has no member run id', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-build-squad',
        teamRunId: 'team-1',
        senderRunId: 'pm-run',
        senderMemberKind: 'agent',
        senderMemberName: 'program_manager',
        senderMemberPath: ['program_manager'],
        senderMemberRouteKey: 'program_manager',
        receiverRunId: 'internal-child-team-run',
        receiverMemberKind: 'agent_team',
        receiverMemberName: 'BuildSquad',
        receiverMemberPath: ['BuildSquad'],
        receiverMemberRouteKey: 'BuildSquad',
        content: 'Please coordinate this build.',
        messageType: 'assignment',
        createdAt: '2026-04-12T10:02:00.000Z',
        updatedAt: '2026-04-12T10:02:00.000Z',
        referenceFiles: [],
      },
    ]);

    const wrapper = mountSubject({
      focusedMemberRunId: '',
      focusedMemberKind: 'agent_team',
      focusedMemberRouteKey: 'BuildSquad',
      focusedMemberPath: ['BuildSquad'],
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="team-communication-split"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Assignment');
    expect(wrapper.text()).toContain('from program_manager');
    expect(wrapper.get('[data-test="team-communication-message-markdown"]').text()).toContain('Please coordinate this build.');
  });

  it('shows a nested leaf message by route/path when the focused run id is stale', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-review-lead',
        teamRunId: 'team-1',
        senderRunId: 'pm-run',
        senderMemberKind: 'agent',
        senderMemberName: 'program_manager',
        senderMemberPath: ['program_manager'],
        senderMemberRouteKey: 'program_manager',
        receiverRunId: 'new-review-run',
        receiverMemberKind: 'agent',
        receiverMemberName: 'review_lead',
        receiverMemberPath: ['BuildSquad', 'review_lead'],
        receiverMemberRouteKey: 'BuildSquad/review_lead',
        content: 'Please review the implementation.',
        messageType: 'handoff',
        createdAt: '2026-04-12T10:03:00.000Z',
        updatedAt: '2026-04-12T10:03:00.000Z',
        referenceFiles: [],
      },
    ]);

    const wrapper = mountSubject({
      focusedMemberRunId: 'stale-review-run',
      focusedMemberKind: 'agent',
      focusedMemberRouteKey: 'BuildSquad/review_lead',
      focusedMemberPath: ['BuildSquad', 'review_lead'],
    });
    await wrapper.vm.$nextTick();

    expect(wrapper.find('[data-test="team-communication-split"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('Handoff');
    expect(wrapper.text()).toContain('from program_manager');
    expect(wrapper.get('[data-test="team-communication-message-markdown"]').text()).toContain('Please review the implementation.');
  });

  it('renders represented-subteam badges for representative leaf communication', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-to-representative',
        teamRunId: 'team-1',
        senderRunId: 'focused-run',
        senderMemberKind: 'agent',
        senderMemberName: 'program_manager',
        senderMemberPath: ['program_manager'],
        senderMemberRouteKey: 'program_manager',
        receiverRunId: 'review-run',
        receiverMemberKind: 'agent',
        receiverMemberName: 'review_lead',
        receiverMemberPath: ['BuildSquad', 'review_lead'],
        receiverMemberRouteKey: 'BuildSquad/review_lead',
        receiverRepresentedSubTeam: {
          memberKind: 'agent_team',
          memberName: 'BuildSquad',
          memberPath: ['BuildSquad'],
          memberRouteKey: 'BuildSquad',
          memberRunId: 'build-squad-run',
          teamDefinitionId: 'build-squad-team',
          address: {
            teamRunId: 'team-1',
            memberPath: ['BuildSquad'],
            memberRouteKey: 'BuildSquad',
          },
        },
        content: 'Please coordinate the child team.',
        messageType: 'assignment',
        createdAt: '2026-04-12T10:04:00.000Z',
        updatedAt: '2026-04-12T10:04:00.000Z',
        referenceFiles: [],
      },
    ]);

    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="team-communication-represented-subteam"]').text()).toBe('Represents BuildSquad');
    expect(wrapper.get('[data-test="team-communication-detail-represented-subteam"]').text()).toBe('Represents BuildSquad');
    expect(wrapper.text()).toContain('to BuildSquad / review_lead');
  });

  it('keeps message summary and reference rows as sibling interactive controls', async () => {
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

    const row = wrapper.get('[data-test="team-communication-message-row"]');
    const summary = row.get('[data-test="team-communication-message-summary"]');
    const reference = row.get('[data-test="team-communication-reference-row"]');

    expect(row.element.tagName).not.toBe('BUTTON');
    expect(summary.element.tagName).toBe('BUTTON');
    expect(reference.element.tagName).toBe('BUTTON');
    expect(summary.find('[data-test="team-communication-reference-row"]').exists()).toBe(false);
  });

  it('renders the selected message detail through the shared Markdown renderer', async () => {
    const store = useTeamCommunicationStore();
    store.replaceProjection('team-1', [
      {
        messageId: 'message-sent',
        teamRunId: 'team-1',
        senderRunId: 'focused-run',
        senderMemberName: 'Focused Member',
        receiverRunId: 'reviewer-run',
        receiverMemberName: 'Reviewer',
        content: '## Handoff\n\n- Please review `file.md`.',
        messageType: 'handoff',
        createdAt: '2026-04-12T10:00:00.000Z',
        updatedAt: '2026-04-12T10:00:00.000Z',
        referenceFiles: [],
      },
    ]);

    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();

    expect(wrapper.get('[data-test="team-communication-message-markdown"]').text()).toContain('## Handoff');
    expect(wrapper.find('pre').exists()).toBe(false);
  });

  it('keeps the split usable by clamping resize handle movement in constrained widths', async () => {
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
        referenceFiles: [],
      },
    ]);

    const wrapper = mountSubject();
    await wrapper.vm.$nextTick();
    const leftList = wrapper.get('[data-test="team-communication-left-list"]');
    const handle = wrapper.get('[data-test="team-communication-resize-handle"]');

    expect(leftList.attributes('style')).toContain('width: 232px');

    await handle.trigger('mousedown', { clientX: 200 });
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
    await wrapper.vm.$nextTick();
    expect(leftList.attributes('style')).toContain('width: 360px');
    window.dispatchEvent(new MouseEvent('mouseup'));

    await handle.trigger('mousedown', { clientX: 500 });
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100 }));
    await wrapper.vm.$nextTick();
    expect(leftList.attributes('style')).toContain('width: 168px');
    window.dispatchEvent(new MouseEvent('mouseup'));
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
