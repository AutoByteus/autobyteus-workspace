import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RunningTeamRow from '../RunningTeamRow.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { createTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures';

const buildTeamContext = () => {
  const teamRunId = 'team-running-row-1';
  return buildTestTeamContext({
    teamRunId: 'team-running-row-1',
    coordinatorAddress: '/coordinator',
    focusedExecutionAddress: createTeamExecutionAddress({ rootTeamRunId: teamRunId, memberAddress: '/worker' }),
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
    coordinatorAddress: '/coordinator',
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

    expect(teamRun.executions.setRootTeamActive(false).disposition).toBe('applied');
    await wrapper.setProps({ teamRun });

    expect(dot.attributes()).toMatchObject({
      'data-active': 'false',
      'aria-label': 'Inactive team run',
      title: 'Inactive team run',
    });
    expect(dot.classes()).toContain('bg-gray-400');
    expect(wrapper.find('.delete-btn').exists()).toBe(true);
  });

  it('filters initializing task-only logical members from active running rows', () => {
    const wrapper = mountRow();

    const rows = wrapper.findAll('.member-row');
    expect(rows.map((row) => row.attributes('data-address'))).toEqual(['/coordinator']);
    expect(rows[0].attributes('data-focused')).toBe('false');
    expect(wrapper.text()).not.toContain('Worker');
  });

  it('keeps logical members with direct conversation history visible in the running sidebar', () => {
    const teamRun = buildTeamContext();
    const worker = teamRun.executions.getAgentContext(createTeamExecutionAddress({
      rootTeamRunId: teamRun.executions.getRootTeamRunId(),
      memberAddress: '/worker',
    }))!;
    worker.state.conversation.messages.push({
      type: 'user',
      text: 'direct member message',
      timestamp: new Date('2026-05-31T00:00:00.000Z'),
    });

    const wrapper = mountRow(teamRun);

    expect(wrapper.findAll('.member-row').map((row) => row.attributes('data-address'))).toEqual([
      '/coordinator',
      '/worker',
    ]);
  });

  it('does not keep a logical worker visible when its only conversation is a task-agent work packet', () => {
    const teamRun = buildTeamContext();
    const worker = teamRun.executions.getAgentContext(createTeamExecutionAddress({
      rootTeamRunId: teamRun.executions.getRootTeamRunId(),
      memberAddress: '/worker',
    }))!;
    worker.state.currentStatus = AgentStatus.Initializing;
    worker.state.conversation.messages.push({
      type: 'user',
      text: 'You have been activated as task agent task_0001. Task-agent run: worker-task-run.',
      timestamp: new Date('2026-05-31T00:00:00.000Z'),
    } as any);

    const wrapper = mountRow(teamRun);

    expect(wrapper.findAll('.member-row').map((row) => row.attributes('data-address'))).toEqual(['/coordinator']);
  });
});
