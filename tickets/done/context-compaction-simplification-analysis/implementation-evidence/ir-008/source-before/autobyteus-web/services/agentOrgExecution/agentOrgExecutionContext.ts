import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler';
import { cloneExistingRunJsonValue } from '~/services/runConfigEditing/existingAgentModelConfigDraft'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import type { WorkspaceMetadata } from '~/types/workspace/WorkspaceMetadata'
import { assertAgentOrgRunConfigChange } from './agentOrgRunConfigAdoption'
import { existingRunModelConfigsEqual } from '~/services/runConfigEditing/existingAgentModelConfigDraft'
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
import { AgentOrgExecutionViewIndex, type OrgWorkspaceSelection, type OrgAgentViewIdentity, type OrgTeamViewIdentity } from './agentOrgExecutionViewIndex'
import {
  assertAgentOrgCommunicationMessagesCorrelated,
  projectAgentOrgCommunicationPerspective,
  projectAgentOrgMessageIdentity,
} from './agentOrgCommunicationPerspective'
import { collaboratorAgentSourceAt, collaboratorTeamSourceAt } from '~/services/collaborators/agentSourceSelectors'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { createAgentContext } from './agentOrgMemberContextFactory'
import { collaboratorCandidatesService } from '~/services/collaborators/collaboratorCandidatesService'

export type AgentOrgSyncPhase = 'hydrating' | 'live' | 'historical' | 'reopen_required' | 'closed'
export type AgentOrgEventApplication = 'applied' | 'checkpoint_required'

export type AgentOrgContextEntry = Readonly<{
  agentRunId: string
  memberAddress: AgentTeamAddress
  context: AgentContext
}>

type TaskExecutionStartedEvent = Extract<AgentOrgExecutionEventDto, { kind: 'task_execution_started' }>
type AgentOrgStatus = AgentOrgExecutionViewDto['agent_statuses'][number]

