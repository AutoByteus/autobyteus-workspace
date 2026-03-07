import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamGridView from '../TeamGridView.vue';
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

describe('TeamGridView', () => {
  it('renders all members and re-emits tile selection', async () => {
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          members: new Map([
            ['professor', buildMember('Professor', AgentStatus.Idle)],
            ['student', buildMember('Student', AgentStatus.ExecutingTool)],
          ]),
        } as any,
        focusedMemberName: 'professor',
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
    expect(tiles).toHaveLength(2);

    await tiles[1].trigger('click');
    expect(wrapper.emitted('select-member')).toEqual([['student']]);
  });

  it('uses a bounded inner scroll region instead of making the root pane the transcript scroll owner', () => {
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          members: new Map([
            ['professor', buildMember('Professor', AgentStatus.Idle)],
            ['student', buildMember('Student', AgentStatus.ExecutingTool)],
            ['planner', buildMember('Planner', AgentStatus.Idle)],
          ]),
        } as any,
        focusedMemberName: 'professor',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberName'],
            template: '<div class="tile">{{ memberName }}</div>',
          },
        },
      },
    });

    const root = wrapper.get('[data-test="team-grid-view"]');
    const scrollRegion = wrapper.get('[data-test="team-grid-scroll-region"]');
    const grid = wrapper.get('[data-test="team-grid-layout"]');

    expect(root.classes()).toContain('overflow-hidden');
    expect(root.classes()).toContain('min-h-0');
    expect(scrollRegion.classes()).toContain('overflow-y-auto');
    expect(scrollRegion.classes()).toContain('flex-1');
    expect(grid.classes()).toContain('h-full');
    expect(grid.classes()).toContain('auto-rows-[minmax(420px,1fr)]');
    expect(grid.classes()).toContain('xl:grid-cols-3');
  });

  it('expands two-member teams across two columns instead of reserving an empty third xl column', () => {
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          members: new Map([
            ['professor', buildMember('Professor', AgentStatus.Idle)],
            ['student', buildMember('Student', AgentStatus.ExecutingTool)],
          ]),
        } as any,
        focusedMemberName: 'professor',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberName'],
            template: '<div class="tile">{{ memberName }}</div>',
          },
        },
      },
    });

    const grid = wrapper.get('[data-test="team-grid-layout"]');
    expect(grid.classes()).toContain('md:grid-cols-2');
    expect(grid.classes()).toContain('xl:grid-cols-2');
    expect(grid.classes()).not.toContain('xl:grid-cols-3');
  });
});
