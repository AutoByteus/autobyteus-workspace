import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler'
import { overlayPendingUserMessages } from '~/services/agentStreaming/handlers/userMessageProjection'
import { reactive, shallowReactive } from 'vue'
import { memberDisplayName, memberTitleName } from '~/utils/collaboration/memberDisplayName'
import type {
  AgentOrgCommunicationMessageDto,
  AgentRunCollaborationEventDto,
  AgentRunCollaborationViewDto,
  ChildRunsChangedEventDto,
} from '@autobyteus/collaboration-stream-contracts'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type {
  CollaborationMessageMemberIdentity,
  CollaborationMessagesContextView,
} from '~/types/workspace/collaborationMessagesContextView'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { toAgentPresentationProjectionMessage } from '~/services/agentStreaming/teamStreamDtoAdapters'
import { dispatchAgentStreamMessage } from '~/services/agentStreaming/agentStreamMessageProjector'
import { advanceSequencedStream } from '~/services/agentStreaming/sequencedStreamRange'
import type { AgentPresentationMessage, CompactionRecoveryBlockDto } from '@autobyteus/agent-presentation-contracts'
import { useCollaborationParticipantMessagesStore } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { participantMessagesView } from '~/services/collaborationMessages/participantMessageRows'
import { AgentRunCollaborationIndex, type AgentRootChildAgent, type AgentRootRemoteAgent } from './agentRunCollaborationIndex'
import { resolveTeamStatus, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus'
import { applyRemoteSummaryStatuses, mergeByStartTime, remoteRowsOf } from '~/services/remoteRuns/remoteChildren'
import { agentRunAgentReadSubject, participantMessagesKeyOf } from '~/services/runHydration/agentReads'
import { treeLinesOf } from '~/utils/treeLines'
import type { ParticipantMessagesKey } from '~/services/collaborationMessages/collaborationParticipantMessages'

export type AgentRunCollaborationPhase = 'live' | 'historical' | 'reopen_required'
export type AgentRunCollaborationEventApplication = 'applied' | 'checkpoint_required'
export type AgentRunCollaborationContextEntry = Readonly<{ agentRunId: string; memberAddress: AgentTeamAddress; context: AgentContext }>

type Message = AgentOrgCommunicationMessageDto

export type AgentRunTaskTreeRow = Readonly<{
  row: RunHistoryTransientExecutionRow
  /** A Team row's status, counted from every listed agent under it (collapsed too); null for an agent row. */
  teamStatus: TeamStatus | null
  continuingAncestorDepths: number[]
  hasFollowingSibling: boolean
}>

/** One child's state, as the collaboration view gives it. */
export type CollaborationChildStatus = Readonly<{
  agentRunId: string
  memberAddress: string
  status: string
  recoverableBlock: CompactionRecoveryBlockDto | null
}>

const nameAt = memberDisplayName

/**
 * The client view of one standalone run's collaboration root: its task children (with one
 * AgentContext each), their messages. The host stays on its own Agent stream.
 */
export class AgentRunCollaborationContext {
  readonly hostRunId: string
  view: AgentRunCollaborationViewDto
  index: AgentRunCollaborationIndex
  phase: AgentRunCollaborationPhase
  error: string | null = null
  private readonly contexts = shallowReactive(new Map<string, AgentContext>())
  private nextChangeSequence: number

  constructor(input: Readonly<{
    hostRunId: string
    view: AgentRunCollaborationViewDto
    entries: readonly AgentRunCollaborationContextEntry[]
  }>) {
    this.hostRunId = input.hostRunId
    if (input.view.execution_tree.host.agentRunId !== input.hostRunId) {
      throw new Error(`Agent collaboration view correlation mismatch for '${input.hostRunId}'.`)
    }
    this.view = structuredClone(input.view)
    this.index = new AgentRunCollaborationIndex(this.view.execution_tree, this.view.remote_task_executions)
    this.nextChangeSequence = input.view.base_change_sequence + 1
    for (const entry of input.entries) {
      if (entry.agentRunId !== entry.context.state.runId || this.contexts.has(entry.agentRunId)
        || this.index.childAddressOf(entry.agentRunId) !== entry.memberAddress) {
        throw new Error(`Invalid or duplicate Agent collaboration context '${entry.agentRunId}'.`)
      }
      entry.context.state = reactive(entry.context.state)
      this.contexts.set(entry.agentRunId, reactive(entry.context))
    }
    if (this.contexts.size !== this.index.agents.size + this.index.remoteAgents.size) throw new Error('Agent collaboration context scope is incomplete.')
    const inputs = new Set<string>()
    for (const inputState of input.view.agent_input_states) {
      if (inputs.has(inputState.agent_run_id) || !this.index.agents.has(inputState.agent_run_id)) {
        throw new Error(`Agent collaboration input '${inputState.agent_run_id}' has no unique child identity.`)
      }
      inputs.add(inputState.agent_run_id)
    }
    this.applyStatuses(input.view.agent_statuses.map((status) => ({
      agentRunId: status.agent_run_id,
      memberAddress: status.member_address,
      status: status.status,
      recoverableBlock: status.recoverableBlock,
    })))
    for (const inputState of input.view.agent_input_states) {
      handleAgentInputState(inputState.state, this.contexts.get(inputState.agent_run_id)!)
    }
    // A streamed view (it has a live sequence) takes events whether or not the run's own agent runs (SR-045).
    this.phase = input.view.live_sequence_id !== null ? 'live' : 'historical'
  }

  /**
   * Sets each local child's current status and recoverable block (the view's states).
   * Every status must name one local child exactly once, by its ID and address; nothing else changes.
   */
  applyStatuses(statuses: readonly CollaborationChildStatus[]): void {
    const seen = new Set<string>()
    for (const status of statuses) {
      if (seen.has(status.agentRunId) || this.index.agents.get(status.agentRunId)?.address !== status.memberAddress) {
        throw new Error(`Agent collaboration status '${status.agentRunId}' has no unique exact child identity.`)
      }
      seen.add(status.agentRunId)
    }
    for (const status of statuses) {
      const state = this.contexts.get(status.agentRunId)!.state
      state.currentStatus = status.status as AgentStatus
      state.recoverableBlock = status.recoverableBlock
    }
  }

  get isActive(): boolean { return this.view.is_active }
  get changeSequence(): number { return this.nextChangeSequence - 1 }
  get hasChildren(): boolean { return this.index.agents.size > 0 }
  /** autobyteus-278: the runs this root delegated to other nodes. */
  get remoteExecutions() { return this.view.remote_task_executions }

  getAgentContext(agentRunId: string): AgentContext | null {
    return this.contexts.get(agentRunId) ?? null
  }

  /** The view holds this agent: the host or a child of its tree (the Team tab names it from the view). */
  holdsAgent(agentRunId: string): boolean { return agentRunId === this.hostRunId || this.index.agents.has(agentRunId) }

  getChild(agentRunId: string): AgentRootChildAgent | null {
    return this.index.agents.get(agentRunId) ?? null
  }

  /** autobyteus-278: an agent of a run this root delegated to another node. */
  getRemoteChild(agentRunId: string): AgentRootRemoteAgent | null {
    return this.index.remoteAgents.get(agentRunId) ?? null
  }

  /** Applies one root event, or a content batch covering `[changeSequence, changeSequenceThrough]`. */
  applyEvent(changeSequence: number, event: AgentRunCollaborationEventDto, changeSequenceThrough = changeSequence): AgentRunCollaborationEventApplication {
    if (this.phase !== 'live') throw new Error('Agent collaboration context is not accepting stream events.')
    const following = advanceSequencedStream(this.nextChangeSequence, { first: changeSequence, through: changeSequenceThrough })
    if (following === null) {
      this.requireReopen(`Agent collaboration change sequence gap: expected ${this.nextChangeSequence}, received ${changeSequence}.`)
      throw new Error(this.error!)
    }
    if (event.kind === 'agent_presentation') {
      this.dispatchPresentation([event])
    } else if (event.kind === 'agent_presentation_batch') {
      this.dispatchPresentation(event.items)
    } else if (event.kind === 'remote_task_execution_summary') {
      applyRemoteSummaryStatuses(event, (agentRunId) => this.contexts.get(agentRunId) ?? null, this.view.remote_task_executions)
    } else {
      // The Team tab's lists own the messages (autobyteus-358); the view holds none.
      this.assertMessagesCorrelated([event.message])
      useCollaborationParticipantMessagesStore().append(event.message)
    }
    this.nextChangeSequence = following
    return 'applied'
  }

  /**
   * The run's child rows changed (autobyteus-461 SR-042 … SR-044; unsequenced): a re-read of the view, unless the event
   * changes nothing it holds (an added row it has, a removed row it does not have, as for a change already in its snapshot).
   */
  applyChildRunsChanged(event: ChildRunsChangedEventDto): AgentRunCollaborationEventApplication {
    const holds = (reference: Readonly<{ agentRunId: string } | { teamRunId: string }>) => 'agentRunId' in reference
      ? this.index.agents.has(reference.agentRunId) || this.index.remoteAgents.has(reference.agentRunId)
      : this.index.teams.has(reference.teamRunId) || this.view.remote_task_executions.some((remote) => remote.kind === 'agent_team' && remote.team_run_id === reference.teamRunId)
    const added = event.added.map((row) => 'node_id' in row
      ? (row.kind === 'agent' ? { agentRunId: row.agent_run_id } : { teamRunId: row.team_run_id }) : row)
    return added.every(holds) && !event.removed.some(holds) ? 'applied' : 'checkpoint_required'
  }

  /** Every identity is checked before any message is dispatched; batch items apply in order. */
  private dispatchPresentation(entries: readonly Readonly<{
    agent_run_id: string; member_address: string; message: AgentPresentationMessage
  }>[]): void {
    const targets = entries.map((entry) => {
      const context = this.contexts.get(entry.agent_run_id)
      if (!context || this.index.childAddressOf(entry.agent_run_id) !== entry.member_address) {
        this.requireReopen(`Agent presentation identity '${entry.agent_run_id}' is not a child of this run.`)
        throw new Error(this.error!)
      }
      return { entry, context }
    })
    for (const { entry, context } of targets) {
      dispatchAgentStreamMessage(toAgentPresentationProjectionMessage(entry.message, entry.agent_run_id), {
        kind: 'agent_collaboration_member', context, hostRunId: this.hostRunId,
        agentRunId: entry.agent_run_id, memberAddress: entry.member_address,
      })
    }
  }

  /** The run's own agent started or stopped (SR-045): its children are runs of their own and keep their states. */
  setActive(active: boolean): void {
    if (this.view.is_active !== active) this.view = { ...this.view, is_active: active }
  }

  requireReopen(message: string): void {
    this.error = message
    this.phase = 'reopen_required'
  }

  listAgentContextEntries(): readonly AgentRunCollaborationContextEntry[] {
    return [...this.contexts].map(([agentRunId, context]) => Object.freeze({
      agentRunId, memberAddress: this.index.childAddressOf(agentRunId)!, context,
    }))
  }

  /**
   * Preflights every retained identity; the returned step hands each retained child's AgentContext
   * object to this context. A child loaded in `previous` (`wasLoaded`) keeps its displayed conversation,
   * so it does not flash empty, but is not loaded here: events may have been missed in between.
   */
  prepareLocalContextAdoption(previous: AgentRunCollaborationContext, wasLoaded: (agentRunId: string) => boolean): () => void {
    if (previous.hostRunId !== this.hostRunId) throw new Error('Agent collaboration retained host mismatch.')
    const pairs: { agentRunId: string; old: AgentContext; next: AgentContext; carried: boolean }[] = []
    for (const [agentRunId, next] of this.contexts) {
      const old = previous.getAgentContext(agentRunId)
      if (!old) continue
      if (old.state.runId !== agentRunId || next.state.runId !== agentRunId
        || previous.index.childAddressOf(agentRunId) !== this.index.childAddressOf(agentRunId)) {
        throw new Error('Agent collaboration retained identity mismatch.')
      }
      const before = old.state.inputProjection
      const after = next.state.inputProjection
      if (before && after && before.runInstanceId === after.runInstanceId && after.revision < before.revision) {
        throw new Error('Agent collaboration input snapshot revision is stale.')
      }
      pairs.push({ agentRunId, old, next, carried: wasLoaded(agentRunId) })
    }
    // Synchronous assignment only: all validation precedes it.
    return () => {
      for (const { agentRunId, old, next, carried } of pairs) {
        if (carried) {
          // The shown messages stay; the pending input is the new view's, as its input state would apply it.
          const conversation = old.state.conversation
          for (const message of conversation.messages) if (message.type === 'user') delete message.pendingInput
          overlayPendingUserMessages(conversation, next.state.conversation)
          next.state.conversation = conversation
          next.state.hasEarlierActiveTraceEvents = old.state.hasEarlierActiveTraceEvents
        }
        old.config = next.config
        old.state = next.state
        this.contexts.set(agentRunId, old)
      }
    }
  }

  /** A child is listed in the Workspaces tree: every child the view has (its child rows are the open ones, autobyteus-461). */
  isListed(agentRunId: string): boolean {
    return this.index.remoteAgents.has(agentRunId) || this.index.agents.has(agentRunId)
  }

  /** The task rows under the run row: the runs it delegated to (task Agents and task Teams with their members). */
  listTaskRows(isTeamExpanded: (teamRunId: string) => boolean): AgentRunTaskTreeRow[] {
    const flat: { row: RunHistoryTransientExecutionRow; teamStatus: TeamStatus | null }[] = []
    const statusOf = (agentRunId: string) => this.contexts.get(agentRunId)?.state.currentStatus ?? AgentStatus.Offline
    const delegatorName = (agentRunId: string | null) => {
      if (!agentRunId) return null
      const address = this.index.addressOf(agentRunId)
      return address ? nameAt(address) : agentRunId
    }
    const agentRow = (agent: AgentRootChildAgent, depth: number): RunHistoryTransientExecutionRow => ({
      kind: 'transient_execution', transientKind: agent.kind === 'task_team_member' ? 'task_team_child' : 'task_agent',
      rowKey: `agent:${agent.agentRunId}`, teamRunId: this.hostRunId, memberAddress: agent.address,
      agentRunId: agent.agentRunId, teamRunIdForNode: null, memberKind: 'agent', displayName: nameAt(agent.address),
      currentStatus: statusOf(agent.agentRunId), delegatedBy: delegatorName(agent.delegatorAgentRunId), depth, hasChildren: false,
    })
    type TaskExecution = AgentRunCollaborationViewDto['execution_tree']['taskExecutions'][number]
    const visitAgent = (agentRunId: string, depth: number, shown: boolean): AgentStatus[] => {
      if (shown) flat.push({ row: agentRow(this.index.requireAgent(agentRunId), depth), teamStatus: null })
      return [statusOf(agentRunId)]
    }
    // Every listed node is walked, so a collapsed Team still counts its agents; only shown rows are emitted.
    // Returns the statuses of the listed agents in the task's subtree. Teams are flat: a task Team's members
    // are Agents; the Teams under it are the copies its members delegated (its own task executions).
    const visit = (task: TaskExecution, depth: number, shown: boolean): AgentStatus[] => {
      if ('agentRunId' in task) return visitAgent(task.agentRunId, depth, shown)
      const team = this.index.teams.get(task.teamRunId)!
      const members = task.members
      const tasks = task.taskExecutions
      const entry: { row: RunHistoryTransientExecutionRow; teamStatus: TeamStatus | null } = { row: {
        kind: 'transient_execution', transientKind: 'task_team', rowKey: `team:${task.teamRunId}`, teamRunId: this.hostRunId,
        memberAddress: task.address, agentRunId: null, teamRunIdForNode: task.teamRunId, memberKind: 'agent_team',
        displayName: nameAt(task.address), currentStatus: null, delegatedBy: delegatorName(team.delegatorAgentRunId),
        depth, hasChildren: members.length + tasks.length > 0,
      }, teamStatus: null }
      if (shown) flat.push(entry)
      const childrenShown = shown && isTeamExpanded(task.teamRunId)
      const statuses = [
        ...members.flatMap((member) => visitAgent(member.agentRunId, depth + 1, childrenShown)),
        ...tasks.flatMap((child) => visit(child, depth + 1, childrenShown)),
      ]
      // A child Team's status is its own agents': it runs on its own, whether or not this run's agent does.
      entry.teamStatus = resolveTeamStatus(statuses, true)
      return statuses
    }
    // autobyteus-278: the root's remote runs are rows like its local copies, in the order they were delegated.
    const remote = remoteRowsOf({
      executions: this.view.remote_task_executions, rootRunId: this.hostRunId, isActive: this.isActive,
      statusOf, delegatorName, isTeamExpanded, nameAt,
    })
    mergeByStartTime(
      this.rootExecutionNodes().map((task) => ({ startedAt: task.startedAt, value: () => { visit(task, 0, true) } })),
      remote.map((entry) => ({ startedAt: entry.startedAt, value: () => { flat.push(...entry.rows) } })),
    ).forEach((emit) => emit())
    const lines = treeLinesOf(flat.map(({ row }) => row.depth))
    return flat.map(({ row, teamStatus }, index) => Object.freeze({ row, teamStatus, ...lines[index]! }))
  }

  /** Messages between the host and its children, seen from one participant (the Team tab). */
  messagesView(focusedAgentRunId: string): CollaborationMessagesContextView {
    const focusedMemberAddress = this.index.addressOf(focusedAgentRunId)
    if (!focusedMemberAddress) throw new Error(`AgentRun '${focusedAgentRunId}' is not in this run.`)
    return Object.freeze({
      rootKind: 'agent', rootRunId: this.hostRunId, focusedAgentRunId, focusedMemberAddress,
      memberIdentityByAgentRunId: () => Object.freeze(Object.fromEntries(
        [this.hostRunId, ...this.index.agents.keys()].map((id) => [id, this.identityOf(id)]),
      )),
      ...participantMessagesView({
        key: this.participantMessagesKey(focusedAgentRunId),
        isRemote: this.index.remoteAgents.has(focusedAgentRunId),
        identityOf: (agentRunId) => this.index.addressOf(agentRunId) ? this.identityOf(agentRunId) : null,
      }),
    })
  }

  /** Whose log holds a participant's messages: the log of the subject this view kind's owner reads it through (CR-461-022). */
  private participantMessagesKey(agentRunId: string): ParticipantMessagesKey {
    return participantMessagesKeyOf(agentRunAgentReadSubject(this.hostRunId, this.index, agentRunId))
  }

  private identityOf(agentRunId: string): CollaborationMessageMemberIdentity {
    const address = this.index.addressOf(agentRunId)!
    // The run's own agent reads as its name ("Research Assistant", as in "From Research Assistant:",
    // VIS-013); collaborators and members keep the shared lowercase row format (VIS-004/009/012).
    const common = { address, label: agentRunId === this.hostRunId ? memberTitleName(address) : nameAt(address) }
    const child = this.index.agents.get(agentRunId)
    if (!child) return Object.freeze({ ...common, kind: 'configured' })
    return Object.freeze({ ...common, kind: 'delegated', hostRunId: child.teamRunId ?? this.hostRunId,
      executionRunId: child.teamRunId ?? child.agentRunId })
  }

  private assertMessagesCorrelated(messages: readonly Message[]): void {
    for (const message of messages) {
      if (message.senderAgentRunId === message.receiverAgentRunId
        || !this.index.isParticipant(message.senderAgentRunId) || !this.index.isParticipant(message.receiverAgentRunId)) {
        throw new Error(`Agent collaboration message '${message.messageId}' identity mismatch.`)
      }
    }
  }

  /** The root's delegated children. */
  private rootExecutionNodes() {
    return this.view.execution_tree.taskExecutions
  }
}
