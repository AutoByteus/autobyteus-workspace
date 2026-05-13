import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamSpotlightView from '../TeamSpotlightView.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

const buildMember = (name: string, status: AgentStatus) => ({
  config: {
    agentDefinitionId: `${name}-def`,
    agentDefinitionName: name,
    agentAvatarUrl: null,
  },
  state: {
    currentStatus: status,
    conversation: {
      id: `team-1::${name}`,
      createdAt: '2026-03-07T00:00:00.000Z',
      updatedAt: '2026-03-07T00:00:00.000Z',
      agentName: name,
      messages: [],
    },
  },
});

const buildMemberNode = (memberRouteKey: string, displayName: string = memberRouteKey) => ({
  memberKind: 'agent',
  memberName: memberRouteKey,
  displayName,
  memberPath: [memberRouteKey],
  memberRouteKey,
  agentDefinitionId: `${memberRouteKey}-def`,
});

const buildTeamContext = (members: Array<[string, ReturnType<typeof buildMember>]>) => ({
  memberTree: members.map(([memberRouteKey]) => buildMemberNode(memberRouteKey)),
  leafAgentContextsByRouteKey: new Map(members),
});

const buildNestedTeamContext = () => {
  const programManager = buildMemberNode('program_manager');
  const reviewLead = {
    ...buildMemberNode('BuildSquad/review_lead', 'review_lead'),
    memberName: 'review_lead',
    memberPath: ['BuildSquad', 'review_lead'],
  };
  const qaSpecialist = {
    ...buildMemberNode('BuildSquad/qa_specialist', 'qa_specialist'),
    memberName: 'qa_specialist',
    memberPath: ['BuildSquad', 'qa_specialist'],
  };
  const buildSquad = {
    memberKind: 'agent_team',
    memberName: 'BuildSquad',
    displayName: 'BuildSquad',
    memberPath: ['BuildSquad'],
    memberRouteKey: 'BuildSquad',
    teamDefinitionId: 'build-squad',
    children: [reviewLead, qaSpecialist],
  };
  return {
    memberTree: [programManager, buildSquad],
    memberNodesByRouteKey: new Map([
      ['program_manager', programManager],
      ['BuildSquad', buildSquad],
      ['BuildSquad/review_lead', reviewLead],
      ['BuildSquad/qa_specialist', qaSpecialist],
    ]),
    leafAgentContextsByRouteKey: new Map([
      ['program_manager', buildMember('program_manager', AgentStatus.Idle)],
      ['BuildSquad/review_lead', buildMember('review_lead', AgentStatus.Idle)],
      ['BuildSquad/qa_specialist', buildMember('qa_specialist', AgentStatus.ExecutingTool)],
    ]),
  };
};

describe('TeamSpotlightView', () => {
  it('moves the focused member into the primary slot and re-emits selection', async () => {
    const wrapper = mount(TeamSpotlightView, {
      props: {
        teamContext: buildTeamContext([
          ['professor', buildMember('Professor', AgentStatus.Idle)],
          ['student', buildMember('Student', AgentStatus.ExecutingTool)],
          ['planner', buildMember('Planner', AgentStatus.Idle)],
        ]) as any,
        focusedMemberRouteKey: 'student',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<button type="button" class="tile" @click="$emit(\'select\', memberNode.memberRouteKey)">{{ memberNode.memberRouteKey }}</button>',
          },
        },
      },
    });

    const tiles = wrapper.findAll('.tile');
    expect(tiles[0].text()).toBe('student');

    await tiles[1].trigger('click');
    expect(wrapper.emitted('select-member')).toEqual([['professor']]);
  });

  it('moves a focused nested leaf into the primary slot and keeps subteam and sibling leaves selectable', async () => {
    const wrapper = mount(TeamSpotlightView, {
      props: {
        teamContext: buildNestedTeamContext() as any,
        focusedMemberRouteKey: 'BuildSquad/review_lead',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode', 'memberContext', 'variant'],
            template: `<button type="button" class="tile" :data-variant="variant || 'compact'" :data-has-context="Boolean(memberContext)" @click="$emit('select', memberNode.memberRouteKey)">{{ memberNode.memberRouteKey }}</button>`,
          },
        },
      },
    });

    const tiles = wrapper.findAll('.tile');
    expect(tiles.map((tile) => tile.text())).toEqual([
      'BuildSquad/review_lead',
      'program_manager',
      'BuildSquad',
      'BuildSquad/qa_specialist',
    ]);
    expect(tiles[0].attributes('data-variant')).toBe('primary');
    expect(tiles[0].attributes('data-has-context')).toBe('true');

    await tiles[2].trigger('click');
    await tiles[3].trigger('click');
    expect(wrapper.emitted('select-member')).toEqual([
      ['BuildSquad'],
      ['BuildSquad/qa_specialist'],
    ]);
  });
});
