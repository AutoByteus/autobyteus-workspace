import { beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileTeamMessages from '../MobileTeamMessages.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import type { MobileWorkContext } from '~/types/mobileWork';
import { buildTestTeamContext, testAgentNode, testTeamMessagesOf } from '~/test-support/currentTeamTestFixtures';
import { clearStoredParticipantMessages, failParticipantMessages, holdParticipantMessages, storeParticipantMessages } from '~/test-support/participantMessagesStub';
import MobileActivityDigest from '../MobileActivityDigest.vue';
import { projectAgentOrgReference } from '~/services/agentOrgExecution/agentOrgReferenceProjection';

// autobyteus-358: the screen loads the focused member's messages through the participant query.
vi.mock('~/services/collaborationMessages/participantMessagesQuery', async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub);

let pinia: Pinia;
const teamRunContext: MobileWorkContext = {
  kind: 'team-run', teamRunId: 'team-1', teamDefinitionId: 'team-def-1',
  title: 'Software Team', summary: 'Existing team run', workspaceRootPath: '/Users/normy/project',
  focusedAgentRunId: 'lead-run', isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z', statusLabel: 'Running',
};

const seedTeam = (): void => {
  const team = buildTestTeamContext({
    teamRunId: 'team-1', teamDefinitionId: 'team-def-1', coordinatorAddress: '/lead',
    focusedAgentRunId: 'lead-run',
    rootChildren: [
      testAgentNode('/solution_designer', { agentRunId: 'solution-run' }),
      testAgentNode('/lead', { agentRunId: 'lead-run' }),
    ],
    messages: [{
      message_id: 'message-1', sender_agent_run_id: 'solution-run', receiver_agent_run_id: 'lead-run',
      content: 'Please review the attached design. Raw /tmp/design-spec.md stays prose.',
      message_type: 'handoff', created_at: '2026-04-12T10:00:00.000Z',
      reference_files: [
        { reference_id: 'ref-1', path: '/tmp/design-spec.md', type: 'file', created_at: '2026-04-12T10:00:00.000Z', updated_at: '2026-04-12T10:00:00.000Z' },
        { reference_id: 'ref-2', path: '/tmp/diagram.png', type: 'image', created_at: '2026-04-12T10:00:00.000Z', updated_at: '2026-04-12T10:00:00.000Z' },
      ],
    }],
  });
  storeParticipantMessages('agent_team', 'team-1', testTeamMessagesOf(team));
  useAgentTeamContextsStore().teams.set('team-1', team);
  useAgentSelectionStore().selectRunWithoutShellNavigation('team-1', 'team');
};

const mountSubject = () => mount(MobileTeamMessages, {
  props: { context: teamRunContext },
  global: {
    plugins: [pinia],
    stubs: {
      Icon: { props: ['icon'], template: '<span v-bind="$attrs" :data-icon="icon"></span>' },
      MobileTeamReferenceViewer: {
        props: ['teamRunId', 'messageId', 'reference', 'refreshSignal'], emits: ['close'],
        template: '<div data-testid="mobile-team-reference-viewer-stub">{{ teamRunId }}:{{ messageId }}:{{ reference.referenceId }}:{{ refreshSignal }}<button data-testid="close-reference" @click="$emit(\'close\')">Close</button></div>',
      },
    },
  },
});

describe('MobileTeamMessages current TeamExecutionView', () => {
  beforeEach(() => { pinia = createPinia(); setActivePinia(pinia); clearStoredParticipantMessages(); seedTeam(); });

  it('renders exact structured references without linkifying prose paths', async () => {
    const wrapper = mountSubject();
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="mobile-team-reference-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('design-spec.md');
    expect(rows[1].text()).toContain('diagram.png');
    expect(wrapper.findAll('a[href*="/tmp/design-spec.md"]')).toHaveLength(0);
  });

  // BEH-032 (c) of autobyteus-294: the row names the counterpart by its label, as the desktop panel does.
  it('names the message counterpart by its label', async () => {
    const wrapper = mountSubject();
    await flushPromises();
    const row = wrapper.get('[data-testid="mobile-team-message-row"]');
    expect(row.text()).toContain('From solution designer');
    expect(row.text()).not.toContain('teammate');
  });

  it('opens and closes the exact TeamRun/message/reference identity', async () => {
    const wrapper = mountSubject();
    await flushPromises();
    await wrapper.findAll('[data-testid="mobile-team-reference-row"]')[0]!.trigger('click');
    // A reference's ID is derived from its message and path, as the server derives it (autobyteus-358).
    const id = projectAgentOrgReference('message-1', '/tmp/design-spec.md', '').referenceId;
    expect(wrapper.get('[data-testid="mobile-team-reference-viewer-stub"]').text())
      .toContain(`team-1:message-1:${id}:0`);
    await wrapper.get('[data-testid="close-reference"]').trigger('click');
    expect(wrapper.find('[data-testid="mobile-team-reference-viewer-stub"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="mobile-team-reference-row"]')).toHaveLength(2);
  });
});

// autobyteus-358 CR-001 (AC-006): an unread list is never shown as an empty one.
describe('mobile team messages while loading, unavailable and loaded empty', () => {
  beforeEach(() => { pinia = createPinia(); setActivePinia(pinia); clearStoredParticipantMessages(); seedTeam(); });
  const mountDigest = () => mount(MobileActivityDigest, { props: { context: teamRunContext }, global: { plugins: [pinia],
    stubs: { Icon: { props: ['icon'], template: '<span :data-icon="icon"></span>' }, MobileTeamMessages: true } } });
  const summary = (wrapper: ReturnType<typeof mountDigest>) => wrapper.get('[data-testid="mobile-activity-team-messages"]').text();

  it('shows the loading state while the focused member\'s messages load', async () => {
    holdParticipantMessages('agent_team', 'team-1');
    const wrapper = mountSubject();
    const digest = mountDigest();
    await flushPromises();
    expect(wrapper.find('[data-testid="mobile-team-messages-loading"]').text()).toBe('Loading messages…');
    expect(wrapper.text()).not.toContain('No team messages yet');
    expect(summary(digest)).toContain('Loading messages…');
    expect(summary(digest)).not.toContain('No team messages yet');
  });

  it('shows the messages as unavailable with the reason when they cannot be read', async () => {
    failParticipantMessages('agent_team', 'team-1', "Message 'm9' must use distinct AgentRun endpoints.");
    const wrapper = mountSubject();
    const digest = mountDigest();
    await flushPromises();
    const unavailable = wrapper.get('[data-testid="mobile-team-messages-unavailable"]').text();
    expect(unavailable).toContain("These messages can't be shown");
    expect(unavailable).toContain("Message 'm9' must use distinct AgentRun endpoints.");
    expect(wrapper.text()).not.toContain('No team messages yet');
    expect(summary(digest)).toContain("These messages can't be shown: Message 'm9' must use distinct AgentRun endpoints.");
  });

  it('says there are no messages only for a loaded empty list', async () => {
    storeParticipantMessages('agent_team', 'team-1', []);
    const wrapper = mountSubject();
    const digest = mountDigest();
    await flushPromises();
    expect(wrapper.text()).toContain('No team messages yet for the focused member.');
    expect(wrapper.find('[data-testid="mobile-team-messages-loading"]').exists()).toBe(false);
    expect(summary(digest)).toContain('No team messages yet for the focused member.');
  });
});
