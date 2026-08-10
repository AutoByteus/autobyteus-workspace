import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { handleTaskExecutionProjectionMessage } from '../teamTaskExecutionEventRouter';

const buildTeamContext = () => {
  const workerNode = {
    memberKind: 'agent',
    memberName: 'implementation_engineer',
    displayName: 'implementation_engineer',
    memberPath: ['implementation_engineer'],
    memberRouteKey: 'implementation_engineer',
    memberRunId: 'implementation-engineer-template-run',
    agentDefinitionId: 'implementation-engineer-def',
    currentStatus: AgentStatus.Offline,
  };
  return {
    teamRunId: 'team-run-1',
    config: { teamDefinitionName: 'Software Engineering Team' },
    memberTree: [workerNode],
    memberNodesByRouteKey: new Map<string, any>([
      ['implementation_engineer', workerNode],
    ]),
    leafAgentContextsByRouteKey: new Map<string, any>(),
    focusedMemberRouteKey: 'implementation_engineer',
    isActive: true,
    isSubscribed: true,
  } as any;
};

describe('teamTaskExecutionEventRouter', () => {
  it('applies delegated task details to task-agent projection nodes from TASK_DELEGATION_EVENT payloads', () => {
    const teamContext = buildTeamContext();

    const result = handleTaskExecutionProjectionMessage(teamContext, {
      type: 'TASK_DELEGATION_EVENT',
      payload: {
        event_type: 'TASK_DELEGATION_ACTIVATED',
        execution_kind: 'task_agent',
        task_agent_run_id: 'task-agent-run-1',
        task_agent_instance_id: 'task-agent-instance-1',
        task_id: 'task_0001',
        member_route_key: 'implementation_engineer',
        member_path: ['implementation_engineer'],
        description: 'Implement the active tasks UI.',
        taskLabel: 'Task 1',
        referenceFiles: [{
          referenceId: 'task-reference:0:/tmp/requirements.md',
          path: '/tmp/requirements.md',
          type: 'file',
          createdAt: '2026-06-28T00:00:00.000Z',
          updatedAt: '2026-06-28T00:00:00.000Z',
        }],
        taskArguments: {
          target: { kind: 'member', name: 'implementation_engineer' },
          description: 'Implement the active tasks UI.',
          reference_files: ['/tmp/requirements.md'],
        },
        target_name: 'implementation_engineer',
        target: { kind: 'member' },
        status: 'active',
      },
    } as any);

    const node = teamContext.memberNodesByRouteKey.get('task-agent-run-1');
    expect(result).toMatchObject({
      outcome: 'handled',
      mutation: { kind: 'TOPOLOGY' },
    });
    expect(node).toMatchObject({
      isTaskAgentInstance: true,
      taskAgentRunId: 'task-agent-run-1',
      taskId: 'task_0001',
      taskLabel: 'Task 1',
      taskDescription: 'Implement the active tasks UI.',
      taskReferenceFiles: [expect.objectContaining({ referenceId: 'task-reference:0:/tmp/requirements.md', path: '/tmp/requirements.md' })],
      taskArguments: expect.objectContaining({ reference_files: ['/tmp/requirements.md'] }),
      taskTargetKind: 'member',
      taskTargetName: 'implementation_engineer',
      taskExecutionStatus: 'active',
    });
    const taskContext = teamContext.leafAgentContextsByRouteKey.get('task-agent-run-1');
    expect(taskContext.state.conversation.messages).toHaveLength(0);
    expect(taskContext.state.eventMonitorPresentationRevision).toBe(0);
  });

  it.each([
    ['AGENT_STATUS', { status: AgentStatus.Running }],
    ['SEGMENT_CONTENT', {
      id: 'task-agent-segment-1',
      turn_id: 'task-agent-turn-1',
      segment_type: 'text',
      delta: 'First task-agent content',
    }],
  ])('creates the task-agent projection before routing a first ordinary %s message', (type, payload) => {
    const teamContext = buildTeamContext();

    const result = handleTaskExecutionProjectionMessage(teamContext, {
      type,
      payload: {
        ...payload,
        agent_id: 'task-agent-run-1',
        member_route_key: 'implementation_engineer',
        member_path: ['implementation_engineer'],
        source_route_key: 'implementation_engineer',
        source_path: ['implementation_engineer'],
        task_agent_instance_id: 'task-agent-instance-1',
        task_agent_run_id: 'task-agent-run-1',
        task_id: 'task_0001',
      },
    } as any);

    expect(result).toMatchObject({
      outcome: 'memberContext',
      memberRouteKey: 'task-agent-run-1',
      mutation: { kind: 'TOPOLOGY' },
    });
    expect(teamContext.leafAgentContextsByRouteKey.has('task-agent-run-1')).toBe(true);
    expect(teamContext.memberNodesByRouteKey.get('task-agent-run-1')).toMatchObject({
      isTaskAgentInstance: true,
      logicalMemberRouteKey: 'implementation_engineer',
    });
  });

  it('returns none for an exact repeated ensure and topology when the same identity repairs a missing node', () => {
    const teamContext = buildTeamContext();
    const message = {
      type: 'AGENT_STATUS',
      payload: {
        status: AgentStatus.Running,
        agent_id: 'task-agent-run-1',
        member_route_key: 'implementation_engineer',
        member_path: ['implementation_engineer'],
        source_route_key: 'implementation_engineer',
        source_path: ['implementation_engineer'],
        task_agent_instance_id: 'task-agent-instance-1',
        task_agent_run_id: 'task-agent-run-1',
        task_id: 'task_0001',
      },
    } as any;

    expect(handleTaskExecutionProjectionMessage(teamContext, message).mutation.kind).toBe('TOPOLOGY');
    expect(handleTaskExecutionProjectionMessage(teamContext, message).mutation).toEqual({ kind: 'NONE' });

    teamContext.memberNodesByRouteKey = new Map(teamContext.memberNodesByRouteKey);
    teamContext.memberNodesByRouteKey.delete('task-agent-run-1');
    teamContext.memberTree = teamContext.memberTree.filter(
      (node: any) => node.memberRouteKey !== 'task-agent-run-1',
    );

    const repaired = handleTaskExecutionProjectionMessage(teamContext, message);
    expect(repaired.mutation).toMatchObject({ kind: 'TOPOLOGY' });
    expect(teamContext.memberNodesByRouteKey.has('task-agent-run-1')).toBe(true);
    expect(teamContext.memberTree.map((node: any) => node.memberRouteKey)).toContain('task-agent-run-1');
  });

  it('keeps right-pane-only delegation detail updates out of navigation mutations', () => {
    const teamContext = buildTeamContext();
    const buildMessage = (description: string) => ({
      type: 'TASK_DELEGATION_EVENT',
      payload: {
        event_type: 'TASK_DELEGATION_STATUS_UPDATED',
        execution_kind: 'task_agent',
        task_agent_run_id: 'task-agent-run-1',
        task_agent_instance_id: 'task-agent-instance-1',
        task_id: 'task_0001',
        member_route_key: 'implementation_engineer',
        member_path: ['implementation_engineer'],
        description,
        status: 'active',
      },
    } as any);

    expect(handleTaskExecutionProjectionMessage(teamContext, buildMessage('First detail')).mutation.kind)
      .toBe('TOPOLOGY');
    const detailOnly = handleTaskExecutionProjectionMessage(teamContext, buildMessage('Updated detail'));

    expect(detailOnly.mutation).toEqual({ kind: 'NONE' });
    expect(teamContext.memberNodesByRouteKey.get('task-agent-run-1')?.taskDescription)
      .toBe('Updated detail');
  });
});
