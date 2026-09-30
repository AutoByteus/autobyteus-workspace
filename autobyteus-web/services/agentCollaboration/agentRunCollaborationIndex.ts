import type { AgentRunCollaborationViewDto } from '@autobyteus/collaboration-stream-contracts'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import {
  collaboratorAgentSourceAt,
  collaboratorTeamSourceAt,
  type CollaborationAgentSource,
} from '~/services/collaborators/agentSourceSelectors'

type Tree = AgentRunCollaborationViewDto['execution_tree']
type TaskExecution = Tree['taskExecutions'][number]
type TaskTeam = Extract<TaskExecution, { teamRunId: string }>
type TaskTeamMember = TaskTeam['members'][number]

/** One child AgentRun of a standalone run's collaboration root (the host is not a child). */
export type AgentRootChildAgent = Readonly<{
  agentRunId: string
  address: AgentTeamAddress
  /** `task_agent`: delegated directly; `task_team_member`: a member of a delegated task Team. */
  kind: 'task_agent' | 'task_team_member'
  source: CollaborationAgentSource
  /** The task Team this agent belongs to, when it is a member. */
  teamRunId: string | null
  /** The AgentRun that started this child; null for task Team members (their Team row has it). */
  delegatorAgentRunId: string | null
}>

export type AgentRootChildTeam = Readonly<{
  teamRunId: string
  address: AgentTeamAddress
  coordinatorAddress: string
  delegatorAgentRunId: string | null
  execution: TaskTeam | Extract<TaskTeamMember, { teamRunId: string }>
}>

/**
 * Children of an Agent root, indexed by run ID. Every source comes from a collaborator entry;
 * the host is the implicit delegator of top-level children and is not indexed.
 */
export class AgentRunCollaborationIndex {
  readonly agents = new Map<string, AgentRootChildAgent>()
  readonly teams = new Map<string, AgentRootChildTeam>()
  readonly hostRunId: string
  readonly hostAddress: AgentTeamAddress

  constructor(readonly tree: Tree) {
    this.hostRunId = tree.host.agentRunId
    this.hostAddress = parseAgentTeamAddress(tree.host.address)
    tree.taskExecutions.forEach((task) => this.addTask(task, null))
    for (const identity of [...this.agents.values(), ...this.teams.values()]) {
      const delegator = identity.delegatorAgentRunId
      if (delegator && delegator !== this.hostRunId && !this.agents.has(delegator)) {
        throw new Error(`Delegated execution at '${identity.address}' has an unknown delegator.`)
      }
    }
  }

  requireAgent(agentRunId: string): AgentRootChildAgent {
    const agent = this.agents.get(agentRunId)
    if (!agent) throw new Error(`AgentRun '${agentRunId}' is not a child of this run.`)
    return agent
  }

  isParticipant(agentRunId: string): boolean {
    return agentRunId === this.hostRunId || this.agents.has(agentRunId)
  }

  addressOf(agentRunId: string): AgentTeamAddress | null {
    return agentRunId === this.hostRunId ? this.hostAddress : this.agents.get(agentRunId)?.address ?? null
  }

  /** The coordinator AgentRun of a task Team (the row a task Team opens). */
  coordinatorOf(teamRunId: string): AgentRootChildAgent {
    const team = this.teams.get(teamRunId)
    if (!team) throw new Error(`TeamRun '${teamRunId}' is not a child of this run.`)
    const members = [...this.agents.values()].filter((agent) => agent.teamRunId === teamRunId)
    const coordinator = members.find((agent) => agent.address === team.coordinatorAddress) ?? members[0]
    if (!coordinator) throw new Error(`Task Team '${teamRunId}' has no member.`)
    return coordinator
  }

  private register(runId: string): void {
    if (runId === this.hostRunId || this.agents.has(runId) || this.teams.has(runId)) {
      throw new Error(`Duplicate AgentRun collaboration execution '${runId}'.`)
    }
  }

  private addAgent(agentRunId: string, address: string, kind: AgentRootChildAgent['kind'],
    teamRunId: string | null, delegatorAgentRunId: string | null): void {
    this.register(agentRunId)
    const source = collaboratorAgentSourceAt(this.tree.collaborators, address)
    if (!source) throw new Error(`No collaborator source at '${address}'.`)
    this.agents.set(agentRunId, Object.freeze({
      agentRunId, address: parseAgentTeamAddress(address), kind, source, teamRunId, delegatorAgentRunId,
    }))
  }

  private addTeam(team: AgentRootChildTeam['execution'], delegatorAgentRunId: string | null): void {
    this.register(team.teamRunId)
    const source = collaboratorTeamSourceAt(this.tree.collaborators, team.address)
    // A nested Team inside a task Team takes its coordinator from its first member.
    const coordinatorAddress = source?.coordinatorAddress
      ?? team.members.find((member) => 'agentRunId' in member)?.address
      ?? team.address
    this.teams.set(team.teamRunId, Object.freeze({
      teamRunId: team.teamRunId, address: parseAgentTeamAddress(team.address), coordinatorAddress, delegatorAgentRunId, execution: team,
    }))
    for (const member of team.members) {
      if ('agentRunId' in member) this.addAgent(member.agentRunId, member.address, 'task_team_member', team.teamRunId, null)
      else this.addTeam(member, null)
    }
    team.taskExecutions.forEach((task) => this.addTask(task, team.teamRunId))
  }

  private addTask(task: TaskExecution, _hostTeamRunId: string | null): void {
    const delegator = task.delegatorAgentRunId ?? null
    if ('agentRunId' in task) this.addAgent(task.agentRunId, task.address, 'task_agent', null, delegator)
    else this.addTeam(task, delegator)
  }
}
