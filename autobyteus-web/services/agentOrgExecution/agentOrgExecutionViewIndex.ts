import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'

type Root = AgentOrgExecutionViewDto['execution_tree']['rootOrg']
export type OrgConfiguredMember = Root['members'][number]
export type OrgConfiguredAgent = Extract<OrgConfiguredMember, { agentRunId: string }>
export type OrgConfiguredTeam = Extract<OrgConfiguredMember, { teamRunId: string }>
/** An Org's mounted Team; Teams are flat, so its members are Agents. */
export type OrgTeamNode = OrgConfiguredTeam
export type OrgAgentNode = OrgConfiguredAgent | OrgConfiguredTeam['members'][number]
export type OrgWorkspaceSelection =
  | Readonly<{ kind: 'agent_execution'; agentRunId: string }>
  | Readonly<{ kind: 'configured_team'; teamRunId: string }>
export type OrgExecutionHost = Readonly<{ kind: 'root' | 'team'; runId: string }>
export type OrgAgentViewIdentity = Readonly<{
  agentRunId: string
  address: AgentTeamAddress
  /** Its own configuration in the Org (its source). */
  source: OrgAgentNode
  execution: OrgAgentNode
  host: OrgExecutionHost
}>
export type OrgTeamViewIdentity = Readonly<{
  teamRunId: string
  address: AgentTeamAddress
  source: OrgConfiguredTeam
  execution: OrgTeamNode
}>

/**
 * One Org view's own parts (autobyteus-461 SR-084): its agents and its mounted teams with their members. The runs it
 * delegated are its tree's rows (`runTreeStore`), never in its view. Addresses identify configured members only.
 */
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
      if ('agentRunId' in member) this.addAgent(member, rootHost)
      else this.addTeam(member)
    }
  }

  /** The address of one of the Org's own agents. */
  addressOf(agentRunId: string): AgentTeamAddress | null {
    return this.agents.get(agentRunId)?.address ?? null
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
    return this.teams.has(selection.teamRunId) ? this.coordinator(selection.teamRunId) : null
  }
  teamMembers(teamRunId: string): readonly OrgAgentViewIdentity[] {
    return this.requireTeam(teamRunId).execution.members.map((member) => this.requireAgent(member.agentRunId))
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
  private addAgent(execution: OrgAgentNode, host: OrgExecutionHost): void {
    this.register(execution.agentRunId)
    this.agentsById.set(execution.agentRunId, Object.freeze({ agentRunId: execution.agentRunId,
      address: parseAgentTeamAddress(execution.address), source: execution, execution, host }))
  }
  private addTeam(execution: OrgConfiguredTeam): void {
    this.register(execution.teamRunId)
    this.teamsById.set(execution.teamRunId, Object.freeze({ teamRunId: execution.teamRunId,
      address: parseAgentTeamAddress(execution.address), source: execution, execution }))
    const host: OrgExecutionHost = { kind: 'team', runId: execution.teamRunId }
    execution.members.forEach((member) => this.addAgent(member, host))
    this.coordinator(execution.teamRunId)
  }
}
