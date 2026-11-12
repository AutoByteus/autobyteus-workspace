import { describe, expect, it } from 'vitest'
import { childOfCollaborationTask, childOfListedRun, childOfRemoteExecution, childOfTeamTask } from '../delegatedChildRuns'

/**
 * autobyteus-461 CR-461-028: a team child's coordinator, the member its row opens, is its member at its coordinator
 * address (the views) or the member its Task entry names (the poll). A team without it is refused, never opened at
 * another member.
 */
const startedAt = '2026-11-12T00:00:00.000Z'
const lead = { address: '/qa/lead', agentRunId: 'lead-run' }
const tester = { address: '/qa/tester', agentRunId: 'tester-run' }

describe('a team child\'s coordinator', () => {
  const viewTask = (coordinatorAddress: string) => ({ address: '/qa', teamRunId: 'qa-run', delegatorAgentRunId: 'host', startedAt,
    members: [{ ...tester, platformAgentRunId: null }, { ...lead, platformAgentRunId: null }], taskExecutions: [],
    source: { kind: 'agent_team', coordinatorAddress } }) as never
  const teamTask = (coordinator_address: string) => ({ kind: 'task_team', address: '/qa', team_run_id: 'qa-run', delegator_agent_run_id: 'm',
    started_at: startedAt, task_executions: [], source: { coordinator_address },
    members: [tester, lead].map((member) => ({ address: member.address, agent_run_id: member.agentRunId, platform_agent_run_id: null })) }) as never
  const remote = (coordinator_address: string) => ({ kind: 'agent_team', address: '/qa', team_run_id: 'qa-run', coordinator_address,
    node_id: 'node-b', node_name: 'docker', delegator_agent_run_id: 'host', started_at: startedAt,
    members: [tester, lead].map((member) => ({ address: member.address, agent_run_id: member.agentRunId })) }) as never
  const listed = (coordinatorAgentRunId: string) => ({ row: { kind: 'agent_team', address: '/qa', teamRunId: 'qa-run', coordinatorAgentRunId,
    delegatorAgentRunId: 'host', startedAt, members: [tester, lead].map((member) => ({ ...member, agentDefinitionId: null })) },
  delegatorAddress: null, statuses: [], node: null }) as never

  it('is its member at its coordinator address, from every view', () => {
    expect(childOfCollaborationTask(viewTask('/qa/lead')).coordinatorAgentRunId).toBe('lead-run')
    expect(childOfTeamTask(teamTask('/qa/lead')).coordinatorAgentRunId).toBe('lead-run')
    expect(childOfRemoteExecution(remote('/qa/lead')).coordinatorAgentRunId).toBe('lead-run')
    expect(childOfListedRun(listed('lead-run')).coordinatorAgentRunId).toBe('lead-run')
  })

  it('is refused when no member is it, never another member', () => {
    const refusal = "Team run 'qa-run' has no member at its coordinator address '/qa/chair'."
    expect(() => childOfCollaborationTask(viewTask('/qa/chair'))).toThrow(refusal)
    expect(() => childOfTeamTask(teamTask('/qa/chair'))).toThrow(refusal)
    expect(() => childOfRemoteExecution(remote('/qa/chair'))).toThrow(refusal)
    expect(() => childOfListedRun(listed('chair-run'))).toThrow("Team run 'qa-run' has no coordinator 'chair-run' among its members.")
  })
})
