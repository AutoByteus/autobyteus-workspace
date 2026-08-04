import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  resolveTeamConversationTargetAddress,
  resolveTeamConversationTargetAddressResult,
} from '../teamConversationTargetAddress';

const buildAgentNode = (memberRouteKey: string, overrides: Record<string, any> = {}) => ({
  memberKind: 'agent' as const,
  memberName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  displayName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  memberPath: memberRouteKey.split('/'),
  memberRouteKey,
  agentDefinitionId: `${memberRouteKey}-def`,
  ...overrides,
});

const buildSubteamNode = (memberRouteKey: string, children: any[] = [], overrides: Record<string, any> = {}) => ({
  memberKind: 'agent_team' as const,
  memberName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  displayName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  memberPath: memberRouteKey.split('/'),
  memberRouteKey,
  teamDefinitionId: `${memberRouteKey}-team-def`,
  children,
  ...overrides,
});

const buildContext = (runId: string, status = AgentStatus.Offline, messages: any[] = []) => ({
  state: {
    runId,
    currentStatus: status,
    conversation: {
      id: runId,
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
      messages,
    },
  },
  conversation: {
    id: runId,
    createdAt: '2026-06-12T00:00:00.000Z',
    updatedAt: '2026-06-12T00:00:00.000Z',
    messages,
  },
});

const indexNodes = (nodes: any[]) => {
  const indexed = new Map<string, any>();
  const visit = (node: any) => {
    indexed.set(node.memberRouteKey, node);
    if (Array.isArray(node.children)) {
      node.children.forEach(visit);
    }
  };
  nodes.forEach(visit);
  return indexed;
};

const buildTeamContext = (params: {
  focusedMemberRouteKey: string
  memberTree?: any[]
  memberContexts: Record<string, any>
  coordinatorMemberRouteKey?: string
}) => {
  const memberTree = params.memberTree || Object.keys(params.memberContexts).map((routeKey) => buildAgentNode(routeKey));
  return {
    teamRunId: 'team-user-message-target-1',
    config: {},
    memberTree,
    memberNodesByRouteKey: indexNodes(memberTree),
    leafAgentContextsByRouteKey: new Map(Object.entries(params.memberContexts)),
    coordinatorMemberRouteKey: params.coordinatorMemberRouteKey || Object.keys(params.memberContexts)[0] || null,
    historicalHydration: null,
    focusedMemberRouteKey: params.focusedMemberRouteKey,
    isActive: false,
    isSubscribed: false,
  } as any;
};

const taskAgentWorkPacket = {
  type: 'user',
  text: 'Task-agent run: task-agent-run-1',
  timestamp: new Date('2026-06-12T00:00:00.000Z'),
};

