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
import { advanceSequencedStream } from '~/services/agentStreaming/sequencedStreamRange'
import type { AgentPresentationMessage } from '@autobyteus/agent-presentation-contracts'
import { applyOfflineOrTerminalCleanup } from '~/services/runStatus/agentRuntimeStatusState'
import { AgentOrgExecutionViewIndex, type OrgWorkspaceSelection, type OrgAgentViewIdentity, type OrgTeamViewIdentity } from './agentOrgExecutionViewIndex'
import {
  assertAgentOrgCommunicationMessagesCorrelated,
  projectAgentOrgMessageIdentity,
} from './agentOrgCommunicationPerspective'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { participantMessagesView } from '~/services/collaborationMessages/participantMessageRows'
import { treeAgentIdentity } from '~/utils/runTree/runTreeAgents'
import { delegatedRunMessagesKey, type DelegatedRunSubject } from '~/services/delegatedRuns/delegatedRunSubjects'
import type { ParticipantMessagesKey } from '~/services/collaborationMessages/collaborationParticipantMessages'

export type AgentOrgSyncPhase = 'hydrating' | 'live' | 'historical' | 'reopen_required' | 'closed'
export type AgentOrgEventApplication = 'applied'

export type AgentOrgContextEntry = Readonly<{
  agentRunId: string
  memberAddress: AgentTeamAddress
  context: AgentContext
}>

type AgentOrgStatus = AgentOrgExecutionViewDto['agent_statuses'][number]

const nameAt = memberDisplayName

