import type { TaskExecutionDto as TeamTaskExecutionDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import type { AgentRunCollaborationIndex } from '~/services/agentCollaboration/agentRunCollaborationIndex'
import type { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import type { ParticipantMessagesKey } from '~/services/collaborationMessages/collaborationParticipantMessages'

/**
 * A delegated run on this node, as rule 2 reaches it (autobyteus-461 SR-061): a run of its own, by its own run ID. An
 * agent row is that agent run; a member of a delegated Team is that member of the Team run, at its address in the Team
 * run's own space (as the server sends it). A delegator's view only shows its row. A run on a peer node is not one: it
 * is reached by its own identity through the server's peer handle (SR-066), on the view's stream.
 */
export type DelegatedRunSubject =
  | Readonly<{ kind: 'agent'; agentRunId: string }>
  | Readonly<{ kind: 'team_member'; teamRunId: string; agentRunId: string }>

const agentSubject = (agentRunId: string): DelegatedRunSubject => Object.freeze({ kind: 'agent', agentRunId })
const memberSubject = (teamRunId: string, agentRunId: string): DelegatedRunSubject =>
  Object.freeze({ kind: 'team_member', teamRunId, agentRunId })

/**
 * The run a tree row opens (autobyteus-461 SR-084): its `openTarget`, as the server built it, read as a subject: an agent
 * run, or a team run at the agent to focus. Nothing about the run is derived on the client.
 */
export const subjectOfTarget = (target: Readonly<{ runKind: 'agent' | 'agent_team'; runId: string; agentRunId: string }>): DelegatedRunSubject =>
  target.runKind === 'agent' ? agentSubject(target.agentRunId) : memberSubject(target.runId, target.agentRunId)

const teamTaskSubject = (tasks: readonly TeamTaskExecutionDto[], agentRunId: string): DelegatedRunSubject | null => {
  for (const task of tasks) {
    if (task.kind === 'task_agent') {
      if (task.agent_run_id === agentRunId) return agentSubject(agentRunId)
      continue
    }
    const member = task.members.find((candidate) => candidate.agent_run_id === agentRunId)
    if (member) return memberSubject(task.team_run_id, agentRunId)
    const nested = teamTaskSubject(task.task_executions, agentRunId)
    if (nested) return nested
  }
  return null
}

/** A Team view's agent, when it is a delegated run on this node; null for the Team's own members. */
export const teamDelegatedRunSubject = (tree: TeamRunExecutionTreeDto, agentRunId: string): DelegatedRunSubject | null =>
  teamTaskSubject(tree.root_team.task_executions, agentRunId)

/** An Org view's agent, when it is a delegated run on this node; null for the Org's own agents and peer runs. */
export const orgDelegatedRunSubject = (index: Pick<AgentOrgExecutionViewIndex, 'agents'>, agentRunId: string): DelegatedRunSubject | null => {
  const agent = index.agents.get(agentRunId)
  if (agent?.kind === 'task') return agentSubject(agentRunId)
  if (agent?.kind === 'task_team_member') return memberSubject(agent.host.runId, agentRunId)
  return null
}

/**
 * An agent run's view's agent, when it is a delegated run on this node; null for the run's own agent and peer runs. A
 * Team member is always read through its Team run: one without it is refused, never read as an agent run (CR-461-028).
 */
export const agentRunDelegatedRunSubject = (index: Pick<AgentRunCollaborationIndex, 'agents'>, agentRunId: string): DelegatedRunSubject | null => {
  const child = index.agents.get(agentRunId)
  if (!child) return null
  if (child.kind === 'task_agent') return agentSubject(agentRunId)
  if (!child.teamRunId) throw new Error(`Task Team member '${agentRunId}' has no Team run.`)
  return memberSubject(child.teamRunId, agentRunId)
}

/** Whose log holds a delegated run's Team tab messages: its own run's (CR-461-020, CR-461-022). */
export const delegatedRunMessagesKey = (subject: DelegatedRunSubject): ParticipantMessagesKey => subject.kind === 'agent'
  ? Object.freeze({ rootKind: 'agent', rootRunId: subject.agentRunId, agentRunId: subject.agentRunId })
  : Object.freeze({ rootKind: 'agent_team', rootRunId: subject.teamRunId, agentRunId: subject.agentRunId })
