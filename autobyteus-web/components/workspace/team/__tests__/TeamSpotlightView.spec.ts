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

describe('TeamSpotlightView', () => {
  it('moves the focused member into the primary slot and re-emits selection', async () => {
    const wrapper = mount(TeamSpotlightView, {
      props: {
        teamContext: {
          members: new Map([
            ['professor', buildMember('Professor', AgentStatus.Idle)],
            ['student', buildMember('Student', AgentStatus.ExecutingTool)],
            ['planner', buildMember('Planner', AgentStatus.Idle)],
          ]),
        } as any,
        focusedMemberName: 'student',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberName'],
            template: '<button type="button" class="tile" @click="$emit(\'select\', memberName)">{{ memberName }}</button>',
          },
        },
      },
    });

    const tiles = wrapper.findAll('.tile');
    expect(tiles[0].text()).toBe('student');

    await tiles[1].trigger('click');
    expect(wrapper.emitted('select-member')).toEqual([['professor']]);
  });
});
