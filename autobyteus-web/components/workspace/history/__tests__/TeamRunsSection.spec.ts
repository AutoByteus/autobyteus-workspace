import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TeamRunsSection from '../TeamRunsSection.vue';

describe('TeamRunsSection', () => {
  const teamNodes = [
    {
      teamId: 'team-1',
      teamDefinitionId: 'team-def-1',
      teamDefinitionName: 'Class Room Simulation',
      summary: 'summary',
      lastActivityAt: '2026-01-01T00:00:00.000Z',
      lastKnownStatus: 'IDLE',
      isActive: false,
      deleteLifecycle: 'READY',
      members: [
        {
          teamId: 'team-1',
          memberRouteKey: 'professor',
          memberName: 'Professor',
          memberAgentId: 'ag-1',
          workspaceRootPath: '/Users/normy/temp_workspace',
          hostNodeId: null,
          summary: 'summary',
          lastActivityAt: '2026-01-01T00:00:00.000Z',
          lastKnownStatus: 'IDLE',
          isActive: false,
          deleteLifecycle: 'READY',
        },
      ],
    },
  ] as any[];

  const mountComponent = () => mount(TeamRunsSection, {
    props: {
      teamNodes,
      selectedTeamId: null,
      selectedTeamMemberRouteKey: null,
      teamsSectionExpanded: true,
      expandedTeams: {},
      terminatingTeamIds: {},
      deletingTeamIds: {},
      formatRelativeTime: () => 'now',
    },
    global: {
      stubs: {
        Icon: { template: '<span class="icon-stub" />' },
      },
    },
  });

  it('renders workspace leaf name for member row and emits select-member', async () => {
    const wrapper = mountComponent();

    expect(wrapper.text()).toContain('temp_workspace');
    expect(wrapper.text()).not.toContain('/Users/normy/temp_workspace');

    const memberButton = wrapper.findAll('button').find((button) => button.text().includes('Professor'));
    expect(memberButton).toBeTruthy();
    await memberButton!.trigger('click');

    expect(wrapper.emitted('select-member')).toBeTruthy();
  });

  it('emits delete-team intent', async () => {
    const wrapper = mountComponent();
    const deleteTeamButton = wrapper.find('button[title="Delete team history"]');
    expect(deleteTeamButton.exists()).toBe(true);
    await deleteTeamButton.trigger('click');
    expect(wrapper.emitted('delete-team')?.[0]).toEqual(['team-1']);
  });

  it('highlights only the focused team member row', async () => {
    const wrapper = mount(TeamRunsSection, {
      props: {
        teamNodes: [
          {
            ...teamNodes[0],
            members: [
              teamNodes[0]!.members[0],
              {
                ...teamNodes[0]!.members[0],
                memberRouteKey: 'student',
                memberName: 'Student',
                memberAgentId: 'ag-2',
              },
            ],
          },
        ],
        selectedTeamId: 'team-1',
        selectedTeamMemberRouteKey: 'professor',
        teamsSectionExpanded: true,
        expandedTeams: {},
        terminatingTeamIds: {},
        deletingTeamIds: {},
        formatRelativeTime: () => 'now',
      },
      global: {
        stubs: {
          Icon: { template: '<span class="icon-stub" />' },
        },
      },
    });

    const memberButtons = wrapper.findAll('button').filter((button) =>
      button.text().includes('Professor') || button.text().includes('Student'),
    );
    expect(memberButtons).toHaveLength(2);
    expect(memberButtons[0]!.classes()).toContain('bg-indigo-50');
    expect(memberButtons[1]!.classes()).not.toContain('bg-indigo-50');
  });
});
