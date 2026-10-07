import { handleAgentInputState } from '~/services/agentStreaming/handlers/agentInputStateHandler'
import { reactive, shallowReactive } from 'vue'
import { memberDisplayName, memberTitleName } from '~/utils/collaboration/memberDisplayName'
import type {
  AgentRunCollaborationEventDto,
  AgentRunCollaborationViewDto,
} from '@autobyteus/collaboration-stream-contracts'
import type { AgentContext } from '~/types/agent/AgentContext'
import { AgentStatus } from '~/types/agent/AgentStatus'
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import type {
  CollaborationMessageMemberIdentity,
  CollaborationMessagePerspectiveRow,
  CollaborationMessagesContextView,
} from '~/types/workspace/collaborationMessagesContextView'
import type { RunHistoryTransientExecutionRow } from '~/stores/runHistoryTypes'
import { toAgentPresentationProjectionMessage } from '~/services/agentStreaming/teamStreamDtoAdapters'
import { dispatchAgentStreamMessage } from '~/services/agentStreaming/agentStreamMessageProjector'
import { applyOfflineOrTerminalCleanup } from '~/services/runStatus/agentRuntimeStatusState'
import { projectAgentOrgReference } from '~/services/agentOrgExecution/agentOrgReferenceProjection'
import { createChildContext } from './agentRunCollaborationChildContextFactory'
import { collaboratorExecutionNodes } from '~/services/collaborators/agentSourceSelectors'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { collaboratorCandidatesService } from '~/services/collaborators/collaboratorCandidatesService'
import { AgentRunCollaborationIndex, type AgentRootChildAgent } from './agentRunCollaborationIndex'
import {
  agentRunKey,
  collaborationTreeWalk,
  collectClosedSubtrees,
  mergeClosedTaskExecutions,
  removeReopenedTaskExecutions,
  type CollaborationTreeNode,
} from '~/utils/collaboration/taskExecutionClosure'

export type AgentRunCollaborationPhase = 'live' | 'historical' | 'reopen_required'
export type AgentRunCollaborationEventApplication = 'applied' | 'checkpoint_required'
export type AgentRunCollaborationContextEntry = Readonly<{ agentRunId: string; memberAddress: AgentTeamAddress; context: AgentContext }>

type Message = AgentRunCollaborationViewDto['communication_messages']['messages'][number]

export type AgentRunTaskTreeRow = Readonly<{
  row: RunHistoryTransientExecutionRow
  continuingAncestorDepths: number[]
  hasFollowingSibling: boolean
}>

const nameAt = memberDisplayName

