import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import {
  collaboratorAgentSourceAt,
  collaboratorTeamSourceAt,
  type CollaborationAgentSource,
  type CollaborationTeamSource,
} from '~/services/collaborators/agentSourceSelectors'

type Root = AgentOrgExecutionViewDto['execution_tree']['rootOrg']
export type OrgConfiguredMember = Root['members'][number]
export type OrgConfiguredAgent = Extract<OrgConfiguredMember, { agentRunId: string }>
export type OrgConfiguredTeam = Extract<OrgConfiguredMember, { teamRunId: string }>
export type OrgTaskExecution = Root['taskExecutions'][number]
type TaskTeam = Extract<OrgTaskExecution, { teamRunId: string }>
type TaskMember = TaskTeam['members'][number]
export type OrgTeamNode = OrgConfiguredTeam | TaskTeam | Extract<TaskMember, { teamRunId: string }>
export type OrgAgentNode = OrgConfiguredAgent | Extract<OrgTaskExecution | TaskMember, { agentRunId: string }>
export type OrgWorkspaceSelection =
  | Readonly<{ kind: 'agent_execution'; agentRunId: string }>
  | Readonly<{ kind: 'configured_team'; teamRunId: string }>
export type OrgExecutionHost = Readonly<{ kind: 'root' | 'team'; runId: string }>
/** A configured member, or the collaborator entry a task execution at its address was started from. */
export type OrgAgentSource = CollaborationAgentSource
export type OrgTeamSource = CollaborationTeamSource
/** Membership in a delegated child: its execution run ID and the AgentRun that started it. */
/** `delegatorAgentRunId` is null for children recorded before the delegator was stored. */
export type OrgDelegationBinding = Readonly<{ executionRunId: string; delegatorAgentRunId: string | null }>
export type OrgAgentViewIdentity = Readonly<{
  agentRunId: string
  address: AgentTeamAddress
  kind: 'configured' | 'task' | 'task_team_member'
  source: OrgAgentSource
  execution: OrgAgentNode
  host: OrgExecutionHost
  delegation: OrgDelegationBinding | null
  live: boolean
}>
export type OrgTeamViewIdentity = Readonly<{
  teamRunId: string
  address: AgentTeamAddress
  source: OrgTeamSource
  execution: OrgTeamNode
  delegation: OrgDelegationBinding | null
  live: boolean
}>

/** One derived retained index per strict context candidate; addresses identify sources only. */
export class AgentOrgExecutionViewIndex {
  private readonly agentsById = new Map<string, OrgAgentViewIdentity>()
  get agents(): ReadonlyMap<string, OrgAgentViewIdentity> { return this.agentsById }
  private readonly teamsById = new Map<string, OrgTeamViewIdentity>()
  get teams(): ReadonlyMap<string, OrgTeamViewIdentity> { return this.teamsById }
  private readonly configuredById = new Map<string, OrgConfiguredMember>()
  get configured(): ReadonlyMap<string, OrgConfiguredMember> { return this.configuredById }
  private readonly allRunIds = new Set<string>()

  constructor(readonly view: AgentOrgExecutionViewDto) {
    const root = view.execution_tree.rootOrg
    if (root.orgRunId !== view.communication_messages.orgRunId) {
      throw new Error('AgentOrg execution view root mismatch.')
    }
    const configured = (member: OrgConfiguredMember) => {
      if (this.configured.has(member.address)) throw new Error(`Duplicate configured address '${member.address}'.`)
      this.configuredById.set(member.address, member)
    }
    for (const member of root.members) {
      configured(member)
      if ('teamRunId' in member) member.members.forEach(configured)
    }
    const rootHost: OrgExecutionHost = { kind: 'root', runId: root.orgRunId }
    for (const member of root.members) {
      if ('agentRunId' in member) this.addAgent(member, rootHost, null, true, 'configured')
      else this.addTeam(member, null, true)
    }
    root.taskExecutions.forEach((task) => this.addTask(task, rootHost, true))
    for (const identity of [...this.agents.values(), ...this.teams.values()]) {
      const delegator = identity.delegation?.delegatorAgentRunId
      if (delegator && !this.agents.has(delegator)) {
        throw new Error(`Delegated execution '${identity.delegation.executionRunId}' delegator is not in this AgentOrg.`)
      }
    }
  }

