import type { TaskExecutionDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'
import { useListedRunChildrenStore } from '~/stores/listedRunChildrenStore'
import type { DelegatedReference, DelegatedRoot } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'

type AgentContextReader = Readonly<{ getAgentContext?(agentRunId: string): { state: { currentStatus: unknown } } | null }>

/** The agents of a Team copy of a Team root, by its run ID. */
const teamRootTeamAgents = (tree: TeamRunExecutionTreeDto, teamRunId: string): string[] => {
  const visit = (tasks: readonly TaskExecutionDto[]): string[] | null => {
    for (const task of tasks) {
      if (task.kind !== 'task_team') continue
      if (task.team_run_id === teamRunId) return task.members.map((member) => member.agent_run_id)
      const nested = visit(task.task_executions)
      if (nested) return nested
    }
    return null
  }
  return visit(tree.root_team.task_executions) ?? []
}

const LISTED_KIND = { AGENT: 'agent', AGENT_TEAM: 'agent_team', AGENT_ORG: 'agent_org' } as const

/**
 * A child of a listed run that is not open, from the history poll's answer (autobyteus-461 SR-055): it runs when any of
 * its agents is not offline. False when the answer does not list it.
 */
const isListedChildLive = (root: DelegatedRoot, reference: DelegatedReference): boolean => {
  const child = useListedRunChildrenStore().answerOf(LISTED_KIND[root.rootKind], root.rootRunId)?.children.find(({ row }) => 'agentRunId' in reference
    ? row.kind === 'agent' && row.agentRunId === reference.agentRunId
    : row.kind === 'agent_team' && row.teamRunId === reference.teamRunId)
  return Boolean(child?.statuses.some((status) => status.status !== AgentStatus.Offline))
}

/**
 * DS-002: whether a delegated copy of a root runs (any of its agents is not offline), for its stop icon. A Team counts
 * as one unit. From the root's view when it has one (false while that view has no index or agent contexts yet), else
 * from the history poll's answer for a listed run that is not open (SR-055).
 */
export const isDelegatedCopyLive = (root: DelegatedRoot, reference: DelegatedReference): boolean => {
  let context: AgentContextReader | null = null
  let teamAgents: (teamRunId: string) => readonly string[] = () => []
  if (root.rootKind === 'AGENT_TEAM') {
    const view = useAgentTeamContextsStore().getTeamContextById(root.rootRunId)?.view ?? null
    context = view
    teamAgents = (teamRunId) => view?.getExecutionTree ? teamRootTeamAgents(view.getExecutionTree(), teamRunId) : []
  } else if (root.rootKind === 'AGENT_ORG') {
    const org = useAgentOrgContextsStore().contextFor(root.rootRunId)
    context = org
    teamAgents = (teamRunId) => {
      const team = org?.index?.teams?.get(teamRunId)?.execution
      return team ? team.members.map((member) => member.agentRunId) : []
    }
  } else {
    const collaboration = useAgentRunCollaborationStore().contextFor(root.rootRunId)
    context = collaboration
    teamAgents = (teamRunId) => {
      const team = collaboration?.index?.teams?.get(teamRunId)?.execution
      return team ? team.members.map((member) => member.agentRunId) : []
    }
  }
  if (!context) return isListedChildLive(root, reference)
  // autobyteus-278: a remote Team copy's agents are its members as the link names them.
  const remoteTeam = 'teamRunId' in reference ? useRemoteRunsStore().run(reference.teamRunId) : null
  const ids = 'agentRunId' in reference ? [reference.agentRunId] : remoteTeam ? remoteTeam.agentRunIds : teamAgents(reference.teamRunId)
  // A view without agent contexts (nothing live yet) shows no running copy.
  return ids.some((id) => (context!.getAgentContext?.(id)?.state.currentStatus ?? AgentStatus.Offline) !== AgentStatus.Offline)
}
