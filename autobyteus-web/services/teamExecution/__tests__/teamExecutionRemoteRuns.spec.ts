import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { buildTestTeamContext, testAgentNode } from '~/test-support/currentTeamTestFixtures'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

/** autobyteus-278: a Team root's remote runs: placements, contexts and rows beside its tree; summaries; a new one reloads. */

const remoteTeam = {
  kind: 'agent_team' as const, address: '/marketing_team', team_run_id: 'marketing-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/marketing_team/lead',
  members: [{ address: '/marketing_team/lead', agent_run_id: 'lead-run' }, { address: '/marketing_team/writer', agent_run_id: 'writer-run' }],
  delegator_agent_run_id: 'coordinator-run', started_at: '2026-10-23T08:00:00.000Z',
}

const withRemoteSnapshot = () => {
  const coordinator = testAgentNode('/coordinator', { displayName: 'Coordinator', agentRunId: 'coordinator-run' })
  const team = buildTestTeamContext({ teamRunId: 'team-root', teamDefinitionId: 'team-def', teamDefinitionName: 'Studio',
    coordinatorAddress: coordinator.address, rootChildren: [coordinator] })
  const view = team.view
  const result = view.applySnapshot({ type: 'TEAM_EXECUTION_VIEW_SNAPSHOT', payload: {
    root_team_run_id: 'team-root', base_change_sequence: 3, execution_tree: view.getExecutionTree(), closed_task_executions: [], messages: [],
    agent_statuses: view.listLiveAgentContextEntries().map((entry) => ({ agent_run_id: entry.agentRunId, member_address: entry.memberAddress,
      status: 'idle', trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null })),
    agent_input_states: [], remote_task_executions: [remoteTeam],
  } } as never)
  expect(result.disposition).toBe('applied')
  return view
}

describe('Team execution view with remote runs', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('holds a context per remote agent and lists the remote Team at the root level with its members', () => {
    const view = withRemoteSnapshot()
    expect(view.getAgentContext('writer-run')?.state.currentStatus).toBe(AgentStatus.Offline)
    expect(view.getMemberAddress('lead-run')).toBe('/marketing_team/lead')
    const rows = view.listNavigationRows().filter((row) => row.address.startsWith('/marketing_team'))
    expect(rows.map((row) => [row.kind, row.key, row.depth, row.parentKey])).toEqual([
      ['task_team', 'team:marketing-run', 1, 'team:team-root'],
      ['task_team_agent', 'agent:lead-run', 2, 'team:marketing-run'],
      ['task_team_agent', 'agent:writer-run', 2, 'team:marketing-run'],
    ])
    expect(rows[0]!.delegatedBy).toBe('coordinator')
    expect(view.focusAgent('writer-run').disposition).toBe('applied')
  })

  it("applies a node's summary, dispatches a remote member's output, and reloads for a remote run it does not know", () => {
    const view = withRemoteSnapshot()
    useRemoteRunsStore().register(remoteTeam, () => true)
    const summary = view.applyMessage({ type: 'REMOTE_TASK_EXECUTION_SUMMARY', payload: { change_sequence: 4, node_id: 'srv_docker',
      run_id: 'marketing-run', reachable: true, title: 'Plan the October campaign', statuses: [{ agent_run_id: 'lead-run', status: 'running' }] } })
    expect(summary.disposition).toBe('applied')
    expect(view.getAgentContext('lead-run')?.state.currentStatus).toBe(AgentStatus.Running)
    expect(useRemoteRunsStore().run('marketing-run')?.title).toBe('Plan the October campaign')
    const output = view.applyMessage({ type: 'TURN_STARTED', payload: { change_sequence: 5, agent_run_id: 'writer-run', turn_id: 't1' } } as never)
    expect(output.effects).toEqual([expect.objectContaining({ kind: 'dispatch_agent', agentRunId: 'writer-run' })])
    const known = view.applyMessage({ type: 'REMOTE_TASK_EXECUTION_STARTED', payload: { change_sequence: 6, execution: remoteTeam } })
    expect(known.effects).toEqual([])
    const unknown = view.applyMessage({ type: 'REMOTE_TASK_EXECUTION_STARTED', payload: { change_sequence: 7,
      execution: { ...remoteTeam, team_run_id: 'other-run', members: [{ address: '/marketing_team/lead', agent_run_id: 'other-lead' }] } } })
    expect(unknown.effects).toEqual([{ kind: 'team_stream_recovery_required' }])
    expect(view.needsStreamRecovery()).toBe(true)
  })
})
