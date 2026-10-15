import type { TaskExecutionDto, TaskTeamMemberExecutionDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore'
import { useAgentOrgContextsStore } from '~/stores/agentOrgContextsStore'
import { useAgentRunCollaborationStore } from '~/stores/agentRunCollaborationStore'
import type { DelegatedReference, DelegatedRoot } from '~/services/runConfigEditing/delegatedLaunchSelectionClient'

type AgentContextReader = Readonly<{ getAgentContext?(agentRunId: string): { state: { currentStatus: unknown } } | null }>
type CamelMember = Readonly<{ agentRunId: string }> | Readonly<{ members: readonly CamelMember[] }>

const camelAgentIds = (members: readonly CamelMember[]): string[] =>
  members.flatMap((member) => 'agentRunId' in member ? [member.agentRunId] : camelAgentIds(member.members))
const snakeAgentIds = (members: readonly TaskTeamMemberExecutionDto[]): string[] =>
  members.flatMap((member) => member.kind === 'task_team_agent' ? [member.agent_run_id] : snakeAgentIds(member.members))

/** The agents of a Team copy of a Team root, by its run ID. */
const teamRootTeamAgents = (tree: TeamRunExecutionTreeDto, teamRunId: string): string[] => {
  const visit = (tasks: readonly TaskExecutionDto[]): string[] | null => {
    for (const task of tasks) {
      if (task.kind !== 'task_team') continue
      if (task.team_run_id === teamRunId) return snakeAgentIds(task.members)
      const nested = visit(task.task_executions)
      if (nested) return nested
    }
    return null
  }
  return visit(tree.root_team.task_executions) ?? []
}

/**
 * DS-002: whether a delegated copy of a live root runs (any of its agents is not
 * offline), for its stop icon. A Team counts as one unit. False when the root has no live view (or a
 * view still without its index or agent contexts).
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
      return team && 'members' in team ? camelAgentIds(team.members as readonly CamelMember[]) : []
    }
  } else {
    const collaboration = useAgentRunCollaborationStore().contextFor(root.rootRunId)
    context = collaboration
    teamAgents = (teamRunId) => {
      const team = collaboration?.index?.teams?.get(teamRunId)?.execution
      return team ? camelAgentIds(team.members as readonly CamelMember[]) : []
    }
  }
  if (!context) return false
  const ids = 'agentRunId' in reference ? [reference.agentRunId] : teamAgents(reference.teamRunId)
  // A view without agent contexts (nothing live yet) shows no running copy.
  return ids.some((id) => (context!.getAgentContext?.(id)?.state.currentStatus ?? AgentStatus.Offline) !== AgentStatus.Offline)
}
