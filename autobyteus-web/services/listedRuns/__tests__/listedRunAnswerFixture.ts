import type { AgentRunCollaborationViewDto, RunCollaborationStatusesDto } from '@autobyteus/collaboration-stream-contracts'

type Answer = RunCollaborationStatusesDto[number]

/**
 * The history poll's answer (autobyteus-461 SR-055, SR-057) for the standalone run of `view`: each child of the view by
 * its identity, delegated by the run's own agent; a local child with its agents' statuses (`statusOf`, else the view's,
 * else `offline`), a child on a peer node with its node and no statuses.
 */
export const agentRunAnswerFor = (
  view: AgentRunCollaborationViewDto,
  statusOf?: (agentRunId: string) => string,
): Answer => {
  const status = (agentRunId: string, memberAddress: string) => ({ agentRunId, memberAddress,
    status: statusOf?.(agentRunId) ?? view.agent_statuses.find((entry) => entry.agent_run_id === agentRunId)?.status ?? 'offline' })
  const host = view.execution_tree.host
  const peers = view.remote_task_executions.map((execution) => ({
    row: execution.kind === 'agent'
      ? { kind: 'agent' as const, address: execution.address, agentRunId: execution.agent_run_id, agentDefinitionId: null,
        delegatorAgentRunId: execution.delegator_agent_run_id, startedAt: execution.started_at }
      : { kind: 'agent_team' as const, address: execution.address, teamRunId: execution.team_run_id,
        coordinatorAgentRunId: (execution.members.find((member) => member.address === execution.coordinator_address) ?? execution.members[0]!).agent_run_id,
        delegatorAgentRunId: execution.delegator_agent_run_id, startedAt: execution.started_at,
        members: execution.members.map((member) => ({ address: member.address, agentRunId: member.agent_run_id, agentDefinitionId: null })) },
    delegatorAddress: host.address, statuses: [], node: { nodeId: execution.node_id, nodeName: execution.node_name },
  }))
  return { kind: 'agent', runId: host.agentRunId, isActive: view.is_active, children: [...view.execution_tree.taskExecutions.map((task) => 'agentRunId' in task
    ? { row: { kind: 'agent' as const, address: task.address, agentRunId: task.agentRunId, agentDefinitionId: 'd',
      ...(task.delegatorAgentRunId ? { delegatorAgentRunId: task.delegatorAgentRunId } : {}), startedAt: task.startedAt },
      delegatorAddress: host.address, statuses: [status(task.agentRunId, task.address)], node: null }
    : { row: { kind: 'agent_team' as const, address: task.address, teamRunId: task.teamRunId,
      coordinatorAgentRunId: (task.members.find((member) => member.address === task.source.coordinatorAddress) ?? task.members[0]!).agentRunId,
      ...(task.delegatorAgentRunId ? { delegatorAgentRunId: task.delegatorAgentRunId } : {}), startedAt: task.startedAt,
      members: task.members.map((member) => ({ address: member.address, agentRunId: member.agentRunId, agentDefinitionId: null })) },
      delegatorAddress: host.address, statuses: task.members.map((member) => status(member.agentRunId, member.address)), node: null }), ...peers] as Answer['children'] }
}