describe('teamConversationTargetAddress', () => {
  it('resolves a focused offline non-coordinator leaf as the user-message target', () => {
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'code_reviewer',
      coordinatorMemberRouteKey: 'solution_designer',
      memberContexts: {
        solution_designer: buildContext('team-1::solution_designer', AgentStatus.Offline),
        code_reviewer: buildContext('team-1::code_reviewer', AgentStatus.Offline),
      },
    });

    const target = resolveTeamConversationTargetAddress(teamContext);

    expect(target?.memberRouteKey).toBe('code_reviewer');
    expect(target?.address).toEqual({
      segments: [{ kind: 'member', memberRouteKey: 'code_reviewer' }],
    });
    expect(target?.context?.state.runId).toBe('team-1::code_reviewer');
    expect(target?.source).toBe('focused_member');
  });

  it('resolves the coordinator when the coordinator is focused', () => {
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'solution_designer',
      coordinatorMemberRouteKey: 'solution_designer',
      memberContexts: {
        solution_designer: buildContext('team-1::solution_designer', AgentStatus.Offline),
        code_reviewer: buildContext('team-1::code_reviewer', AgentStatus.Offline),
      },
    });

    expect(resolveTeamConversationTargetAddress(teamContext)?.memberRouteKey).toBe('solution_designer');
  });

  it('reports stale focus instead of inventing a coordinator target', () => {
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'missing_member',
      coordinatorMemberRouteKey: 'solution_designer',
      memberContexts: {
        solution_designer: buildContext('team-1::solution_designer', AgentStatus.Running),
      },
    });

    const resolution = resolveTeamConversationTargetAddressResult(teamContext);

    expect(resolution.target).toBeNull();
    expect(resolution.focusedMemberRouteKey).toBe('missing_member');
    expect(resolution.reason).toBe('missing_node');
  });

  it('keeps subteam targeting explicit and separate from leaf composer context', () => {
    const leaf = buildAgentNode('BuildSquad/review_lead');
    const subteam = buildSubteamNode('BuildSquad', [leaf]);
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'BuildSquad',
      memberTree: [buildAgentNode('program_manager'), subteam],
      memberContexts: {
        program_manager: buildContext('team-1::program_manager'),
        'BuildSquad/review_lead': buildContext('team-1::BuildSquad/review_lead'),
      },
    });

    expect(resolveTeamConversationTargetAddressResult(teamContext).reason).toBe('subteam_without_leaf_context');

    const target = resolveTeamConversationTargetAddress(teamContext, { allowSubteam: true });
    expect(target).toMatchObject({
      memberRouteKey: 'BuildSquad',
      context: null,
      targetKind: 'subteam',
      source: 'focused_member',
    });
  });

  it('preserves direct task-agent instance targeting when the concrete task agent is focused', () => {
    const taskAgentNode = buildAgentNode('team-1__worker__task_0001', {
      isTaskAgentInstance: true,
      taskAgentRunId: 'team-1__worker__task_0001',
      logicalMemberRouteKey: 'worker',
    });
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'team-1__worker__task_0001',
      memberTree: [buildAgentNode('coordinator'), buildAgentNode('worker'), taskAgentNode],
      memberContexts: {
        coordinator: buildContext('coordinator-run', AgentStatus.Running),
        worker: buildContext('worker-run', AgentStatus.Offline, [taskAgentWorkPacket]),
        'team-1__worker__task_0001': buildContext('team-1__worker__task_0001', AgentStatus.Running),
      },
      coordinatorMemberRouteKey: 'coordinator',
    });

    const target = resolveTeamConversationTargetAddress(teamContext, { allowActiveExecutionSafetyFallback: true });

    expect(target?.memberRouteKey).toBe('team-1__worker__task_0001');
    expect(target?.address).toEqual({
      segments: [
        { kind: 'member', memberRouteKey: 'worker' },
        { kind: 'task_agent', taskAgentRunId: 'team-1__worker__task_0001' },
      ],
    });
    expect(target?.source).toBe('focused_member');
  });

  it('resolves task-team roots and scoped child projections with typed runtime segments', () => {
    const taskTeamRoot = buildSubteamNode('task-team-run-1', [], {
      isTaskTeamInstance: true,
      taskTeamRunId: 'task-team-run-1',
      logicalTeamRouteKey: 'BuildSquad',
      logicalTeamPath: ['BuildSquad'],
    });
    const taskTeamChild = buildAgentNode('task-team-run-1/review_lead', {
      isTaskTeamChildProjection: true,
      parentTaskTeamRunId: 'task-team-run-1',
      taskTeamRelativeMemberRouteKey: 'review_lead',
      taskTeamRelativeMemberPath: ['review_lead'],
      logicalTeamRouteKey: 'BuildSquad',
      structuralSourcePath: ['BuildSquad', 'review_lead'],
    });
    taskTeamRoot.children = [taskTeamChild];
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'task-team-run-1',
      memberTree: [buildSubteamNode('BuildSquad'), taskTeamRoot],
      memberContexts: {
        'task-team-run-1/review_lead': buildContext('task-team-run-1/review_lead', AgentStatus.Running),
      },
    });

    expect(resolveTeamConversationTargetAddress(teamContext, { allowSubteam: true })?.address).toEqual({
      segments: [
        { kind: 'member', memberRouteKey: 'BuildSquad' },
        { kind: 'task_team', taskTeamRunId: 'task-team-run-1' },
      ],
    });

    teamContext.focusedMemberRouteKey = 'task-team-run-1/review_lead';
    expect(resolveTeamConversationTargetAddress(teamContext, { allowSubteam: true })?.address).toEqual({
      segments: [
        { kind: 'member', memberRouteKey: 'BuildSquad' },
        { kind: 'task_team', taskTeamRunId: 'task-team-run-1' },
        { kind: 'member', memberRouteKey: 'review_lead' },
      ],
    });
  });

  it('prefers stored full conversation target segments for nested task-agent projections', () => {
    const nestedSegments = [
      { kind: 'member', memberRouteKey: 'BuildSquad' },
      { kind: 'task_team', taskTeamRunId: 'task-team-run-1' },
      { kind: 'member', memberRouteKey: 'NestedSquad' },
      { kind: 'task_team', taskTeamRunId: 'task-team-run-2' },
      { kind: 'member', memberRouteKey: 'implementer' },
      { kind: 'task_agent', taskAgentRunId: 'task-agent-run-2' },
    ];
    const nestedTaskAgent = buildAgentNode('task-team-run-1/NestedSquad/task-team-run-2/implementer/task-agent-run-2', {
      isTaskAgentInstance: true,
      taskAgentRunId: 'task-agent-run-2',
      logicalMemberRouteKey: 'implementer',
      parentTaskTeamRunId: 'task-team-run-2',
      conversationTargetSegments: nestedSegments,
    });
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: nestedTaskAgent.memberRouteKey,
      memberTree: [buildSubteamNode('BuildSquad'), nestedTaskAgent],
      memberContexts: {
        [nestedTaskAgent.memberRouteKey]: buildContext('task-agent-run-2', AgentStatus.Running),
      },
    });

    expect(resolveTeamConversationTargetAddress(teamContext, { allowSubteam: true })?.address).toEqual({
      segments: nestedSegments,
    });
  });

  it('falls back through active-execution safety only for task-agent-only logical parents', () => {
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'worker',
      coordinatorMemberRouteKey: 'coordinator',
      memberContexts: {
        coordinator: buildContext('coordinator-run', AgentStatus.Running),
        worker: buildContext('worker-run', AgentStatus.Offline, [taskAgentWorkPacket]),
      },
    });

    expect(resolveTeamConversationTargetAddressResult(teamContext).reason).toBe('task_agent_only_logical_member');

    const target = resolveTeamConversationTargetAddress(teamContext, { allowActiveExecutionSafetyFallback: true });
    expect(target).toMatchObject({
      memberRouteKey: 'coordinator',
      source: 'active_execution_safety_fallback',
    });
  });
});