  requireAgent(runId: string): OrgAgentViewIdentity {
    const agent = this.agents.get(runId)
    if (!agent) throw new Error(`AgentRun '${runId}' is not a retained Org execution.`)
    return agent
  }
  requireTeam(runId: string): OrgTeamViewIdentity {
    const team = this.teams.get(runId)
    if (!team) throw new Error(`TeamRun '${runId}' is not a retained Org execution.`)
    return team
  }
  configuredSelection(address: string): OrgWorkspaceSelection | null {
    const member = this.configured.get(address)
    return !member ? null : 'agentRunId' in member
      ? { kind: 'agent_execution', agentRunId: member.agentRunId }
      : { kind: 'configured_team', teamRunId: member.teamRunId }
  }
  selectedAgent(selection: OrgWorkspaceSelection | null): OrgAgentViewIdentity | null {
    if (!selection) return null
    if (selection.kind === 'agent_execution') return this.agents.get(selection.agentRunId) ?? null
    const team = this.teams.get(selection.teamRunId)
    return team && !team.delegation ? this.coordinator(team.teamRunId) : null
  }
  teamMembers(teamRunId: string): readonly OrgAgentViewIdentity[] {
    const collect = (team: OrgTeamNode): OrgAgentViewIdentity[] => team.members.flatMap((member) =>
      'agentRunId' in member ? [this.requireAgent(member.agentRunId)] : collect(member))
    return collect(this.requireTeam(teamRunId).execution)
  }
  coordinator(teamRunId: string): OrgAgentViewIdentity {
    const team = this.requireTeam(teamRunId)
    const matches = this.teamMembers(teamRunId).filter((agent) => agent.address === team.source.coordinatorAddress)
    if (matches.length !== 1) throw new Error(`Team '${teamRunId}' has no unique exact coordinator.`)
    return matches[0]!
  }
  private register(runId: string): void {
    if (this.allRunIds.has(runId)) throw new Error(`Duplicate Org execution '${runId}'.`)
    this.allRunIds.add(runId)
  }
  private addAgent(execution: OrgAgentNode, host: OrgExecutionHost, delegation: OrgDelegationBinding | null,
    live: boolean, kind: OrgAgentViewIdentity['kind']): void {
    this.register(execution.agentRunId)
    const configured = this.configured.get(execution.address)
    const source = configured
      ? ('agentRunId' in configured ? configured : null)
      : collaboratorAgentSourceAt(this.view.execution_tree.rootOrg.collaborators ?? [], execution.address)
    if (!source) throw new Error(`No captured Agent source at '${execution.address}'.`)
    this.agentsById.set(execution.agentRunId, Object.freeze({ agentRunId: execution.agentRunId,
      address: parseAgentTeamAddress(execution.address), source, execution, host, delegation, kind, live }))
  }
  private addTeam(execution: OrgTeamNode, delegation: OrgDelegationBinding | null, live: boolean): void {
    this.register(execution.teamRunId)
    const configured = this.configured.get(execution.address)
    const source = configured
      ? ('teamRunId' in configured ? configured : null)
      : collaboratorTeamSourceAt(this.view.execution_tree.rootOrg.collaborators ?? [], execution.address)
    if (!source) throw new Error(`No captured Team source at '${execution.address}'.`)
    this.teamsById.set(execution.teamRunId, Object.freeze({ teamRunId: execution.teamRunId,
      address: parseAgentTeamAddress(execution.address), source, execution, delegation, live }))
    const host: OrgExecutionHost = { kind: 'team', runId: execution.teamRunId }
    execution.members.forEach((member) => {
      if ('agentRunId' in member) this.addAgent(member, host, delegation, live, delegation ? 'task_team_member' : 'configured')
      else this.addTeam(member, delegation, live)
    })
    this.coordinator(execution.teamRunId)
    execution.taskExecutions.forEach((child) => this.addTask(child, host, live))
  }
  private addTask(execution: OrgTaskExecution, host: OrgExecutionHost, live: boolean): void {
    const runId = 'agentRunId' in execution ? execution.agentRunId : execution.teamRunId
    const binding = Object.freeze({ executionRunId: runId, delegatorAgentRunId: execution.delegatorAgentRunId ?? null })
    if ('agentRunId' in execution) this.addAgent(execution, host, binding, live, 'task')
    else this.addTeam(execution, binding, live)
  }
}
