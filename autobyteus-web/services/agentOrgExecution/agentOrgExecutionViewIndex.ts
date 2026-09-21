import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'

type Root = AgentOrgExecutionViewDto['execution_tree']['rootOrg']
export type OrgConfiguredMember = Root['members'][number]
export type OrgConfiguredAgent = Extract<OrgConfiguredMember, { agentRunId: string }>
export type OrgConfiguredTeam = Extract<OrgConfiguredMember, { teamRunId: string }>
export type OrgTaskExecution = Root['taskExecutions'][number]
type TaskTeam = Extract<OrgTaskExecution, { teamRunId: string }>
type TaskMember = TaskTeam['members'][number]
export type OrgTeamNode = OrgConfiguredTeam | TaskTeam | Extract<TaskMember, { teamRunId: string }>
export type OrgAgentNode = OrgConfiguredAgent | Extract<OrgTaskExecution | TaskMember, { agentRunId: string }>
export type OrgTaskRecord = AgentOrgExecutionViewDto['task_records']['records'][number]
export type OrgWorkspaceSelection =
  | Readonly<{ kind: 'agent_execution'; agentRunId: string }>
  | Readonly<{ kind: 'configured_team'; teamRunId: string }>
export type OrgExecutionHost = Readonly<{ kind: 'root' | 'team'; runId: string }>
export type OrgTaskBinding = Readonly<{ taskId: string; executionRunId: string }>
export type OrgAgentViewIdentity = Readonly<{
  agentRunId: string
  address: AgentTeamAddress
  kind: 'configured' | 'task' | 'task_team_member'
  source: OrgConfiguredAgent
  execution: OrgAgentNode
  host: OrgExecutionHost
  task: OrgTaskBinding | null
  live: boolean
}>
export type OrgTeamViewIdentity = Readonly<{
  teamRunId: string
  address: AgentTeamAddress
  source: OrgConfiguredTeam
  execution: OrgTeamNode
  task: OrgTaskBinding | null
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
  private readonly assignmentsById = new Map<string, OrgTaskRecord>()
  get assignments(): ReadonlyMap<string, OrgTaskRecord> { return this.assignmentsById }
  private readonly allRunIds = new Set<string>()

  constructor(readonly view: AgentOrgExecutionViewDto) {
    const root = view.execution_tree.rootOrg
    if (root.orgRunId !== view.task_records.orgRunId || root.orgRunId !== view.communication_messages.orgRunId) {
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
    for (const record of view.task_records.records) {
      const runId = 'agentRunId' in record.taskExecution ? record.taskExecution.agentRunId : record.taskExecution.teamRunId
      if (this.assignments.has(runId)) throw new Error(`Duplicate task execution '${runId}'.`)
      this.assignmentsById.set(runId, record)
    }
    const rootHost: OrgExecutionHost = { kind: 'root', runId: root.orgRunId }
    for (const member of root.members) {
      if ('agentRunId' in member) this.addAgent(member, rootHost, null, true, 'configured')
      else this.addTeam(member, null, true)
    }
    root.taskExecutions.forEach((task) => this.addTask(task, rootHost, true))
    for (const [runId, task] of this.assignments) {
      const execution = 'agentRunId' in task.taskExecution ? this.agents.get(runId) : this.teams.get(runId)
      if (!execution || execution.task?.taskId !== task.taskId || execution.address !== task.recipientAddress
        || !this.agents.has(task.delegatorAgentRunId)) throw new Error(`Task '${task.taskId}' retained identity mismatch.`)
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
    return team && !team.task ? this.coordinator(team.teamRunId) : null
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
  taskParticipants(task: OrgTaskRecord): readonly OrgAgentViewIdentity[] {
    return 'agentRunId' in task.taskExecution
      ? [this.requireAgent(task.taskExecution.agentRunId)]
      : this.teamMembers(task.taskExecution.teamRunId)
  }
  isRelevant(task: OrgTaskRecord, agentRunId: string): boolean {
    return task.delegatorAgentRunId === agentRunId
      || this.taskParticipants(task).some((agent) => agent.agentRunId === agentRunId)
  }
  private register(runId: string): void {
    if (this.allRunIds.has(runId)) throw new Error(`Duplicate Org execution '${runId}'.`)
    this.allRunIds.add(runId)
  }
  private addAgent(execution: OrgAgentNode, host: OrgExecutionHost, task: OrgTaskBinding | null,
    ancestorLive: boolean, kind: OrgAgentViewIdentity['kind']): void {
    this.register(execution.agentRunId)
    const source = this.configured.get(execution.address)
    if (!source || !('agentRunId' in source)) throw new Error(`No captured Agent source at '${execution.address}'.`)
    this.agentsById.set(execution.agentRunId, Object.freeze({ agentRunId: execution.agentRunId,
      address: parseAgentTeamAddress(execution.address), source, execution, host, task, kind,
      live: ancestorLive && (!('settledAt' in execution) || execution.settledAt === null) }))
  }
  private addTeam(execution: OrgTeamNode, task: OrgTaskBinding | null, ancestorLive: boolean): void {
    this.register(execution.teamRunId)
    const source = this.configured.get(execution.address)
    if (!source || !('teamRunId' in source)) throw new Error(`No captured Team source at '${execution.address}'.`)
    const live = ancestorLive && (!('settledAt' in execution) || execution.settledAt === null)
    this.teamsById.set(execution.teamRunId, Object.freeze({ teamRunId: execution.teamRunId,
      address: parseAgentTeamAddress(execution.address), source, execution, task, live }))
    const host: OrgExecutionHost = { kind: 'team', runId: execution.teamRunId }
    execution.members.forEach((member) => {
      if ('agentRunId' in member) this.addAgent(member, host, task, live, task ? 'task_team_member' : 'configured')
      else this.addTeam(member, task, live)
    })
    this.coordinator(execution.teamRunId)
    execution.taskExecutions.forEach((child) => this.addTask(child, host, live))
  }
  private addTask(execution: OrgTaskExecution, host: OrgExecutionHost, live: boolean): void {
    const runId = 'agentRunId' in execution ? execution.agentRunId : execution.teamRunId
    const record = this.assignments.get(runId)
    if (!record || record.recipientAddress !== execution.address) throw new Error(`Task execution '${runId}' has no exact record.`)
    const binding = Object.freeze({ taskId: record.taskId, executionRunId: runId })
    if ('agentRunId' in execution) this.addAgent(execution, host, binding, live, 'task')
    else this.addTeam(execution, binding, live)
  }
}
