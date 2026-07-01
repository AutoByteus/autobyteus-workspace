import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileTeamMessages from '../MobileTeamMessages.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamCommunicationStore } from '~/stores/teamCommunicationStore';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import type { MobileWorkContext } from '~/types/mobileWork';

let pinia: Pinia;

const teamRunContext: MobileWorkContext = {
  kind: 'team-run',
  teamRunId: 'team-1',
  teamDefinitionId: 'team-def-1',
  title: 'Software Team',
  summary: 'Existing team run',
  workspaceRootPath: '/Users/normy/project',
  focusedMemberRouteKey: 'lead',
  isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z',
  statusLabel: 'Running',
};

function seedTeamContext(): void {
  const leadNode = {
    memberKind: 'agent',
    memberName: 'lead',
    displayName: 'Lead',
    memberPath: ['lead'],
    memberRouteKey: 'lead',
    memberRunId: 'lead-run',
    agentDefinitionId: 'agent-1',
  };
  useAgentTeamContextsStore().teams.set('team-1', {
    teamRunId: 'team-1',
    config: { teamDefinitionId: 'team-def-1', workspaceId: 'workspace-1' },
    memberTree: [leadNode],
    memberNodesByRouteKey: new Map([['lead', leadNode]]),
    leafAgentContextsByRouteKey: new Map([['lead', { state: { runId: 'lead-run' } }]]),
    coordinatorMemberRouteKey: 'lead',
    historicalHydration: null,
    focusedMemberRouteKey: 'lead',
    currentStatus: AgentTeamStatus.Offline,
    isSubscribed: false,
  } as any);
  useAgentSelectionStore().selectRunWithoutShellNavigation('team-1', 'team');
}

function seedReferenceMessage(): void {
  useTeamCommunicationStore().replaceProjection('team-1', [
    {
      messageId: 'message-1',
      senderAddress: { segments: [{ kind: 'member', memberRouteKey: 'solution_designer' }] },
      receiverAddress: { segments: [{ kind: 'member', memberRouteKey: 'lead' }] },
      content: 'Please review the attached design. Raw /tmp/design-spec.md stays prose.',
      messageType: 'handoff',
      createdAt: '2026-04-12T10:00:00.000Z',
      referenceFiles: [
        { referenceId: 'ref-1', path: '/tmp/design-spec.md', type: 'file', createdAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
        { referenceId: 'ref-2', path: '/tmp/diagram.png', type: 'image', createdAt: '2026-04-12T10:00:00.000Z', updatedAt: '2026-04-12T10:00:00.000Z' },
      ],
    },
  ] as any);
}

function mountSubject() {
  return mount(MobileTeamMessages, {
    props: { context: teamRunContext },
    global: {
      plugins: [pinia],
      stubs: {
        Icon: {
          props: ['icon'],
          template: '<span v-bind="$attrs" :data-icon="icon"></span>',
        },
        MobileTeamReferenceViewer: {
          props: ['teamRunId', 'messageId', 'reference', 'refreshSignal'],
          emits: ['close'],
          template: '<div data-testid="mobile-team-reference-viewer-stub">{{ teamRunId }}:{{ messageId }}:{{ reference.referenceId }}:{{ refreshSignal }}<button data-testid="close-reference" @click="$emit(\'close\')">Close</button></div>',
        },
      },
    },
  });
}

describe('MobileTeamMessages', () => {
  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    seedTeamContext();
    seedReferenceMessage();
  });

  it('renders structured reference files as tappable rows without linkifying raw prose paths', async () => {
    const wrapper = mountSubject();
    await flushPromises();

    const referenceRows = wrapper.findAll('[data-testid="mobile-team-reference-row"]');
    expect(referenceRows).toHaveLength(2);
    expect(referenceRows[0].text()).toContain('design-spec.md');
    expect(referenceRows[1].text()).toContain('diagram.png');
    expect(wrapper.findAll('a[href*="/tmp/design-spec.md"]')).toHaveLength(0);
  });

  it('opens a phone reference viewer by team/message/reference identity and closes back to the list', async () => {
    const wrapper = mountSubject();
    await flushPromises();

    await wrapper.findAll('[data-testid="mobile-team-reference-row"]')[0].trigger('click');
    await flushPromises();

    expect(wrapper.get('[data-testid="mobile-team-reference-viewer-stub"]').text()).toContain('team-1:message-1:ref-1:0');

    await wrapper.get('[data-testid="close-reference"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="mobile-team-reference-viewer-stub"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="mobile-team-reference-row"]')).toHaveLength(2);
  });
});
