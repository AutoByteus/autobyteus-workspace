import { memberTitleName } from '~/utils/collaboration/memberDisplayName'
import type {
  AgentOrgCommunicationMessageDto,
  AgentRunCollaborationEventDto,
  AgentRunCollaborationViewDto,
  RunTreeRowDto,
} from '@autobyteus/collaboration-stream-contracts'
import type {
  CollaborationMessageMemberIdentity,
  CollaborationMessagesContextView,
} from '~/types/workspace/collaborationMessagesContextView'
import { advanceSequencedStream } from '~/services/agentStreaming/sequencedStreamRange'
import { useCollaborationParticipantMessagesStore, type ParticipantMessagesKey } from '~/services/collaborationMessages/collaborationParticipantMessages'
import { useRunTreeStore } from '~/stores/runTreeStore'
import { participantMessagesView } from '~/services/collaborationMessages/participantMessageRows'
import { delegatedRunMessagesKey } from '~/services/delegatedRuns/delegatedRunSubjects'
import { delegatedSubjectOfRow, treeAgentIdentity, treeRowOfAgent } from '~/utils/runTree/runTreeAgents'
import { isTeamRow } from '~/utils/runTree/runTreeDisplayRows'

export type AgentRunCollaborationPhase = 'live' | 'historical' | 'reopen_required'
export type AgentRunCollaborationEventApplication = 'applied'

/**
 * The client view of one standalone run's collaboration root (autobyteus-461 SR-084): its host, its Messages tab
 * (autobyteus-565: every message its agent sent or received) and its tree's changes. The host presents on its own Agent stream, and each run it delegated on its own (rule 2; a
 * peer's run through `/ws/peer-run`). Who is under the run is its tree's rows (`runTreeStore`), and only them.
 */
export class AgentRunCollaborationContext {
  readonly runId: string
  view: AgentRunCollaborationViewDto
  phase: AgentRunCollaborationPhase
  error: string | null = null
  private nextChangeSequence: number

  constructor(input: Readonly<{ runId: string; view: AgentRunCollaborationViewDto }>) {
    this.runId = input.runId
    if (input.view.execution_tree.agent.agentRunId !== input.runId) {
      throw new Error(`Agent collaboration view correlation mismatch for '${input.runId}'.`)
    }
    this.view = structuredClone(input.view)
    this.nextChangeSequence = input.view.base_change_sequence + 1
    // A streamed view (it has a live sequence) takes events whether or not the run's own agent runs (SR-045).
    this.phase = input.view.live_sequence_id !== null ? 'live' : 'historical'
  }

  get isActive(): boolean { return this.view.is_active }
  get changeSequence(): number { return this.nextChangeSequence - 1 }

  /** The rows under the run, as its tree has them now. */
  private treeRows(): readonly RunTreeRowDto[] {
    return useRunTreeStore().rowsOf({ kind: 'agent', runId: this.runId })
  }

  /** The view holds this agent: the host, or an agent of a run in its tree (the Messages tab names it from there). */
  holdsAgent(agentRunId: string): boolean {
    return agentRunId === this.runId || treeRowOfAgent(this.treeRows(), agentRunId) !== null
  }

  /** Applies one root event. */
  applyEvent(changeSequence: number, event: AgentRunCollaborationEventDto): AgentRunCollaborationEventApplication {
    if (this.phase !== 'live') throw new Error('Agent collaboration context is not accepting stream events.')
    const following = advanceSequencedStream(this.nextChangeSequence, { first: changeSequence, through: changeSequence })
    if (following === null) {
      this.requireReopen(`Agent collaboration change sequence gap: expected ${this.nextChangeSequence}, received ${changeSequence}.`)
      throw new Error(this.error!)
    }
    if (event.kind === 'run_tree_changed') {
      // The run's tree (SR-084): numbered in the view's sequence, applied to the rows its tree snapshot gave.
      useRunTreeStore().streamChange({ kind: 'agent', runId: this.runId }, event)
      // Its Team tab still names an agent that left the tree (its Task closed): from the server's answer.
      if (event.removed.length) useCollaborationParticipantMessagesStore().reloadNamingUnknown('agent', this.runId, (id) => this.holdsAgent(id))
    } else {
      // The Messages tab's lists own the messages (autobyteus-358); the view holds none. The parties name an agent the
      // run's own list does not know yet: another run's, or another node's (autobyteus-565).
      this.assertMessageCorrelated(event.message)
      useCollaborationParticipantMessagesStore().append('agent', this.runId, event.message, event.parties)
    }
    this.nextChangeSequence = following
    return 'applied'
  }

  /** The run's own agent started or stopped (SR-045): the runs it delegated are runs of their own and keep their states. */
  setActive(active: boolean): void {
    if (this.view.is_active !== active) this.view = { ...this.view, is_active: active }
  }

  requireReopen(message: string): void {
    this.error = message
    this.phase = 'reopen_required'
  }

  /**
   * The Messages tab, seen from one participant: the host, or an agent of a run in its tree. A delegated run's messages are in
   * its own run's log (rule 2); a peer's run keeps its messages on its node (AR-004).
   */
  messagesView(focusedAgentRunId: string): CollaborationMessagesContextView {
    const row = focusedAgentRunId === this.runId ? null : treeRowOfAgent(this.treeRows(), focusedAgentRunId)
    const focusedMemberAddress = row ? row.address : focusedAgentRunId === this.runId ? this.view.execution_tree.agent.address : null
    if (!focusedMemberAddress) throw new Error(`AgentRun '${focusedAgentRunId}' is not in this run.`)
    const subject = row ? delegatedSubjectOfRow(row, this.runId) : null
    const key: ParticipantMessagesKey = subject ? delegatedRunMessagesKey(subject)
      : Object.freeze({ rootKind: 'agent', rootRunId: this.runId, agentRunId: focusedAgentRunId })
    return Object.freeze({
      rootKind: 'agent', rootRunId: this.runId, focusedAgentRunId, focusedMemberAddress,
      memberIdentityByAgentRunId: () => Object.freeze(Object.fromEntries([this.runId,
        ...this.treeRows().flatMap((candidate) => candidate.openTarget && !isTeamRow(candidate) ? [candidate.openTarget.agentRunId] : [])]
        .flatMap((agentRunId) => { const identity = this.identityOf(agentRunId); return identity ? [[agentRunId, identity]] : [] }))),
      ...participantMessagesView({ key, isRemote: Boolean(row?.peer), identityOf: (agentRunId) => this.identityOf(agentRunId) }),
    })
  }

  /**
   * Who a participant is: the run's own agent reads as its name ("Research Assistant", VIS-013); an agent of a run in its
   * tree in the shared lowercase row format (VIS-004/009/012), with the run it belongs to; null when the tree has none.
   */
  private identityOf(agentRunId: string): CollaborationMessageMemberIdentity | null {
    if (agentRunId === this.runId) {
      const address = this.view.execution_tree.agent.address
      return Object.freeze({ kind: 'configured', address, label: memberTitleName(address) })
    }
    return treeAgentIdentity(this.treeRows(), agentRunId, this.runId)
  }

  private assertMessageCorrelated(message: AgentOrgCommunicationMessageDto): void {
    if (message.senderAgentRunId === message.receiverAgentRunId) {
      throw new Error(`Agent collaboration message '${message.messageId}' identity mismatch.`)
    }
  }
}
