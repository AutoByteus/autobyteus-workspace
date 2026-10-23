import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import type { AgentOrgExecutionContext } from '~/services/agentOrgExecution/agentOrgExecutionContext'
import type { AgentOrgRunHistoryItem } from '~/stores/runHistoryTypes'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { projectAgentOrgHistoryRows } from '~/utils/agentOrgHistoryRows'

/** autobyteus-278: an Org root's remote runs are rows among its root copies, drawn by the shared delegated row. */

const remoteTeam = {
  kind: 'agent_team' as const, address: '/marketing_team', team_run_id: 'marketing-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/marketing_team/lead',
  members: [{ address: '/marketing_team/writer', agent_run_id: 'writer-run' }, { address: '/marketing_team/lead', agent_run_id: 'lead-run' }],
  delegator_agent_run_id: 'agent-director', started_at: '2999-01-01T00:00:00.000Z',
}

describe('Org history rows with remote runs', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('adds a remote Team row (opening its coordinator) with its members, after the root copies started earlier', () => {
    const view = taskBearingView()
    const tree = view.execution_tree as AgentOrgRunHistoryItem['executionTree']
    const run: AgentOrgRunHistoryItem = { stableKey: 'agent_org_run:org-run', rootSubjectKind: 'agent_org', rootRunId: tree.rootOrg.orgRunId,
      createdAt: tree.createdAt, archivedAt: null, isActive: true, summary: 'Org', executionTree: tree, closedTaskExecutions: [] }
    const statuses: Record<string, AgentStatus> = { 'lead-run': AgentStatus.Running, 'writer-run': AgentStatus.Idle }
    const context = {
      orgRunId: run.rootRunId, executionTree: tree, isActive: true, phase: 'live', view: { closed_task_executions: [] },
      remoteExecutions: [remoteTeam],
      getAgentContext: (agentRunId: string) => ({ state: { currentStatus: statuses[agentRunId] ?? AgentStatus.Idle } }),
    } as unknown as AgentOrgExecutionContext
    const rows = projectAgentOrgHistoryRows({ run, context, isTeamExpanded: () => false })
    const remote = rows.filter((display) => display.row.kind === 'remote').map((display) => display.row)
    expect(remote.map((row) => row.kind === 'remote' && [row.key, row.depth, row.transient.remote?.nodeName, row.transient.currentStatus])).toEqual([
      ['team:marketing-run', 0, 'docker', null],
      ['agent:writer-run', 1, 'docker', AgentStatus.Idle],
      ['agent:lead-run', 1, 'docker', AgentStatus.Running],
    ])
    const team = remote[0]!
    expect(team.kind === 'remote' && [team.openAgentRunId, team.openAddress, team.teamStatus]).toEqual(['lead-run', '/marketing_team/lead', AgentStatus.Running])
    expect(rows.at(-3)?.row.kind).toBe('remote')
  })
})
