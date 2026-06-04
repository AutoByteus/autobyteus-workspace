import { describe, expect, it } from 'vitest';
import { AgentContext } from '~/types/agent/AgentContext';
import { AgentRunState } from '~/types/agent/AgentRunState';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { resolveTeamStreamMemberContext } from '../teamStreamMemberContextResolver';
import { ensureTaskAgentContext } from '../teamTaskAgentContextProjection';
import type { ServerMessage } from '../protocol';

const createLogicalAgentContext = (memberName: string, runId: string): AgentContext => {
  const conversation = {
    id: runId,
    messages: [],
    createdAt: '2026-06-03T00:00:00.000Z',
    updatedAt: '2026-06-03T00:00:00.000Z',
    agentDefinitionId: `${memberName}-definition`,
    agentName: memberName,
    llmModelIdentifier: 'test-model',
  };
  const context = new AgentContext(
    {
      agentDefinitionId: `${memberName}-definition`,
      agentDefinitionName: memberName,
      llmModelIdentifier: 'test-model',
      runtimeKind: 'codex_app_server',
      workspaceId: null,
      workspaceMetadata: null,
      autoExecuteTools: true,
      skillAccessMode: 'NONE',
      isLocked: true,
      llmConfig: null,
    },
    new AgentRunState(runId, conversation),
  );
  context.state.currentStatus = AgentStatus.Offline;
  return context;
};

const createTeamContext = (): AgentTeamContext => {
  const coordinator = createLogicalAgentContext('coordinator', 'coordinator-run');
  const worker = createLogicalAgentContext('worker', 'worker-run');
  const coordinatorNode = {
    memberKind: 'agent',
    memberName: 'coordinator',
    displayName: 'Coordinator',
    memberPath: ['coordinator'],
    memberRouteKey: 'coordinator',
    memberRunId: 'coordinator-run',
    agentDefinitionId: 'coordinator-definition',
    currentStatus: AgentStatus.Running,
  };
  const workerNode = {
    memberKind: 'agent',
    memberName: 'worker',
    displayName: 'Worker',
    memberPath: ['worker'],
    memberRouteKey: 'worker',
    memberRunId: 'worker-run',
    agentDefinitionId: 'worker-definition',
    currentStatus: AgentStatus.Offline,
  };
  return {
    teamRunId: 'team-run-1',
    config: {} as any,
    currentStatus: 'idle' as any,
    focusedMemberRouteKey: 'coordinator',
    coordinatorMemberRouteKey: 'coordinator',
    memberTree: [coordinatorNode, workerNode],
    memberNodesByRouteKey: new Map([
      ['coordinator', coordinatorNode],
      ['worker', workerNode],
    ]),
    leafAgentContextsByRouteKey: new Map([
      ['coordinator', coordinator],
      ['worker', worker],
    ]),
    isSubscribed: true,
    taskPlan: null,
    taskStatuses: null,
  };
};

describe('teamStreamMemberContextResolver', () => {
  it('routes explicit task-agent identity to a transient task-agent context', () => {
    const teamContext = createTeamContext();
    const workerContext = teamContext.leafAgentContextsByRouteKey.get('worker')!;
    const message: ServerMessage = {
      type: 'AGENT_STATUS',
      payload: {
        status: 'initializing',
        can_interrupt: false,
        agent_id: 'opaque-runtime-run',
        agent_name: 'worker',
        member_route_key: 'worker',
        member_path: ['worker'],
        source_route_key: 'worker',
        source_path: ['worker'],
        task_agent_instance_id: 'task-agent-instance-1',
        task_agent_run_id: 'opaque-runtime-run',
        task_id: 'task-1',
      },
    };

    const resolution = resolveTeamStreamMemberContext(teamContext, message);

    expect(resolution?.context).toBe(teamContext.leafAgentContextsByRouteKey.get('opaque-runtime-run'));
    expect(teamContext.memberNodesByRouteKey.get('opaque-runtime-run')).toMatchObject({
      isTaskAgentInstance: true,
      logicalMemberRouteKey: 'worker',
      taskAgentRunId: 'opaque-runtime-run',
    });
    expect(workerContext.state.runId).toBe('worker-run');
  });

  it('skips identity-less routed messages with a mismatched logical agent id', () => {
    const teamContext = createTeamContext();
    const workerContext = teamContext.leafAgentContextsByRouteKey.get('worker')!;
    const message: ServerMessage = {
      type: 'AGENT_STATUS',
      payload: {
        status: 'initializing',
        can_interrupt: false,
        agent_id: 'opaque-mismatched-run',
        agent_name: 'worker',
        member_route_key: 'worker',
        member_path: ['worker'],
      },
    };

    expect(resolveTeamStreamMemberContext(teamContext, message)).toBeNull();
    expect(workerContext.state.runId).toBe('worker-run');
    expect(teamContext.leafAgentContextsByRouteKey.has('opaque-mismatched-run')).toBe(false);
  });

  it('routes identity-less follow-up messages to an existing task-agent context by exact run id', () => {
    const teamContext = createTeamContext();
    const taskAgentContext = ensureTaskAgentContext(teamContext, {
      taskAgentRunId: 'opaque-existing-task-agent',
      taskAgentInstanceId: 'task-agent-instance-2',
      taskId: 'task-2',
      logicalMemberRouteKey: 'worker',
      logicalMemberPath: ['worker'],
    });
    const message: ServerMessage = {
      type: 'SEGMENT_START',
      payload: {
        id: 'seg-1',
        turn_id: 'turn-1',
        segment_type: 'text',
        agent_id: 'opaque-existing-task-agent',
        agent_name: 'worker',
        member_route_key: 'worker',
        member_path: ['worker'],
      },
    };

    expect(resolveTeamStreamMemberContext(teamContext, message)?.context).toBe(taskAgentContext);
  });
});
