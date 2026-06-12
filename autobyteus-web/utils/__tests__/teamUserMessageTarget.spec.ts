import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import {
  resolveTeamUserMessageTarget,
  resolveTeamUserMessageTargetResult,
} from '../teamUserMessageTarget';

const buildAgentNode = (memberRouteKey: string, overrides: Record<string, any> = {}) => ({
  memberKind: 'agent' as const,
  memberName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  displayName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  memberPath: memberRouteKey.split('/'),
  memberRouteKey,
  agentDefinitionId: `${memberRouteKey}-def`,
  ...overrides,
});

const buildSubteamNode = (memberRouteKey: string, children: any[] = []) => ({
  memberKind: 'agent_team' as const,
  memberName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  displayName: memberRouteKey.split('/').at(-1) || memberRouteKey,
  memberPath: memberRouteKey.split('/'),
  memberRouteKey,
  teamDefinitionId: `${memberRouteKey}-team-def`,
  children,
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
    currentStatus: 'OFFLINE',
    isSubscribed: false,
  } as any;
};

const taskAgentWorkPacket = {
  type: 'user',
  text: 'Task-agent run: task-agent-run-1',
  timestamp: new Date('2026-06-12T00:00:00.000Z'),
};

describe('teamUserMessageTarget', () => {
  it('resolves a focused offline non-coordinator leaf as the user-message target', () => {
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'code_reviewer',
      coordinatorMemberRouteKey: 'solution_designer',
      memberContexts: {
        solution_designer: buildContext('team-1::solution_designer', AgentStatus.Offline),
        code_reviewer: buildContext('team-1::code_reviewer', AgentStatus.Offline),
      },
    });

    const target = resolveTeamUserMessageTarget(teamContext);

    expect(target?.memberRouteKey).toBe('code_reviewer');
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

    expect(resolveTeamUserMessageTarget(teamContext)?.memberRouteKey).toBe('solution_designer');
  });

  it('reports stale focus instead of inventing a coordinator target', () => {
    const teamContext = buildTeamContext({
      focusedMemberRouteKey: 'missing_member',
      coordinatorMemberRouteKey: 'solution_designer',
      memberContexts: {
        solution_designer: buildContext('team-1::solution_designer', AgentStatus.Running),
      },
    });

    const resolution = resolveTeamUserMessageTargetResult(teamContext);

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

    expect(resolveTeamUserMessageTargetResult(teamContext).reason).toBe('subteam_without_leaf_context');

    const target = resolveTeamUserMessageTarget(teamContext, { allowSubteam: true });
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

    const target = resolveTeamUserMessageTarget(teamContext, { allowActiveExecutionSafetyFallback: true });

    expect(target?.memberRouteKey).toBe('team-1__worker__task_0001');
    expect(target?.source).toBe('focused_member');
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

    expect(resolveTeamUserMessageTargetResult(teamContext).reason).toBe('task_agent_only_logical_member');

    const target = resolveTeamUserMessageTarget(teamContext, { allowActiveExecutionSafetyFallback: true });
    expect(target).toMatchObject({
      memberRouteKey: 'coordinator',
      source: 'active_execution_safety_fallback',
    });
  });
});