/**
 * The client view of one Org run (autobyteus-461 SR-084): its own agents and mounted teams, with one AgentContext each,
 * its Team tab's messages and its tree's changes. The runs it delegated are its tree's rows (`runTreeStore`); each opens
 * as a run of its own (rule 2), never through this view.
 */
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
      if (this.index.addressOf(entry.agentRunId) !== entry.memberAddress) throw new Error('AgentOrg context address mismatch.')
    }
    if (this.contexts.size !== this.index.agents.size) throw new Error('AgentOrg context scope is incomplete.')
    for (const status of input.view.agent_statuses) {
      const address = this.index.agents.get(status.agent_run_id)?.address
      if (address !== status.member_address) {
        throw new Error(`AgentOrg status '${status.agent_run_id}' has no exact context identity.`)
      }
      this.contexts.get(status.agent_run_id)!.state.currentStatus = status.status as AgentStatus
      this.contexts.get(status.agent_run_id)!.state.backgroundTasksRunning = status.background_tasks_running
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
      memberAddress: this.index.addressOf(agentRunId)!,
      context,
    })))
  }

  /** The view holds this agent: one of its own, or an agent of a run in its tree (the Team tab names it from there). */
  holdsAgent(agentRunId: string): boolean {
    return this.index.agents.has(agentRunId) || treeAgentIdentity(this.treeRows(), agentRunId, this.orgRunId) !== null
  }

  private treeRows() { return useRunTreeStore().rowsOf({ kind: 'agent_org', runId: this.orgRunId }) }

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
      workspaceRootPath: agent.source.launchConfiguration.workspaceRootPath,
      collaborationMessages: this.messagesView(agent.address, agent.agentRunId),
      browse: Object.freeze({ kind: 'agentOrgMember' as const, orgRunId: this.orgRunId,
        memberAddress: agent.address, agentRunId: agent.agentRunId }),
    }
    if (agent.host.kind === 'team') return Object.freeze({
      ...common, team: this.teamView(this.index.requireTeam(agent.host.runId), agent, context), kind: 'agent_org_team_member' as const,
    })
    return Object.freeze({ ...common, kind: 'agent_org_direct_agent' })
  }

  adoptLocalContexts(previous: AgentOrgExecutionContext): void {
    if (previous.orgRunId !== this.orgRunId) throw new Error('AgentOrg candidate root mismatch.')
    const matches = this.listAgentContextEntries().flatMap((entry) => {
      const old = previous.getAgentContext(entry.agentRunId)
      if (!old) return []
      if (previous.index.addressOf(entry.agentRunId) !== entry.memberAddress) {
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

  applyRunConfig(config: AgentOrgExecutionViewDto['execution_tree'], isActive: boolean,
    metadataByRootPath: ReadonlyMap<string, WorkspaceMetadata | null> = new Map()): boolean {
    if (this.phase !== 'historical' || this.isActive || isActive
      || config.rootOrg.orgRunId !== this.orgRunId) return false
    // The Org's own configuration (its delegated runs are its tree's rows).
    const executionTree = config
    assertAgentOrgRunConfigChange(this.view.execution_tree, executionTree)
    const view = { ...this.view, execution_tree: cloneExistingRunJsonValue(executionTree) }
    const index = new AgentOrgExecutionViewIndex(view)
    const updates = [...index.agents.values()].map((agent) => {
      const context = this.getAgentContext(agent.agentRunId)
      if (!context) throw new Error(`Org configured context '${agent.agentRunId}' is unavailable.`)
      const launch = agent.source.launchConfiguration
      const oldRoot = this.index.requireAgent(agent.agentRunId).source.launchConfiguration.workspaceRootPath
      const workspaceChanged = oldRoot !== launch.workspaceRootPath
      const metadata = launch.workspaceRootPath ? metadataByRootPath.get(launch.workspaceRootPath) : null
      if (metadata && metadata.workspaceRootPath !== launch.workspaceRootPath) throw new Error('Workspace metadata root mismatch.')
      const resolveWorkspace = workspaceChanged || !context.config.workspaceId || !context.config.workspaceMetadata
      const modelChanged = context.config.runtimeKind !== launch.runtimeKind
        || context.config.llmModelIdentifier !== launch.llmModelIdentifier
        || !existingRunModelConfigsEqual(context.config.llmConfig, launch.llmConfig)
      return { context, launch, resolveWorkspace, metadata, modelChanged }
    })
    // All validation, clone, index and context planning precedes synchronous publication.
    this.view = view
    this.index = index
    for (const { context, launch, resolveWorkspace, metadata, modelChanged } of updates) {
      if (!modelChanged && !resolveWorkspace) continue
      context.config = { ...context.config, runtimeKind: launch.runtimeKind, llmModelIdentifier: launch.llmModelIdentifier,
        llmConfig: cloneExistingRunJsonValue(launch.llmConfig),
        ...(resolveWorkspace ? { workspaceId: metadata?.workspaceId ?? null, workspaceMetadata: metadata ?? null } : {}) }
      context.conversation.llmModelIdentifier = launch.llmModelIdentifier
    }
    return true
  }

  /** Applies one root event, or a content batch covering `[changeSequence, changeSequenceThrough]`. */
  applyEvent(changeSequence: number, event: AgentOrgExecutionEventDto, changeSequenceThrough = changeSequence): AgentOrgEventApplication {
    // A stopped Org's view streams too (autobyteus-461 SR-045): its tree and messages.
    if (this.phase !== 'live' && this.phase !== 'historical') throw new Error('AgentOrg context is not accepting stream events.')
    const following = advanceSequencedStream(this.nextChangeSequence, { first: changeSequence, through: changeSequenceThrough })
    if (following === null) {
      this.requireReopen(`Expected change sequence ${this.nextChangeSequence}, received ${changeSequence}.`)
      throw new Error(this.error!)
    }
    if (event.kind === 'agent_presentation') {
      this.dispatchPresentation([event])
    } else if (event.kind === 'agent_presentation_batch') {
      this.dispatchPresentation(event.items)
    } else if (event.kind === 'run_tree_changed') {
      // The Org's tree (SR-084): numbered in the view's sequence, applied to the rows its tree snapshot gave.
      useRunTreeStore().streamChange({ kind: 'agent_org', runId: this.orgRunId }, event)
      // Its Team tab still names an agent that left the tree (its Task closed): from the server's answer.
      if (event.removed.length) useCollaborationParticipantMessagesStore().reloadNamingUnknown('agent_org', this.orgRunId, (id) => this.holdsAgent(id))
    } else {
      try {
        assertAgentOrgCommunicationMessagesCorrelated([event.message])
      } catch {
        this.correlationFailure(`AgentOrg communication message '${event.message.messageId}' identity mismatch.`)
      }
      // The Team tab's lists own the messages (autobyteus-358); the view holds none.
      useCollaborationParticipantMessagesStore().append('agent_org', this.orgRunId, event.message)
    }
    this.nextChangeSequence = following
    return 'applied'
  }

  /** Every identity is checked before any message is dispatched; batch items apply in order. */
  private dispatchPresentation(entries: readonly Readonly<{
    agent_run_id: string; member_address: string; message: AgentPresentationMessage
  }>[]): void {
    const targets = entries.map((entry) => {
      const context = this.contexts.get(entry.agent_run_id)
      if (!context || this.index.addressOf(entry.agent_run_id) !== entry.member_address) {
        this.requireReopen(`Agent presentation identity '${entry.agent_run_id}' is not in the context.`)
        throw new Error(this.error!)
      }
      return { entry, context }
    })
    for (const { entry, context } of targets) {
      dispatchAgentStreamMessage(
        toAgentPresentationProjectionMessage(entry.message, entry.agent_run_id),
        {
          kind: 'agent_org_member', context, orgRunId: this.orgRunId,
          agentRunId: entry.agent_run_id, memberAddress: entry.member_address,
        },
      )
    }
  }

  /** The Org's own agents start or stop; the runs it delegated are runs of their own and keep their states (SR-045). */
  setActive(active: boolean): void {
    this.view = { ...this.view, is_active: active }
    if (!active) {
      this.commitView({ ...this.view, agent_statuses: this.view.agent_statuses.map((status: AgentOrgStatus) =>
        ({ ...status, status: 'offline', background_tasks_running: 0, recoverableBlock: null })) })
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

  /** A run this Org delegated, opened as its own run (rule 2): its Team tab reads its own run's log (CR-461-020). */
  delegatedRunMessagesView(subject: DelegatedRunSubject, address: string, agentRunId: string): CollaborationMessagesContextView {
    return this.messagesView(parseAgentTeamAddress(address), agentRunId, delegatedRunMessagesKey(subject))
  }

  private messagesView(focusedMemberAddress: AgentTeamAddress, focusedAgentRunId: string,
    key: ParticipantMessagesKey = { rootKind: 'agent_org', rootRunId: this.orgRunId, agentRunId: focusedAgentRunId }): CollaborationMessagesContextView {
    return Object.freeze({
      rootKind: 'agent_org', rootRunId: this.orgRunId, focusedAgentRunId, focusedMemberAddress,
      memberIdentityByAgentRunId: () => Object.freeze(Object.fromEntries([...this.index.agents.keys()].map((id) => [id,
        projectAgentOrgMessageIdentity(this.index, id),
      ]))),
      ...participantMessagesView({
        key,
        isRemote: false,
        // Its own agents, or an agent of a run in its tree (SR-084).
        identityOf: (agentRunId) => this.index.agents.has(agentRunId) ? projectAgentOrgMessageIdentity(this.index, agentRunId)
          : treeAgentIdentity(this.treeRows(), agentRunId, this.orgRunId),
      }),
    })
  }
}
