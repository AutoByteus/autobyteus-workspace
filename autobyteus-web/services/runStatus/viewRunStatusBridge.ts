import { effectScope, watch } from 'vue'
import type { RunStatusRunRef } from '@autobyteus/collaboration-stream-contracts'
import { useRunStatusStore } from '~/stores/runStatusStore'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { collaborationTaskExecutionLists } from '~/services/collaborators/agentSourceSelectors'
import { collaborationViewRuns, type ViewRuns } from '~/services/runStatus/viewRunRefs'
import type { AgentContext } from '~/types/agent/AgentContext'
import type { AgentStatus } from '~/types/agent/AgentStatus'

type View = Readonly<{ runs: ViewRuns; contextOf(agentRunId: string): AgentContext | null }>

/** A Team view's rows (its navigation rows: delegated and peer runs at every depth) and their agents. */
const teamViewRuns = (rows: ReadonlyArray<Readonly<{ kind: string; agentRunId: string | null; teamRunId: string | null }>>): ViewRuns => ({
  refs: rows.flatMap((row): RunStatusRunRef[] => row.kind === 'task_agent' && row.agentRunId ? [{ kind: 'agent', runId: row.agentRunId }]
    : row.kind === 'task_team' && row.teamRunId ? [{ kind: 'agent_team', runId: row.teamRunId }] : []),
  agentRunIds: rows.flatMap((row) => (row.kind === 'task_agent' || row.kind === 'task_team_agent') && row.agentRunId ? [row.agentRunId] : []),
})

/**
 * Team and Org views show each delegated or peer run's status as that run answers it, read by run ID on `/ws/run-status`
 * (autobyteus-461 SR-083, FU-026); never relayed through the delegator. Each open view holds the runs its rows show.
 * (An Agent run's views do the same in their own store.) Installed once per window.
 */
export const installViewRunStatusBridge = (): (() => void) => {
  const scope = effectScope(true)
  scope.run(() => {
    const runStatus = useRunStatusStore()
    const teams = useAgentTeamContextsStore()
    const orgs = useAgentOrgContextsStore()
    const views = (): View[] => [
      ...[...teams.teams.values()].map((team) => ({ runs: teamViewRuns(team.view.listNavigationRows()), contextOf: (id: string) => team.view.getAgentContext(id) })),
      ...Object.values(orgs.contexts).map((org) => ({
        runs: collaborationViewRuns(collaborationTaskExecutionLists({ taskExecutions: org.executionTree.rootOrg.taskExecutions, members: org.executionTree.rootOrg.members }), org.remoteExecutions),
        contextOf: (id: string) => org.getAgentContext(id),
      })),
    ]
    watch(() => views().flatMap((view) => view.runs.refs), (refs, _previous, onCleanup) => { onCleanup(runStatus.hold(refs)) }, { immediate: true, deep: true })
    watch(() => views().flatMap((view) => view.runs.agentRunIds.map((id) => [view, id, runStatus.statusOf(id)] as const)), (entries) => {
      for (const [view, id, status] of entries) {
        const context = status ? view.contextOf(id) : null
        if (context && context.state.currentStatus !== status) context.state.currentStatus = status as AgentStatus
      }
    }, { immediate: true })
  })
  return () => scope.stop()
}
