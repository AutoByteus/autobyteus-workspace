import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RunningTeamRow from '../RunningTeamRow.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const buildTeamContext = () => {
  const teamRunId = 'team-running-row-1';
  return buildTestTeamContext({
    teamRunId: 'team-running-row-1',
    coordinatorAddress: '/coordinator',
    focusedAgentRunId: 'worker-run',
    rootChildren: [
      testAgentNode('/coordinator', { displayName: 'Coordinator', agentRunId: 'coordinator-run', currentStatus: AgentStatus.Running }),
      testAgentNode('/worker', { displayName: 'Worker', agentRunId: 'worker-run', currentStatus: AgentStatus.Initializing }),
    ],
  });
};

const mountRow = (teamRun = buildTeamContext()) => mount(RunningTeamRow, {
  props: {
    teamRun: teamRun as any,
    isSelected: true,
  },
  global: {
    mocks: {
      $t: (key: string) => ({
        'workspace.components.workspace.running.RunningTeamRow.active_team_run': 'Active team run',
        'workspace.components.workspace.running.RunningTeamRow.inactive_team_run': 'Inactive team run',
      }[key] ?? key),
    },
    stubs: {
      TeamMemberRow: {
        name: 'TeamMemberRow',
        props: ['memberName', 'memberAddress', 'isFocused'],
        template: '<button type="button" class="member-row" :data-address="memberAddress" :data-focused="String(isFocused)" @click="$emit(\'select\', memberAddress)">{{ memberName }}</button>',
      },
    },
  },
});

describe('RunningTeamRow', () => {
  it('renders exact root lifecycle independently from members and row action', async () => {
    const teamRun = buildTeamContext();
    const wrapper = mountRow(teamRun);

    const dot = wrapper.get('[data-test="team-activity-dot"]');
    expect(dot.attributes()).toMatchObject({
      'data-active': 'true',
      'aria-label': 'Active team run',
      title: 'Active team run',
    });
    expect(dot.classes()).toContain('bg-blue-500');
    expect(wrapper.find('.delete-btn').exists()).toBe(true);

    expect(teamRun.view.setRootTeamActive(false).disposition).toBe('applied');
    await wrapper.setProps({ teamRun });

    expect(dot.attributes()).toMatchObject({
      'data-active': 'false',
      'aria-label': 'Inactive team run',
      title: 'Inactive team run',
    });
    expect(dot.classes()).toContain('bg-gray-400');
    expect(wrapper.find('.delete-btn').exists()).toBe(true);
  });

  it('renders every current focusable AgentRun and marks the exact focused run', () => {
    const wrapper = mountRow();

    const rows = wrapper.findAll('.member-row');
    expect(rows.map((row) => row.attributes('data-address'))).toEqual(['/coordinator', '/worker']);
    expect(rows.map((row) => row.attributes('data-focused'))).toEqual(['false', 'true']);
  });

  it('emits the exact focused AgentRun id rather than a logical route', async () => {
    const wrapper = mountRow();
    await wrapper.findAll('.member-row')[1]!.trigger('click');
    expect(wrapper.emitted('select-member')).toEqual([['team-running-row-1', 'worker-run']]);
  });
});
