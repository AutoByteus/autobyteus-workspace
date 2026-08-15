import { beforeEach, describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createPinia, setActivePinia, type Pinia } from 'pinia';
import MobileTeamMessages from '../MobileTeamMessages.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import type { MobileWorkContext } from '~/types/mobileWork';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

let pinia: Pinia;
const teamRunContext: MobileWorkContext = {
  kind: 'team-run', teamRunId: 'team-1', teamDefinitionId: 'team-def-1',
  title: 'Software Team', summary: 'Existing team run', workspaceRootPath: '/Users/normy/project',
  focusedAgentRunId: 'lead-run', isActive: true,
  lastActivityAt: '2026-05-18T16:00:00.000Z', statusLabel: 'Running',
};

const seedTeam = (): void => {
  useAgentTeamContextsStore().teams.set('team-1', buildTestTeamContext({
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
  }));
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
  beforeEach(() => { pinia = createPinia(); setActivePinia(pinia); seedTeam(); });

  it('renders exact structured references without linkifying prose paths', async () => {
    const wrapper = mountSubject();
    await flushPromises();
    const rows = wrapper.findAll('[data-testid="mobile-team-reference-row"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain('design-spec.md');
    expect(rows[1].text()).toContain('diagram.png');
    expect(wrapper.findAll('a[href*="/tmp/design-spec.md"]')).toHaveLength(0);
  });

  it('opens and closes the exact TeamRun/message/reference identity', async () => {
    const wrapper = mountSubject();
    await wrapper.findAll('[data-testid="mobile-team-reference-row"]')[0].trigger('click');
    expect(wrapper.get('[data-testid="mobile-team-reference-viewer-stub"]').text())
      .toContain('team-1:message-1:ref-1:0');
    await wrapper.get('[data-testid="close-reference"]').trigger('click');
    expect(wrapper.find('[data-testid="mobile-team-reference-viewer-stub"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="mobile-team-reference-row"]')).toHaveLength(2);
  });
});