/**
 * The client view of one standalone run's collaboration root: its task children (with one
 * AgentContext each), their collaborators and messages. The host stays on its own Agent stream.
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
    if (input.view.execution_tree.host.agentRunId !== input.hostRunId
      || input.view.communication_messages.hostRunId !== input.hostRunId) {
      throw new Error(`Agent collaboration view correlation mismatch for '${input.hostRunId}'.`)
    }
    this.view = structuredClone(input.view)
    this.index = new AgentRunCollaborationIndex(this.view.execution_tree)
    this.nextChangeSequence = input.view.base_change_sequence + 1
    for (const entry of input.entries) {
      if (entry.agentRunId !== entry.context.state.runId || this.contexts.has(entry.agentRunId)
        || this.index.requireAgent(entry.agentRunId).address !== entry.memberAddress) {
        throw new Error(`Invalid or duplicate Agent collaboration context '${entry.agentRunId}'.`)
      }
      entry.context.state = reactive(entry.context.state)
      this.contexts.set(entry.agentRunId, reactive(entry.context))
    }
    if (this.contexts.size !== this.index.agents.size) throw new Error('Agent collaboration context scope is incomplete.')
    this.assertMessagesCorrelated(this.view.communication_messages.messages)
    const statuses = new Set<string>()
    const inputs = new Set<string>()
    for (const status of input.view.agent_statuses) {
      if (statuses.has(status.agent_run_id) || this.index.agents.get(status.agent_run_id)?.address !== status.member_address) {
        throw new Error(`Agent collaboration status '${status.agent_run_id}' has no unique exact child identity.`)
      }
      statuses.add(status.agent_run_id)
    }
    for (const inputState of input.view.agent_input_states) {
      if (inputs.has(inputState.agent_run_id) || !this.index.agents.has(inputState.agent_run_id)) {
        throw new Error(`Agent collaboration input '${inputState.agent_run_id}' has no unique child identity.`)
      }
      inputs.add(inputState.agent_run_id)
    }
    for (const status of input.view.agent_statuses) {
      const state = this.contexts.get(status.agent_run_id)!.state
      state.currentStatus = status.status as AgentStatus
      state.recoverableBlock = status.recoverableBlock
    }
    for (const inputState of input.view.agent_input_states) {
      handleAgentInputState(inputState.state, this.contexts.get(inputState.agent_run_id)!)
    }
    this.phase = input.view.is_active ? 'live' : 'historical'
  }

  get isActive(): boolean { return this.view.is_active }
  get changeSequence(): number { return this.nextChangeSequence - 1 }
  get hasChildren(): boolean { return this.index.agents.size > 0 }

  getAgentContext(agentRunId: string): AgentContext | null {
    return this.contexts.get(agentRunId) ?? null
  }

  getChild(agentRunId: string): AgentRootChildAgent | null {
    return this.index.agents.get(agentRunId) ?? null
  }

  applyEvent(changeSequence: number, event: AgentRunCollaborationEventDto): AgentRunCollaborationEventApplication {
    if (this.phase !== 'live') throw new Error('Agent collaboration context is not accepting stream events.')
    if (changeSequence !== this.nextChangeSequence) {
      this.requireReopen(`Agent collaboration change sequence gap: expected ${this.nextChangeSequence}, received ${changeSequence}.`)
      throw new Error(this.error!)
    }
    if (event.kind === 'agent_presentation') {
      const context = this.contexts.get(event.agent_run_id)
      if (!context || this.index.agents.get(event.agent_run_id)?.address !== event.member_address) {
        this.requireReopen(`Agent presentation identity '${event.agent_run_id}' is not a child of this run.`)
        throw new Error(this.error!)
      }
      dispatchAgentStreamMessage(toAgentPresentationProjectionMessage(event.message, event.agent_run_id), {
        kind: 'agent_collaboration_member', context, hostRunId: this.hostRunId,
        agentRunId: event.agent_run_id, memberAddress: event.member_address,
      })
    } else if (event.kind === 'task_execution_started') {
      // A new child needs its own context and projection; reload the view.
      return 'checkpoint_required'
    } else if (event.kind === 'task_executions_closed') {
      // Their Task is DONE: they stay in the tree and the Team tab, and leave the listing.
      const unknown = event.task_executions.find((reference) => 'agentRunId' in reference
        ? this.index.agents.get(reference.agentRunId)?.kind !== 'task_agent' : !this.index.teams.has(reference.teamRunId))
      if (unknown) {
        this.requireReopen('A closed task execution is not a task execution of this run.')
        throw new Error(this.error!)
      }
      this.view = { ...this.view,
        closed_task_executions: mergeClosedTaskExecutions(this.view.closed_task_executions, event.task_executions) }
    } else if (event.kind === 'task_executions_reopened') {
      // Their assigner reactivated them: they are listed again (helpers under them stay closed).
      const unknown = event.task_executions.find((reference) => 'agentRunId' in reference
        ? this.index.agents.get(reference.agentRunId)?.kind !== 'task_agent' : !this.index.teams.has(reference.teamRunId))
      if (unknown) {
        this.requireReopen('A reopened task execution is not a task execution of this run.')
        throw new Error(this.error!)
      }
      this.view = { ...this.view,
        closed_task_executions: removeReopenedTaskExecutions(this.view.closed_task_executions, event.task_executions) }
    } else if (event.kind === 'collaborator_added') {
      // One hosted instance per entry: its executions get contexts now, Offline. Applied in
      // place (no reload) so a pending send that added it keeps its acknowledgement.
      const tree = this.view.execution_tree
      if (tree.collaborators.some((entry) => entry.address === event.collaborator.address)) {
        this.requireReopen(`Collaborator address '${event.collaborator.address}' is already in use.`)
        throw new Error(this.error!)
      }
      this.commitTree({ ...tree, collaborators: [...tree.collaborators, event.collaborator] })
      this.addContextsForNewChildren()
      collaboratorCandidatesService.invalidate('agent', this.hostRunId)
    } else {
      this.assertMessagesCorrelated([event.message])
      this.view = { ...this.view, communication_messages: {
        ...this.view.communication_messages,
        messages: [...this.view.communication_messages.messages, event.message],
      } }
    }
    this.nextChangeSequence += 1
    return 'applied'
  }

  setActive(active: boolean): void {
    this.view = { ...this.view, is_active: active }
    if (!active) {
      this.contexts.forEach((context) => applyOfflineOrTerminalCleanup(context))
      this.phase = 'historical'
    }
  }

  requireReopen(message: string): void {
    this.error = message
    this.phase = 'reopen_required'
  }

  listAgentContextEntries(): readonly AgentRunCollaborationContextEntry[] {
    return [...this.contexts].map(([agentRunId, context]) => Object.freeze({
      agentRunId, memberAddress: this.index.requireAgent(agentRunId).address, context,
    }))
  }

  /** Preflight every retained identity before the caller commits any activities. */
  prepareLocalContextAdoption(previous: AgentRunCollaborationContext): () => void {
    if (previous.hostRunId !== this.hostRunId) throw new Error('Agent collaboration retained host mismatch.')
    const pairs: { agentRunId: string; old: AgentContext; next: AgentContext }[] = []
    for (const [agentRunId, next] of this.contexts) {
      const old = previous.getAgentContext(agentRunId)
      if (!old) continue
      if (old.state.runId !== agentRunId || next.state.runId !== agentRunId
        || previous.index.requireAgent(agentRunId).address !== this.index.requireAgent(agentRunId).address) {
        throw new Error('Agent collaboration retained identity mismatch.')
      }
      const before = old.state.inputProjection
      const after = next.state.inputProjection
      if (before && after && before.runInstanceId === after.runInstanceId && after.revision < before.revision) {
        throw new Error('Agent collaboration input snapshot revision is stale.')
      }
      pairs.push({ agentRunId, old, next })
    }
    // Synchronous assignment only: all validation precedes the activity transaction.
    return () => {
      for (const { agentRunId, old, next } of pairs) {
        old.config = next.config
        old.state = next.state
        this.contexts.set(agentRunId, old)
      }
    }
  }

  /** Offline contexts for indexed children without one (a collaborator's new executions). */
  private addContextsForNewChildren(): void {
    for (const child of this.index.agents.values()) {
      if (this.contexts.has(child.agentRunId)) continue
      const rootPath = child.source.launchConfiguration.workspaceRootPath
      const known = [...this.contexts.values()].map((context) => context.config.workspaceMetadata)
        .find((metadata) => metadata && metadata.workspaceRootPath === rootPath) ?? null
      const context = reactive(createChildContext(child, this.view.execution_tree.createdAt, known))
      context.state = reactive(context.state)
      this.contexts.set(child.agentRunId, context)
      if (!known && rootPath) {
        void useRunHistoryStore().resolveWorkspaceMetadataByRootPath(rootPath).then((metadata) => {
          if (metadata && !context.config.workspaceMetadata) {
            context.config = { ...context.config, workspaceMetadata: metadata, workspaceId: metadata.workspaceId }
          }
        }).catch(() => undefined)
      }
    }
  }

  /** A child is listed in the Workspaces tree unless it is in a closed task execution (Task DONE). */
  isListed(agentRunId: string): boolean {
    return this.index.agents.has(agentRunId) && !this.closedSubtrees().has(agentRunKey(agentRunId))
  }

  /** The task rows under the run row: task Agents and task Teams with their members, without closed ones. */
  listTaskRows(isTeamExpanded: (teamRunId: string) => boolean): AgentRunTaskTreeRow[] {
    const hidden = this.closedSubtrees()
    const flat: RunHistoryTransientExecutionRow[] = []
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
    type Node = AgentRunCollaborationViewDto['execution_tree']['taskExecutions'][number]
      | Extract<AgentRunCollaborationViewDto['execution_tree']['taskExecutions'][number], { teamRunId: string }>['members'][number]
    const visit = (node: Node, depth: number): void => {
      if (hidden.has(collaborationTreeWalk.keyOf(node))) return
      if ('agentRunId' in node) { flat.push(agentRow(this.index.requireAgent(node.agentRunId), depth)); return }
      const team = this.index.teams.get(node.teamRunId)!
      const children = [...node.members, ...node.taskExecutions]
        .filter((child) => !hidden.has(collaborationTreeWalk.keyOf(child)))
      flat.push({
        kind: 'transient_execution', transientKind: 'task_team', rowKey: `team:${node.teamRunId}`, teamRunId: this.hostRunId,
        memberAddress: node.address, agentRunId: null, teamRunIdForNode: node.teamRunId, memberKind: 'agent_team',
        displayName: nameAt(node.address), currentStatus: null, delegatedBy: delegatorName(team.delegatorAgentRunId),
        depth, hasChildren: children.length > 0,
      })
      if (isTeamExpanded(node.teamRunId)) children.forEach((child) => visit(child, depth + 1))
    }
    this.rootExecutionNodes().forEach((task) => visit(task as Node, 0))
    const hasSibling = (index: number, depth: number): boolean => {
      for (let next = index + 1; next < flat.length; next += 1) {
        if (flat[next]!.depth < depth) return false
        if (flat[next]!.depth === depth) return true
      }
      return false
    }
    return flat.map((row, index) => Object.freeze({
      row,
      continuingAncestorDepths: Array.from({ length: row.depth }, (_, depth) => depth).filter((depth) => hasSibling(index, depth)),
      hasFollowingSibling: hasSibling(index, row.depth),
    }))
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
      listMessages: () => this.perspective(focusedAgentRunId),
      referenceContentPath: (messageId: string, referenceId: string) =>
        `agent-collaborations/${encodeURIComponent(this.hostRunId)}/communication/messages/${encodeURIComponent(messageId)}/references/${encodeURIComponent(referenceId)}/content`,
    })
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

  private perspective(focusedAgentRunId: string): readonly CollaborationMessagePerspectiveRow[] {
    return this.view.communication_messages.messages.flatMap((message): CollaborationMessagePerspectiveRow[] => {
      const sent = message.senderAgentRunId === focusedAgentRunId
      if (!sent && message.receiverAgentRunId !== focusedAgentRunId) return []
      const counterpartAgentRunId = sent ? message.receiverAgentRunId : message.senderAgentRunId
      return [Object.freeze({
        messageId: message.messageId, senderAgentRunId: message.senderAgentRunId, receiverAgentRunId: message.receiverAgentRunId,
        content: message.content, messageType: message.messageType, createdAt: message.createdAt,
        referenceFiles: Object.freeze(message.referenceFiles.map((filePath) => projectAgentOrgReference(message.messageId, filePath, message.createdAt))),
        direction: sent ? 'sent' : 'received', counterpartAgentRunId, counterpart: this.identityOf(counterpartAgentRunId),
      })]
    }).sort((left, right) => right.createdAt.localeCompare(left.createdAt) || left.messageId.localeCompare(right.messageId))
  }

  private assertMessagesCorrelated(messages: readonly Message[]): void {
    for (const message of messages) {
      if (message.senderAgentRunId === message.receiverAgentRunId
        || !this.index.isParticipant(message.senderAgentRunId) || !this.index.isParticipant(message.receiverAgentRunId)) {
        throw new Error(`Agent collaboration message '${message.messageId}' identity mismatch.`)
      }
    }
  }

  /** Collaborators (hosted by the root) first, then extra copies and other delegated children. */
  private rootExecutionNodes() {
    return [...collaboratorExecutionNodes(this.view.execution_tree.collaborators), ...this.view.execution_tree.taskExecutions]
  }

  private closedSubtrees() {
    return collectClosedSubtrees<CollaborationTreeNode>(this.rootExecutionNodes(), this.view.closed_task_executions, collaborationTreeWalk)
  }

  private commitTree(tree: AgentRunCollaborationViewDto['execution_tree']): void {
    const index = new AgentRunCollaborationIndex(tree)
    this.view = { ...this.view, execution_tree: tree }
    this.index = index
  }
}
