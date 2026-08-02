import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import RunningTeamRow from '../RunningTeamRow.vue';
import { AgentStatus } from '~/types/agent/AgentStatus';

const buildMemberContext = (runId: string, status: AgentStatus, messages: any[] = []) => ({
  state: {
    runId,
    currentStatus: status,
    conversation: {
      id: runId,
      createdAt: '2026-05-31T00:00:00.000Z',
      updatedAt: '2026-05-31T00:00:00.000Z',
      messages,
    },
  },
  submissionPending: false,
});

const buildMemberNode = (memberRouteKey: string, displayName = memberRouteKey) => ({
  memberKind: 'agent',
  memberName: memberRouteKey,
  displayName,
  memberPath: [memberRouteKey],
  memberRouteKey,
  agentDefinitionId: `${memberRouteKey}-def`,
});

const buildTeamContext = () => {
  const coordinatorNode = buildMemberNode('coordinator', 'Coordinator');
  const workerNode = buildMemberNode('worker', 'Worker');
  return {
    teamRunId: 'team-running-row-1',
    focusedMemberRouteKey: 'worker',
    coordinatorMemberRouteKey: 'coordinator',
    isActive: true,
    memberTree: [coordinatorNode, workerNode],
    memberNodesByRouteKey: new Map([
      ['coordinator', coordinatorNode],
      ['worker', workerNode],
    ]),
    leafAgentContextsByRouteKey: new Map([
      ['coordinator', buildMemberContext('coordinator-run', AgentStatus.Running)],
      ['worker', buildMemberContext('worker-run', AgentStatus.Initializing)],
    ]),
  };
};

const mountRow = (teamRun = buildTeamContext()) => mount(RunningTeamRow, {
  props: {
    teamRun: teamRun as any,
    isSelected: true,
    coordinatorRouteKey: 'coordinator',
  },
  global: {
    mocks: {
      $t: (key: string) => key,
    },
    stubs: {
      TeamMemberRow: {
        name: 'TeamMemberRow',
        props: ['memberName', 'memberRouteKey', 'isFocused'],
        template: '<button type="button" class="member-row" :data-route="memberRouteKey" :data-focused="String(isFocused)" @click="$emit(\'select\', memberRouteKey)">{{ memberName }}</button>',
      },
    },
  },
});

describe('RunningTeamRow', () => {
  it('filters initializing task-only logical members from active running rows', () => {
    const wrapper = mountRow();

    const rows = wrapper.findAll('.member-row');
    expect(rows.map((row) => row.attributes('data-route'))).toEqual(['coordinator']);
    expect(rows[0].attributes('data-focused')).toBe('true');
    expect(wrapper.text()).not.toContain('Worker');
  });

  it('keeps logical members with direct conversation history visible in the running sidebar', () => {
    const teamRun = buildTeamContext();
    const worker = teamRun.leafAgentContextsByRouteKey.get('worker') as any;
    worker.state.conversation.messages.push({
      type: 'user',
      text: 'direct member message',
      timestamp: new Date('2026-05-31T00:00:00.000Z'),
    });

    const wrapper = mountRow(teamRun);

    expect(wrapper.findAll('.member-row').map((row) => row.attributes('data-route'))).toEqual([
      'coordinator',
      'worker',
    ]);
  });

  it('does not keep a settled task-only logical worker as an active row when poisoned by a task-agent run id', () => {
    const teamRun = buildTeamContext();
    const worker = teamRun.leafAgentContextsByRouteKey.get('worker') as any;
    worker.state.runId = 'team-running-row-1__worker__task_0001';
    worker.state.currentStatus = AgentStatus.Initializing;

    const wrapper = mountRow(teamRun);

    expect(wrapper.findAll('.member-row').map((row) => row.attributes('data-route'))).toEqual(['coordinator']);
  });
});
