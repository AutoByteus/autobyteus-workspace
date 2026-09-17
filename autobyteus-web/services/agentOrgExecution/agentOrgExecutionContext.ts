import type { AgentOrgMemberModelConfigCanonical } from '~/services/runConfigEditing/agentOrgMemberModelConfigClient'
import { cloneExistingRunJsonValue } from '~/services/runConfigEditing/existingAgentModelConfigDraft'
import { reactive, shallowReactive } from 'vue'
import type {
  AgentOrgExecutionEventDto,
  AgentOrgExecutionViewDto,
} from '@autobyteus/collaboration-stream-contracts'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { parseAgentTeamAddress, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type {
  ActiveAgentWorkspaceTarget,
  TeamWorkspaceContextView,
} from '~/types/workspace/activeAgentWorkspaceTarget'
import type { CollaborationMessagesContextView } from '~/types/workspace/collaborationMessagesContextView'
import { toAgentPresentationProjectionMessage } from '~/services/agentStreaming/teamStreamDtoAdapters'
import { dispatchAgentStreamMessage } from '~/services/agentStreaming/agentStreamMessageProjector'
import { applyOfflineOrTerminalCleanup } from '~/services/runStatus/agentRuntimeStatusState'
import { projectAgentOrgTasks } from './agentOrgTaskPresentation'
import type { CollaborationTasksContextView } from '~/types/workspace/collaborationTasksContextView'
import { AgentOrgExecutionViewIndex, type OrgWorkspaceSelection, type OrgAgentViewIdentity, type OrgTeamViewIdentity } from './agentOrgExecutionViewIndex'
import { projectSettledAgentOrgTask } from './agentOrgTaskSettlementProjection'
import {
  assertAgentOrgCommunicationMessagesCorrelated,
  projectAgentOrgCommunicationPerspective,
  projectAgentOrgMessageIdentity,
} from './agentOrgCommunicationPerspective'

export type AgentOrgSyncPhase = 'hydrating' | 'live' | 'historical' | 'reopen_required' | 'closed'
export type AgentOrgEventApplication = 'applied' | 'checkpoint_required'

export type AgentOrgContextEntry = Readonly<{
  agentRunId: string
  memberAddress: AgentTeamAddress
  context: AgentContext
}>

type TaskRecord = AgentOrgExecutionViewDto['task_records']['records'][number]
type TaskEvent = Extract<AgentOrgExecutionEventDto, { kind: 'task' }>['event']

const nameAt = (address: string): string => address.split('/').filter(Boolean).at(-1)?.replace(/[_-]+/g, ' ') || address

export class AgentOrgExecutionContext {
  readonly orgRunId: string
  view: AgentOrgExecutionViewDto
  phase: AgentOrgSyncPhase = 'hydrating'
  error: string | null = null
  selection: OrgWorkspaceSelection | null = null
  index: AgentOrgExecutionViewIndex
  private readonly contexts = shallowReactive(new Map<string, AgentContext>())
  private nextChangeSequence: number

  constructor(input: Readonly<{
    orgRunId: string
    view: AgentOrgExecutionViewDto
    entries: readonly AgentOrgContextEntry[]
  }>) {
    this.orgRunId = input.orgRunId
    this.view = structuredClone(input.view)
    this.index = new AgentOrgExecutionViewIndex(this.view)
    this.nextChangeSequence = input.view.base_change_sequence + 1
    for (const entry of input.entries) {
      if (entry.agentRunId !== entry.context.state.runId || this.contexts.has(entry.agentRunId)) {
        throw new Error(`Invalid or duplicate AgentOrg context '${entry.agentRunId}'.`)
      }
      entry.context.state = reactive(entry.context.state)
      const context = reactive(entry.context)
      this.contexts.set(entry.agentRunId, context)
      if (this.index.requireAgent(entry.agentRunId).address !== entry.memberAddress) throw new Error('AgentOrg context address mismatch.')
    }
    if (this.contexts.size !== this.index.agents.size) throw new Error('AgentOrg context scope is incomplete.')
    assertAgentOrgCommunicationMessagesCorrelated(this.index, this.view.communication_messages.messages)
    for (const status of input.view.agent_statuses) {
      const address = this.index.agents.get(status.agent_run_id)?.address
      if (address !== status.member_address) {
        throw new Error(`AgentOrg status '${status.agent_run_id}' has no exact context identity.`)
      }
      this.contexts.get(status.agent_run_id)!.state.currentStatus = status.status as AgentStatus
    }
    this.phase = input.view.is_active ? 'live' : 'historical'
  }

  get executionTree() { return this.view.execution_tree }
  get isActive(): boolean { return this.view.is_active }
  get changeSequence(): number { return this.nextChangeSequence - 1 }
  get selectedAddress(): AgentTeamAddress | null {
    return this.selection?.kind === 'configured_team'
      ? this.index.teams.get(this.selection.teamRunId)?.address ?? null
      : this.index.selectedAgent(this.selection)?.address ?? null
  }

  listAgentContextEntries(): readonly AgentOrgContextEntry[] {
    return Object.freeze([...this.contexts].map(([agentRunId, context]) => Object.freeze({
      agentRunId,
      memberAddress: this.index.requireAgent(agentRunId).address,
      context,
    })))
  }

  getAgentContext(agentRunId: string): AgentContext | null {
    return this.contexts.get(agentRunId) ?? null
  }

  select(selection: OrgWorkspaceSelection | string | null): void {
    const candidate = typeof selection === 'string' ? this.index.configuredSelection(selection) : selection
    this.selection = this.index.selectedAgent(candidate) ? candidate : null
  }

  selectedTarget(): ActiveAgentWorkspaceTarget | null {
    if (!['live', 'historical', 'reopen_required'].includes(this.phase)) return null
    const agent = this.index.selectedAgent(this.selection)
    if (!agent) return null
    const context = this.contexts.get(agent.agentRunId)!
    const access = { access: 'read_only' as const }
    const common = {
      ...access, root: Object.freeze({ orgRunId: this.orgRunId }), address: agent.address, context,
      collaborationMessages: this.messagesView(agent.address, agent.agentRunId),
      collaborationTasks: this.tasksView(agent.agentRunId),
      browse: Object.freeze({ kind: 'agentOrgMember' as const, orgRunId: this.orgRunId,
        memberAddress: agent.address, agentRunId: agent.agentRunId }),
    }
    const task = agent.task ? this.taskPresentation(agent.task.executionRunId) : null
    if (agent.kind === 'task') return Object.freeze({ ...common, kind: 'agent_org_task_agent', task: task! })
    if (agent.host.kind === 'team') return Object.freeze({
      ...common, team: this.teamView(this.index.requireTeam(agent.host.runId), agent, context),
      ...(task ? { kind: 'agent_org_task_team_member' as const, task }
        : { kind: 'agent_org_team_member' as const }),
    })
    return Object.freeze({ ...common, kind: 'agent_org_direct_agent' })
  }

  adoptLocalContexts(previous: AgentOrgExecutionContext): void {
    if (previous.orgRunId !== this.orgRunId) throw new Error('AgentOrg candidate root mismatch.')
    const matches = this.listAgentContextEntries().flatMap((entry) => {
      const old = previous.getAgentContext(entry.agentRunId)
      if (!old) return []
      if (previous.index.requireAgent(entry.agentRunId).address !== entry.memberAddress) {
        throw new Error('AgentOrg candidate retained address mismatch.')
      }
      return [{ entry, old }]
    })
    // All candidate projections and exact correlations have passed before mutation.
    for (const { entry, old } of matches) {
      old.config = entry.context.config
      old.state = entry.context.state
      this.contexts.set(entry.agentRunId, old)
    }
    this.select(previous.selection)
  }

  applyMemberModelConfig(canonical: AgentOrgMemberModelConfigCanonical): boolean {
    if (this.phase !== 'historical' || this.isActive || canonical.isActive || canonical.orgRunId !== this.orgRunId) return false
    const agent = this.index.agents.get(canonical.agentRunId)
    const context = this.getAgentContext(canonical.agentRunId)
    if (!agent || agent.task || agent.kind !== 'configured' || agent.address !== canonical.memberAddress || !context) return false
    const previous = agent.source.launchConfiguration
    const next = canonical.launchConfiguration
    // A configuration return may change only model fields, never execution policy/identity.
    if (previous.runtimeKind !== next.runtimeKind || previous.workspaceRootPath !== next.workspaceRootPath
      || previous.autoExecuteTools !== next.autoExecuteTools || previous.skillAccessMode !== next.skillAccessMode) throw new Error('Org configuration changed locked fields.')
    const tree = this.view.execution_tree
    const patch = (node: typeof agent.source) => node.agentRunId === canonical.agentRunId
      ? { ...node, launchConfiguration: cloneExistingRunJsonValue(next) } : node
    const view = { ...this.view, execution_tree: { ...tree, rootOrg: { ...tree.rootOrg,
      members: tree.rootOrg.members.map(member => 'agentRunId' in member ? patch(member)
        : { ...member, members: member.members.map(patch) }) } } }
    const index = new AgentOrgExecutionViewIndex(view)
    const config = { ...context.config, llmModelIdentifier: next.llmModelIdentifier, llmConfig: cloneExistingRunJsonValue(next.llmConfig) }
    // All validation/clone/index work precedes synchronous model-only publication.
    this.view = view
    this.index = index
    context.config = config
    context.conversation.llmModelIdentifier = next.llmModelIdentifier
    return true
  }

  applyEvent(changeSequence: number, event: AgentOrgExecutionEventDto): AgentOrgEventApplication {
    if (this.phase !== 'live') throw new Error('AgentOrg context is not accepting stream events.')
    if (changeSequence !== this.nextChangeSequence) {
      this.requireReopen(`Expected change sequence ${this.nextChangeSequence}, received ${changeSequence}.`)
      throw new Error(this.error!)
    }
    if (event.kind === 'agent_presentation') {
      const address = this.index.agents.get(event.agent_run_id)?.address
      const context = this.contexts.get(event.agent_run_id)
      if (!context || address !== event.member_address) {
        this.requireReopen(`Agent presentation identity '${event.agent_run_id}' is not in the context.`)
        throw new Error(this.error!)
      }
      dispatchAgentStreamMessage(
        toAgentPresentationProjectionMessage(event.message, event.agent_run_id),
        {
          kind: 'agent_org_member', context, orgRunId: this.orgRunId,
          agentRunId: event.agent_run_id, memberAddress: address,
        },
      )
    } else if (event.kind === 'task') {
      if (this.validateTaskEvent(event.event) === 'checkpoint_required') {
        return 'checkpoint_required'
      }
      const settlement = event.event.kind === 'settled'
        ? this.projectTaskSettlement(event.event.task, event.event.settledAt)
        : null
      if (settlement) this.commitView(settlement.view)
      else {
        const records = [...this.view.task_records.records]
        const index = records.findIndex((record) => record.taskId === event.event.task.taskId)
        if (index >= 0) records[index] = event.event.task
        else records.push(event.event.task)
        this.commitView({ ...this.view, task_records: { ...this.view.task_records, records } })
      }
    } else {
      try {
        assertAgentOrgCommunicationMessagesCorrelated(this.index, [event.message])
      } catch {
        this.correlationFailure(`AgentOrg communication message '${event.message.messageId}' identity mismatch.`)
      }
      this.view = {
        ...this.view,
        communication_messages: {
          ...this.view.communication_messages,
          messages: [...this.view.communication_messages.messages, event.message],
        },
      }
    }
    this.nextChangeSequence += 1
    return 'applied'
  }

  setActive(active: boolean): void {
    this.view = { ...this.view, is_active: active }
    if (!active) {
      this.commitView({ ...this.view, agent_statuses: this.view.agent_statuses.map((status) => ({ ...status, status: 'offline' })) })
      this.contexts.forEach((context) => applyOfflineOrTerminalCleanup(context))
      this.phase = 'historical'
    }
  }

  requireReopen(message: string): void {
    this.error = message
    this.phase = 'reopen_required'
  }

  private commitView(view: AgentOrgExecutionViewDto): void {
    const index = new AgentOrgExecutionViewIndex(view)
    this.view = view
    this.index = index
  }

  private validateTaskEvent(event: TaskEvent): AgentOrgEventApplication {
    const task = event.task
    if (!this.index.agents.has(task.delegatorAgentRunId)) {
      this.correlationFailure(`AgentOrg task '${task.taskId}' delegator identity mismatch.`)
    }
    const existing = this.view.task_records.records.find((record) => record.taskId === task.taskId)
    if (event.kind === 'activated') {
      if (existing) this.correlationFailure(`AgentOrg task '${task.taskId}' activation is duplicated.`)
      this.validateFreshTaskExecution(task)
      return 'checkpoint_required'
    }
    if (!existing || !this.sameTaskIdentity(existing, task)
      || !this.taskExecutionMatchesConfiguredRecipient(task)) {
      this.correlationFailure(`AgentOrg task '${task.taskId}' lifecycle identity mismatch.`)
    }
    return 'applied'
  }

  private taskExecutionMatchesConfiguredRecipient(task: TaskRecord): boolean {
    const runId = 'agentRunId' in task.taskExecution ? task.taskExecution.agentRunId : task.taskExecution.teamRunId
    const indexed = this.index.assignments.get(runId)
    return Boolean(indexed && indexed.taskId === task.taskId && this.sameTaskIdentity(indexed, task))
  }

  private validateFreshTaskExecution(task: TaskRecord): void {
    const recipient = parseAgentTeamAddress(task.recipientAddress)
    const expectedKind = 'agentRunId' in task.taskExecution ? 'agent' : 'team'
    const runId = 'agentRunId' in task.taskExecution
      ? task.taskExecution.agentRunId
      : task.taskExecution.teamRunId
    const source = this.index.configured.get(recipient)
    if (!source || ('agentRunId' in source ? 'agent' : 'team') !== expectedKind
      || this.index.agents.has(runId)
      || this.index.teams.has(runId)) {
      this.correlationFailure(`AgentOrg task '${task.taskId}' execution identity mismatch.`)
    }
  }

  private sameTaskIdentity(left: TaskRecord, right: TaskRecord): boolean {
    if (left.delegatorAgentRunId !== right.delegatorAgentRunId
      || left.recipientAddress !== right.recipientAddress) return false
    return 'agentRunId' in left.taskExecution
      ? 'agentRunId' in right.taskExecution
        && left.taskExecution.agentRunId === right.taskExecution.agentRunId
      : 'teamRunId' in right.taskExecution
        && left.taskExecution.teamRunId === right.taskExecution.teamRunId
  }

  private projectTaskSettlement(task: TaskRecord, settledAt: string) {
    let settlement: ReturnType<typeof projectSettledAgentOrgTask>
    try {
      settlement = projectSettledAgentOrgTask({
        view: this.view,
        task,
        settledAt,
      })
    } catch {
      this.correlationFailure(`AgentOrg task '${task.taskId}' settlement projection mismatch.`)
    }
    const contexts = settlement.terminalAgentRunIds.map((agentRunId) => this.contexts.get(agentRunId))
    if (contexts.some((context) => !context)) {
      this.correlationFailure(`AgentOrg task '${task.taskId}' settlement context mismatch.`)
    }
    contexts.forEach((context) => applyOfflineOrTerminalCleanup(context!))
    return settlement
  }

  private correlationFailure(message: string): never {
    this.requireReopen(message)
    throw new Error(this.error!)
  }

  private taskPresentation(executionRunId: string) {
    const task = this.index.assignments.get(executionRunId)!
    return Object.freeze({ taskId: task.taskId, description: task.description,
      displayStatus: task.status === 'active'
        ? (task.updates.at(-1) && 'decision' in task.updates.at(-1)!
          && (task.updates.at(-1) as { decision: string }).decision === 'request_revision'
            ? 'revision_requested' as const : 'in_progress' as const)
        : task.status })
  }

  private teamView(team: OrgTeamViewIdentity, agent: OrgAgentViewIdentity, context: AgentContext): TeamWorkspaceContextView {
    const members = this.index.teamMembers(team.teamRunId).map((member) => Object.freeze({
      address: member.address, agentRunId: member.agentRunId, context: this.contexts.get(member.agentRunId)!,
      coordinator: member.agentRunId === this.index.coordinator(team.teamRunId).agentRunId,
    }))
    return Object.freeze({
      rootKind: 'agent_org', rootRunId: this.orgRunId,
      teamRunId: team.teamRunId, teamAddress: team.address,
      teamDefinitionName: nameAt(team.address), coordinatorAddress: team.source.coordinatorAddress,
      focusedMemberAddress: agent.address, focusedAgentRunId: agent.agentRunId, focusedAgentContext: context,
      focusedTaskPresentation: () => agent.task ? this.taskPresentation(agent.task.executionRunId) : null,
      isFocusedProjectionAuthoritative: () => true,
      listMembers: () => Object.freeze(members),
    })
  }

  private tasksView(focusedAgentRunId: string): CollaborationTasksContextView {
    return Object.freeze({ rootKind: 'agent_org', rootRunId: this.orgRunId, focusedAgentRunId,
      listDelegatedTaskEntries: () => projectAgentOrgTasks({ orgRunId: this.orgRunId,
        view: this.view, index: this.index, focusedAgentRunId }),
      taskReferenceContentPath: (taskId: string, referenceId: string) =>
        `agent-org-runs/${encodeURIComponent(this.orgRunId)}/task-delegations/${encodeURIComponent(taskId)}/references/${encodeURIComponent(referenceId)}/content`,
    })
  }

  private messagesView(focusedMemberAddress: AgentTeamAddress, focusedAgentRunId: string): CollaborationMessagesContextView {
    return Object.freeze({
      rootKind: 'agent_org', rootRunId: this.orgRunId, focusedAgentRunId, focusedMemberAddress,
      memberIdentityByAgentRunId: () => Object.freeze(Object.fromEntries([...this.index.agents.keys()].map((id) => [id,
        projectAgentOrgMessageIdentity(this.index, id),
      ]))),
      listMessages: () => projectAgentOrgCommunicationPerspective({ index: this.index,
        messages: this.view.communication_messages.messages, focusedAgentRunId }),
      referenceContentPath: (messageId: string, referenceId: string) =>
        `agent-org-runs/${encodeURIComponent(this.orgRunId)}/communication/messages/${encodeURIComponent(messageId)}/references/${encodeURIComponent(referenceId)}/content`,
    })
  }
}
