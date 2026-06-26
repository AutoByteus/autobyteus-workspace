import { describe, expect, it } from 'vitest';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import {
  extractTaskTeamIdentity,
  updateTaskTeamExecutionProjectionFromEvent,
} from '../teamTaskTeamExecutionProjection';

const createAgentContext = (name: string, runId: string) => new AgentContext({
  agentDefinitionId: `${name}-def`,
  agentDefinitionName: name,
  llmModelIdentifier: 'model',
  runtimeKind: 'codex_app_server',
  workspaceId: null,
  workspaceMetadata: null,
  autoExecuteTools: true,
  skillAccessMode: 'NONE',
  isLocked: true,
  llmConfig: null,
}, new AgentRunState(runId, {
  id: runId,
  messages: [],
  createdAt: '2026-06-26T00:00:00.000Z',
  updatedAt: '2026-06-26T00:00:00.000Z',
  agentDefinitionId: `${name}-def`,
  agentName: name,
  llmModelIdentifier: 'model',
}));

const buildTeamContext = () => {
  const solutionNode = {
    memberKind: 'agent',
    memberName: 'solution_designer',
    displayName: 'Solution Designer',
    memberPath: ['SoftwareEngineeringTeam', 'solution_designer'],
    memberRouteKey: 'SoftwareEngineeringTeam/solution_designer',
    memberRunId: 'solution-structural-run',
    agentDefinitionId: 'solution-def',
    currentStatus: AgentStatus.Offline,
  };
  const implementationNode = {
    memberKind: 'agent',
    memberName: 'implementation_engineer',
    displayName: 'Implementation Engineer',
    memberPath: ['SoftwareEngineeringTeam', 'implementation_engineer'],
    memberRouteKey: 'SoftwareEngineeringTeam/implementation_engineer',
    memberRunId: 'implementation-structural-run',
    agentDefinitionId: 'implementation-def',
    currentStatus: AgentStatus.Offline,
  };
  const teamNode = {
    memberKind: 'agent_team',
    memberName: 'SoftwareEngineeringTeam',
    displayName: 'Software Engineering Team',
    memberPath: ['SoftwareEngineeringTeam'],
    memberRouteKey: 'SoftwareEngineeringTeam',
    memberRunId: 'software-team-template-run',
    teamDefinitionId: 'software-team-def',
    teamRunId: null,
    coordinatorMemberRouteKey: 'solution_designer',
    children: [solutionNode, implementationNode],
    currentStatus: AgentStatus.Offline,
  };
  return {
    teamRunId: 'parent-team-run',
    config: { teamDefinitionName: 'Parent' },
    memberTree: [teamNode],
    memberNodesByRouteKey: new Map<string, any>([
      ['SoftwareEngineeringTeam', teamNode],
      ['SoftwareEngineeringTeam/solution_designer', solutionNode],
      ['SoftwareEngineeringTeam/implementation_engineer', implementationNode],
    ]),
    leafAgentContextsByRouteKey: new Map<string, any>([
      ['SoftwareEngineeringTeam/solution_designer', createAgentContext('solution_designer', 'solution-structural-run')],
      ['SoftwareEngineeringTeam/implementation_engineer', createAgentContext('implementation_engineer', 'implementation-structural-run')],
    ]),
    focusedMemberRouteKey: 'SoftwareEngineeringTeam',
    currentStatus: AgentTeamStatus.Idle,
    isSubscribed: true,
  } as any;
};

describe('teamTaskTeamExecutionProjection', () => {
  it('extracts task-team identity only from task-team delegation payloads', () => {
    expect(extractTaskTeamIdentity({
      type: 'TASK_DELEGATION_EVENT',
      payload: {
        execution_kind: 'task_team',
        task_team_run_id: 'task-team-run-1',
        task_team_instance_id: 'task-team-instance-1',
        task_id: 'task_0001',
        team_route_key: 'SoftwareEngineeringTeam',
        team_path: ['SoftwareEngineeringTeam'],
      },
    } as any)).toMatchObject({
      taskTeamRunId: 'task-team-run-1',
      logicalTeamRouteKey: 'SoftwareEngineeringTeam',
    });

    expect(extractTaskTeamIdentity({
      type: 'TASK_DELEGATION_EVENT',
      payload: { execution_kind: 'task_agent', task_agent_run_id: 'task-agent-run' },
    } as any)).toBeNull();
  });

  it('creates a distinct root projection and scoped child clones without mutating structural nodes', () => {
    const teamContext = buildTeamContext();
    const structuralTeam = teamContext.memberNodesByRouteKey.get('SoftwareEngineeringTeam');
    const structuralChild = teamContext.memberNodesByRouteKey.get('SoftwareEngineeringTeam/solution_designer');

    updateTaskTeamExecutionProjectionFromEvent(teamContext, {
      type: 'TASK_DELEGATION_EVENT',
      payload: {
        event_type: 'TASK_DELEGATION_ACTIVATED',
        execution_kind: 'task_team',
        task_team_run_id: 'task-team-run-1',
        task_team_instance_id: 'task-team-instance-1',
        task_id: 'task_0001',
        team_route_key: 'SoftwareEngineeringTeam',
        team_path: ['SoftwareEngineeringTeam'],
      },
    } as any);

    const root = teamContext.memberNodesByRouteKey.get('task-team-run-1');
    const clonedSolution = teamContext.memberNodesByRouteKey.get('task-team-run-1/solution_designer');

    expect(root).toMatchObject({
      memberKind: 'agent_team',
      isTaskTeamInstance: true,
      taskTeamRunId: 'task-team-run-1',
      taskTeamInstanceId: 'task-team-instance-1',
      taskId: 'task_0001',
      logicalTeamRouteKey: 'SoftwareEngineeringTeam',
      taskExecutionStatus: 'active',
    });
    expect(clonedSolution).toMatchObject({
      memberRouteKey: 'task-team-run-1/solution_designer',
      memberPath: ['task-team-run-1', 'solution_designer'],
      isTaskTeamChildProjection: true,
      parentTaskTeamRunId: 'task-team-run-1',
      structuralSourceRouteKey: 'SoftwareEngineeringTeam/solution_designer',
      memberRunId: null,
    });
    expect(clonedSolution).not.toBe(structuralChild);
    expect(teamContext.memberNodesByRouteKey.get('SoftwareEngineeringTeam')).toBe(structuralTeam);
    expect(teamContext.leafAgentContextsByRouteKey.get('task-team-run-1/solution_designer')?.state.runId).toBe('task-team-run-1/solution_designer');
    expect((structuralChild as any).memberRunId).toBe('solution-structural-run');
  });
});