const nameAt = memberDisplayName

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
      this.contexts.get(status.agent_run_id)!.state.recoverableBlock = status.recoverableBlock
    }
    for (const entry of input.view.agent_input_states) {
      const context = this.contexts.get(entry.agent_run_id)
      if (!context) throw new Error('AgentOrg input-state target mismatch.')
      handleAgentInputState(entry.state, context)
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
      browse: Object.freeze({ kind: 'agentOrgMember' as const, orgRunId: this.orgRunId,
        memberAddress: agent.address, agentRunId: agent.agentRunId }),
    }
    if (agent.kind === 'task') return Object.freeze({ ...common, kind: 'agent_org_task_agent' })
    if (agent.host.kind === 'team') return Object.freeze({
      ...common, team: this.teamView(this.index.requireTeam(agent.host.runId), agent, context),
      kind: agent.delegation ? 'agent_org_task_team_member' as const : 'agent_org_team_member' as const,
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

  applyRunConfig(executionTree: AgentOrgExecutionViewDto['execution_tree'], isActive: boolean,
    metadataByRootPath: ReadonlyMap<string, WorkspaceMetadata | null> = new Map()): boolean {
    if (this.phase !== 'historical' || this.isActive || isActive
      || executionTree.rootOrg.orgRunId !== this.orgRunId) return false
    assertAgentOrgRunConfigChange(this.view.execution_tree, executionTree)
    const view = { ...this.view, execution_tree: cloneExistingRunJsonValue(executionTree) }
    const index = new AgentOrgExecutionViewIndex(view)
    const updates = [...index.agents.values()].flatMap((agent) => {
      if (agent.delegation || agent.kind !== 'configured') return []
      const context = this.getAgentContext(agent.agentRunId)
      if (!context) throw new Error(`Org configured context '${agent.agentRunId}' is unavailable.`)
      const launch = agent.source.launchConfiguration
      const oldRoot = this.index.requireAgent(agent.agentRunId).source.launchConfiguration.workspaceRootPath
      const workspaceChanged = oldRoot !== launch.workspaceRootPath
      const metadata = launch.workspaceRootPath ? metadataByRootPath.get(launch.workspaceRootPath) : null
      if (metadata && metadata.workspaceRootPath !== launch.workspaceRootPath) throw new Error('Workspace metadata root mismatch.')
      const resolveWorkspace = workspaceChanged || !context.config.workspaceId || !context.config.workspaceMetadata
      const modelChanged = context.config.llmModelIdentifier !== launch.llmModelIdentifier
        || !existingRunModelConfigsEqual(context.config.llmConfig, launch.llmConfig)
      return [{ context, launch, resolveWorkspace, metadata, modelChanged }]
    })
    // All validation, clone, index and context planning precedes synchronous publication.
    this.view = view
    this.index = index
    for (const { context, launch, resolveWorkspace, metadata, modelChanged } of updates) {
      if (!modelChanged && !resolveWorkspace) continue
      context.config = { ...context.config, llmModelIdentifier: launch.llmModelIdentifier,
        llmConfig: cloneExistingRunJsonValue(launch.llmConfig),
        ...(resolveWorkspace ? { workspaceId: metadata?.workspaceId ?? null, workspaceMetadata: metadata ?? null } : {}) }
      context.conversation.llmModelIdentifier = launch.llmModelIdentifier
    }
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
          agentRunId: event.agent_run_id, memberAddress: event.member_address,
        },
      )
    } else if (event.kind === 'task_execution_started') {
      // A new delegated child needs new contexts; reload through a checkpoint.
      this.validateTaskExecutionStarted(event)
      return 'checkpoint_required'
    } else if (event.kind === 'collaborator_added') {
      // One hosted instance per entry: its executions get contexts now, Offline. Applied in
      // place (no checkpoint) so the pending send that added it keeps its acknowledgement.
      const root = this.view.execution_tree.rootOrg
      if ((root.collaborators ?? []).some((entry) => entry.address === event.collaborator.address)
        || this.index.configured.has(event.collaborator.address)) {
        this.correlationFailure(`AgentOrg collaborator address '${event.collaborator.address}' is already in use.`)
      }
      this.commitView({ ...this.view, execution_tree: { ...this.view.execution_tree,
        rootOrg: { ...root, collaborators: [...(root.collaborators ?? []), event.collaborator] } } })
      this.addContextsForNewAgents()
      collaboratorCandidatesService.invalidate('agent_org', this.orgRunId)
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
      this.commitView({ ...this.view, agent_statuses: this.view.agent_statuses.map((status: AgentOrgStatus) => ({ ...status, status: 'offline', recoverableBlock: null })) })
      this.contexts.forEach((context) => applyOfflineOrTerminalCleanup(context))
      this.phase = 'historical'
    }
  }

  requireReopen(message: string): void {
    this.error = message
    this.phase = 'reopen_required'
  }

  /** Offline contexts for indexed agents without one (a collaborator's new executions). */
  private addContextsForNewAgents(): void {
    const workspaceFor = (rootPath: string | null) => rootPath
      ? [...this.index.agents.values()].map((agent) => this.contexts.get(agent.agentRunId)?.config.workspaceMetadata)
        .find((metadata) => metadata?.workspaceRootPath === rootPath) ?? null
      : null
    for (const agent of this.index.agents.values()) {
      if (this.contexts.has(agent.agentRunId)) continue
      const context = createAgentContext({
        address: agent.address, agentRunId: agent.agentRunId,
        agentDefinitionId: agent.source.agentDefinitionId, launch: agent.source.launchConfiguration,
      }, this.view.execution_tree.createdAt, workspaceFor(agent.source.launchConfiguration.workspaceRootPath))
      context.state = reactive(context.state)
      const live = reactive(context)
      this.contexts.set(agent.agentRunId, live)
      const rootPath = agent.source.launchConfiguration.workspaceRootPath
      if (!live.config.workspaceMetadata && rootPath) {
        void useRunHistoryStore().resolveWorkspaceMetadataByRootPath(rootPath).then((metadata) => {
          if (metadata && !live.config.workspaceMetadata) {
            live.config = { ...live.config, workspaceMetadata: metadata, workspaceId: metadata.workspaceId }
          }
        }).catch(() => undefined)
      }
    }
  }

  private commitView(view: AgentOrgExecutionViewDto): void {
    const index = new AgentOrgExecutionViewIndex(view)
    this.view = view
    this.index = index
  }

  private validateTaskExecutionStarted(event: TaskExecutionStartedEvent): void {
    const execution = event.execution
    const runId = 'agentRunId' in execution ? execution.agentRunId : execution.teamRunId
    const address = parseAgentTeamAddress(execution.address)
    const configured = this.index.configured.get(address)
    const collaborators = this.view.execution_tree.rootOrg.collaborators ?? []
    const source = configured
      ?? collaboratorAgentSourceAt(collaborators, address)
      ?? collaboratorTeamSourceAt(collaborators, address)
    const hostKnown = event.host_kind === 'root'
      ? event.host_run_id === this.orgRunId
      : this.index.teams.has(event.host_run_id)
    // A newly started child always records its delegator.
    if (!execution.delegatorAgentRunId || !this.index.agents.has(execution.delegatorAgentRunId) || !hostKnown || !source
      || ('agentDefinitionId' in source) !== ('agentRunId' in execution)
      || this.index.agents.has(runId) || this.index.teams.has(runId)) {
      this.correlationFailure(`AgentOrg delegated execution '${runId}' identity mismatch.`)
    }
  }

  private correlationFailure(message: string): never {
    this.requireReopen(message)
    throw new Error(this.error!)
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
      isFocusedProjectionAuthoritative: () => true,
      listMembers: () => Object.freeze(members),
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
