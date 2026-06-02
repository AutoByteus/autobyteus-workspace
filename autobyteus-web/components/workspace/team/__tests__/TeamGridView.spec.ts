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
      ['BuildSquad/qa_specialist', buildMember('qa_specialist', AgentStatus.Running)],
    ]),
  };
};

describe('TeamGridView', () => {
  it('renders all members and re-emits tile selection', async () => {
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: buildTeamContext([
          ['professor', buildMember('Professor', AgentStatus.Idle)],
          ['student', buildMember('Student', AgentStatus.Running)],
        ]) as any,
        focusedMemberRouteKey: 'professor',
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
    expect(tiles).toHaveLength(2);

    await tiles[1].trigger('click');
    expect(wrapper.emitted('select-member')).toEqual([['student']]);
  });

  it('renders the full Software Engineering Team roster when only the coordinator has active context', () => {
    const routeKeys = [
      'solution_designer',
      'architecture_reviewer',
      'implementation_engineer',
      'code_reviewer',
      'api_e2e_engineer',
      'delivery_engineer',
    ];
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          coordinatorMemberRouteKey: 'solution_designer',
          memberTree: routeKeys.map((routeKey) => buildMemberNode(routeKey, routeKey)),
          leafAgentContextsByRouteKey: new Map([
            ['solution_designer', buildMember('solution_designer', AgentStatus.Running)],
          ]),
        } as any,
        focusedMemberRouteKey: 'solution_designer',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<div class="tile">{{ memberNode.memberRouteKey }}</div>',
          },
        },
      },
    });

    expect(wrapper.findAll('.tile').map((tile) => tile.text())).toEqual(routeKeys);
  });

  it('renders offline task-only logical members as roster grid rows', () => {
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          coordinatorMemberRouteKey: 'coordinator',
          memberTree: [
            buildMemberNode('coordinator', 'Coordinator'),
            buildMemberNode('worker', 'Worker'),
          ],
          leafAgentContextsByRouteKey: new Map([
            ['coordinator', buildMember('Coordinator', AgentStatus.Running)],
            ['worker', buildMember('Worker', AgentStatus.Offline)],
          ]),
        } as any,
        focusedMemberRouteKey: 'coordinator',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<div class="tile">{{ memberNode.memberRouteKey }}</div>',
          },
        },
      },
    });

    expect(wrapper.findAll('.tile').map((tile) => tile.text())).toEqual(['coordinator', 'worker']);
  });

  it('keeps a settled task-agent-only logical worker visible as a roster tile', () => {
    const worker = buildMember('Worker', AgentStatus.Initializing);
    worker.state.conversation.id = 'team-1__worker__task_0001';
    worker.state.conversation.messages.push({
      type: 'user',
      text: 'You have been activated as task agent for task_0001.',
      timestamp: new Date('2026-06-02T00:00:00.000Z'),
    } as any);
    (worker.state as any).runId = 'team-1__worker__task_0001';

    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          coordinatorMemberRouteKey: 'coordinator',
          memberTree: [
            buildMemberNode('coordinator', 'Coordinator'),
            buildMemberNode('worker', 'Worker'),
          ],
          leafAgentContextsByRouteKey: new Map([
            ['coordinator', buildMember('Coordinator', AgentStatus.Running)],
            ['worker', worker],
          ]),
        } as any,
        focusedMemberRouteKey: 'worker',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<div class="tile">{{ memberNode.memberRouteKey }}</div>',
          },
        },
      },
    });

    expect(wrapper.findAll('.tile').map((tile) => tile.text())).toEqual(['coordinator', 'worker']);
  });

  it('renders initializing task-only logical members as roster grid rows', () => {
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          coordinatorMemberRouteKey: 'coordinator',
          memberTree: [
            buildMemberNode('coordinator', 'Coordinator'),
            buildMemberNode('worker', 'Worker'),
          ],
          leafAgentContextsByRouteKey: new Map([
            ['coordinator', buildMember('Coordinator', AgentStatus.Running)],
            ['worker', buildMember('Worker', AgentStatus.Initializing)],
          ]),
        } as any,
        focusedMemberRouteKey: 'worker',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<div class="tile">{{ memberNode.memberRouteKey }}</div>',
          },
        },
      },
    });

    expect(wrapper.findAll('.tile').map((tile) => tile.text())).toEqual(['coordinator', 'worker']);
  });

  it('renders an active task-agent child immediately after its logical parent', () => {
    const taskAgentNode = {
      ...buildMemberNode('task-agent-run-1', 'Worker · task_0001'),
      memberPath: ['worker', 'task-agent-run-1'],
      memberRunId: 'task-agent-run-1',
      isTaskAgentInstance: true,
      taskAgentRunId: 'task-agent-run-1',
      taskId: 'task_0001',
      logicalMemberRouteKey: 'worker',
    };
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          coordinatorMemberRouteKey: 'coordinator',
          memberTree: [
            buildMemberNode('coordinator', 'Coordinator'),
            buildMemberNode('worker', 'Worker'),
            taskAgentNode,
          ],
          leafAgentContextsByRouteKey: new Map([
            ['coordinator', buildMember('Coordinator', AgentStatus.Running)],
            ['worker', buildMember('Worker', AgentStatus.Offline)],
            ['task-agent-run-1', buildMember('Worker task', AgentStatus.Running)],
          ]),
        } as any,
        focusedMemberRouteKey: 'task-agent-run-1',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<div class="tile">{{ memberNode.memberRouteKey }}</div>',
          },
        },
      },
    });

    expect(wrapper.findAll('.tile').map((tile) => tile.text())).toEqual([
      'coordinator',
      'worker',
      'task-agent-run-1',
    ]);
  });

  it('keeps a direct logical member conversation visible even when the member is offline', () => {
    const worker = buildMember('Worker', AgentStatus.Offline);
    worker.state.conversation.messages.push({
      type: 'user',
      text: 'direct follow-up',
      timestamp: new Date('2026-05-31T00:00:00.000Z'),
    } as any);

    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: {
          coordinatorMemberRouteKey: 'coordinator',
          memberTree: [
            buildMemberNode('coordinator', 'Coordinator'),
            buildMemberNode('worker', 'Worker'),
          ],
          leafAgentContextsByRouteKey: new Map([
            ['coordinator', buildMember('Coordinator', AgentStatus.Running)],
            ['worker', worker],
          ]),
        } as any,
        focusedMemberRouteKey: 'coordinator',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<div class="tile">{{ memberNode.memberRouteKey }}</div>',
          },
        },
      },
    });

    expect(wrapper.findAll('.tile').map((tile) => tile.text())).toEqual(['coordinator', 'worker']);
  });

  it('renders recursive subteam and nested leaf route keys as selectable grid tiles', async () => {
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: buildNestedTeamContext() as any,
        focusedMemberRouteKey: 'BuildSquad/review_lead',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode', 'isFocused', 'memberContext'],
            template: '<button type="button" class="tile" :data-focused="isFocused" :data-has-context="Boolean(memberContext)" @click="$emit(\'select\', memberNode.memberRouteKey)">{{ memberNode.memberRouteKey }}</button>',
          },
        },
      },
    });

    const tiles = wrapper.findAll('.tile');
    expect(tiles.map((tile) => tile.text())).toEqual([
      'program_manager',
      'BuildSquad',
      'BuildSquad/review_lead',
      'BuildSquad/qa_specialist',
    ]);
    expect(tiles[2].attributes('data-focused')).toBe('true');
    expect(tiles[2].attributes('data-has-context')).toBe('true');

    await tiles[1].trigger('click');
    await tiles[2].trigger('click');
    await tiles[3].trigger('click');
    expect(wrapper.emitted('select-member')).toEqual([
      ['BuildSquad'],
      ['BuildSquad/review_lead'],
      ['BuildSquad/qa_specialist'],
    ]);
  });

  it('uses a bounded inner scroll region instead of making the root pane the transcript scroll owner', () => {
    const wrapper = mount(TeamGridView, {
      props: {
        teamContext: buildTeamContext([
          ['professor', buildMember('Professor', AgentStatus.Idle)],
          ['student', buildMember('Student', AgentStatus.Running)],
          ['planner', buildMember('Planner', AgentStatus.Idle)],
        ]) as any,
        focusedMemberRouteKey: 'professor',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<div class="tile">{{ memberNode.memberRouteKey }}</div>',
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
        teamContext: buildTeamContext([
          ['professor', buildMember('Professor', AgentStatus.Idle)],
          ['student', buildMember('Student', AgentStatus.Running)],
        ]) as any,
        focusedMemberRouteKey: 'professor',
      },
      global: {
        stubs: {
          TeamMemberMonitorTile: {
            props: ['memberNode'],
            template: '<div class="tile">{{ memberNode.memberRouteKey }}</div>',
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
