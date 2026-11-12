import type { AgentRunCollaborationViewDto } from '@autobyteus/collaboration-stream-contracts'
import type { RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import {
  collaborationTaskExecutionLists,
  copyAgentSourceOf,
  type CollaborationAgentSource,
} from '~/services/collaborators/agentSourceSelectors'

type Tree = AgentRunCollaborationViewDto['execution_tree']
type TaskExecution = Tree['taskExecutions'][number]
type TaskTeam = Extract<TaskExecution, { teamRunId: string }>
type TaskTeamMember = TaskTeam['members'][number]

type ChildAgentCore = Readonly<{ agentRunId: string; address: AgentTeamAddress; source: CollaborationAgentSource }>
/**
 * One child AgentRun of a standalone run's collaboration root (the host is not a child): an agent run delegated
 * directly (`task_agent`, with the AgentRun that started it, if recorded), or a member of a delegated task Team
 * (`task_team_member`, always with its Team run; its Team row names who started it).
 */
export type AgentRootChildAgent =
  | (ChildAgentCore & Readonly<{ kind: 'task_agent'; teamRunId: null; delegatorAgentRunId: string | null }>)
  | (ChildAgentCore & Readonly<{ kind: 'task_team_member'; teamRunId: string; delegatorAgentRunId: null }>)

/**
 * An agent of a run this root delegated to another node (autobyteus-278): the Agent run, or a member of the Team
 * run, at its address under this root. Its node keeps its source; this node knows only the link.
 */
export type AgentRootRemoteAgent = Readonly<{
  agentRunId: string
  address: AgentTeamAddress
  kind: 'remote_agent' | 'remote_team_member'
  execution: RemoteTaskExecutionDto
  /** The remote Team run of a member; null for a remote Agent. */
  teamRunId: string | null
  /** The AgentRun that started the remote run; null for Team members (their Team row has it). */
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
 * Children of an Agent root, indexed by run ID: its delegated copies (converted collaborators
 * included). Every source is a copy's recorded catalog source; the host is not indexed.
 */
export class AgentRunCollaborationIndex {
  readonly agents = new Map<string, AgentRootChildAgent>()
  readonly teams = new Map<string, AgentRootChildTeam>()
  /** autobyteus-278: the agents of the runs this root delegated to other nodes. */
  readonly remoteAgents = new Map<string, AgentRootRemoteAgent>()
  readonly hostRunId: string
  readonly hostAddress: AgentTeamAddress

  constructor(readonly tree: Tree, readonly remoteExecutions: readonly RemoteTaskExecutionDto[] = []) {
    this.hostRunId = tree.host.agentRunId
    this.hostAddress = parseAgentTeamAddress(tree.host.address)
    tree.taskExecutions.forEach((task) => this.addTask(task, null))
    remoteExecutions.forEach((execution) => this.addRemote(execution))
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
    return agentRunId === this.hostRunId ? this.hostAddress
      : this.agents.get(agentRunId)?.address ?? this.remoteAgents.get(agentRunId)?.address ?? null
  }

  /** A child's address, local or remote (the root stream presents both). */
  childAddressOf(agentRunId: string): AgentTeamAddress | null {
    return this.agents.get(agentRunId)?.address ?? this.remoteAgents.get(agentRunId)?.address ?? null
  }

  /** The coordinator AgentRun of a task Team (the row a task Team opens). */
  coordinatorOf(teamRunId: string): AgentRootChildAgent {
    const team = this.teams.get(teamRunId)
    if (!team) throw new Error(`TeamRun '${teamRunId}' is not a child of this run.`)
    const members = [...this.agents.values()].filter((agent) => agent.teamRunId === teamRunId)
    const coordinator = members.find((agent) => agent.address === team.coordinatorAddress)
    if (!coordinator) throw new Error(`Team run '${teamRunId}' has no member at its coordinator address '${team.coordinatorAddress}'.`)
    return coordinator
  }

  /** The coordinator AgentRun a Team row opens: a local task Team's, or a remote Team's (autobyteus-278). */
  coordinatorRunIdOf(teamRunId: string): string {
    const remote = this.remoteExecutions.find((execution) => execution.kind === 'agent_team' && execution.team_run_id === teamRunId)
    if (remote?.kind !== 'agent_team') return this.coordinatorOf(teamRunId).agentRunId
    const coordinator = remote.members.find((member) => member.address === remote.coordinator_address)
    if (!coordinator) throw new Error(`Team run '${teamRunId}' has no member at its coordinator address '${remote.coordinator_address}'.`)
    return coordinator.agent_run_id
  }

  private register(runId: string): void {
    if (runId === this.hostRunId || this.agents.has(runId) || this.teams.has(runId)) {
      throw new Error(`Duplicate AgentRun collaboration execution '${runId}'.`)
    }
  }

  private addAgent(agentRunId: string, address: string,
    placement: Readonly<{ kind: 'task_agent'; teamRunId: null; delegatorAgentRunId: string | null }>
      | Readonly<{ kind: 'task_team_member'; teamRunId: string; delegatorAgentRunId: null }>): void {
    this.register(agentRunId)
    // A copy (or its member) carries its own source; what it runs with is its user choice, else its Team's
    // when it follows, else the started source (DS-003).
    const source = copyAgentSourceOf(collaborationTaskExecutionLists(this.tree), agentRunId)
    if (!source) throw new Error(`No recorded source for AgentRun '${agentRunId}' at '${address}'.`)
    this.agents.set(agentRunId, Object.freeze({ agentRunId, address: parseAgentTeamAddress(address), source, ...placement }))
  }

  private addTeam(team: AgentRootChildTeam['execution'], delegatorAgentRunId: string | null): void {
    this.register(team.teamRunId)
    this.teams.set(team.teamRunId, Object.freeze({
      teamRunId: team.teamRunId, address: parseAgentTeamAddress(team.address), coordinatorAddress: team.source.coordinatorAddress,
      delegatorAgentRunId, execution: team,
    }))
    for (const member of team.members) {
      this.addAgent(member.agentRunId, member.address, { kind: 'task_team_member', teamRunId: team.teamRunId, delegatorAgentRunId: null })
    }
    team.taskExecutions.forEach((task) => this.addTask(task, team.teamRunId))
  }

  private addRemote(execution: RemoteTaskExecutionDto): void {
    const delegator = execution.delegator_agent_run_id
    if (execution.kind === 'agent') {
      this.register(execution.agent_run_id)
      this.remoteAgents.set(execution.agent_run_id, Object.freeze({ agentRunId: execution.agent_run_id,
        address: parseAgentTeamAddress(execution.address), kind: 'remote_agent', execution, teamRunId: null, delegatorAgentRunId: delegator }))
      return
    }
    this.register(execution.team_run_id)
    for (const member of execution.members) {
      this.register(member.agent_run_id)
      this.remoteAgents.set(member.agent_run_id, Object.freeze({ agentRunId: member.agent_run_id,
        address: parseAgentTeamAddress(member.address), kind: 'remote_team_member', execution, teamRunId: execution.team_run_id, delegatorAgentRunId: null }))
    }
  }

  private addTask(task: TaskExecution, _hostTeamRunId: string | null): void {
    const delegator = task.delegatorAgentRunId ?? null
    if ('agentRunId' in task) this.addAgent(task.agentRunId, task.address, { kind: 'task_agent', teamRunId: null, delegatorAgentRunId: delegator })
    else this.addTeam(task, delegator)
  }
}
