import {
  COLLABORATION_PARTICIPANT_MESSAGES_PAGE_SIZE,
  type CollaborationCounterpartDto,
  type CollaborationParticipantMessageDto,
  type CollaborationParticipantMessagesCursor,
  type CollaborationParticipantMessagesDto,
  type CollaborationRootKind,
} from '@autobyteus/collaboration-stream-contracts'

/**
 * autobyteus-358, autobyteus-565: the Team and Messages tabs load one participant's messages with
 * `fetchParticipantMessages`, a page at a time. A test serves a root's stored messages through this stub:
 *   vi.mock('~/services/collaborationMessages/participantMessagesQuery',
 *     async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub)
 *   storeParticipantMessages('agent', 'host-run', messages)
 * It answers as the server does: the participant's messages newest first (then by ID), 50 after the cursor, whether
 * more follow, and the stored counterparts of the page's other agents. The agents of delegated runs that left the tree
 * (autobyteus-469) are served with `storePastParticipants`; other runs' and other nodes' agents with `storeCounterparts`.
 */
const storedByRoot = new Map<string, readonly CollaborationParticipantMessageDto[]>()
const rootKeyOf = (rootKind: CollaborationRootKind, rootRunId: string) => `${rootKind}:${rootRunId}`

const counterpartsByRoot = new Map<string, readonly CollaborationCounterpartDto[]>()
export const storeCounterparts = (
  rootKind: CollaborationRootKind, rootRunId: string, counterparts: readonly CollaborationCounterpartDto[],
): void => { counterpartsByRoot.set(rootKeyOf(rootKind, rootRunId), counterparts) }
export const storePastParticipants = (
  rootKind: CollaborationRootKind, rootRunId: string, participants: readonly Readonly<{ agentRunId: string; address: string }>[],
): void => storeCounterparts(rootKind, rootRunId, participants.map((participant) => ({ kind: 'past' as const, ...participant })))

export const storeParticipantMessages = (
  rootKind: CollaborationRootKind, rootRunId: string, messages: readonly CollaborationParticipantMessageDto[],
): void => { storedByRoot.set(rootKeyOf(rootKind, rootRunId), messages) }

/** The root's loads stay pending (`'hold'`) or fail with the server's reason (`Error`), until cleared. */
const outcomeByRoot = new Map<string, 'hold' | Error>()
export const holdParticipantMessages = (rootKind: CollaborationRootKind, rootRunId: string): void => {
  outcomeByRoot.set(rootKeyOf(rootKind, rootRunId), 'hold')
}
export const failParticipantMessages = (rootKind: CollaborationRootKind, rootRunId: string, reason: string): void => {
  outcomeByRoot.set(rootKeyOf(rootKind, rootRunId), new Error(reason))
}
export const releaseParticipantMessages = (rootKind: CollaborationRootKind, rootRunId: string): void => {
  outcomeByRoot.delete(rootKeyOf(rootKind, rootRunId))
}

export const clearStoredParticipantMessages = (): void => { storedByRoot.clear(); counterpartsByRoot.clear(); outcomeByRoot.clear() }

const order = (left: CollaborationParticipantMessagesCursor, right: CollaborationParticipantMessagesCursor): number =>
  right.createdAt.localeCompare(left.createdAt) || left.messageId.localeCompare(right.messageId)

export const participantMessagesQueryStub = {
  fetchParticipantMessages: async (key: Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string }>,
    before: CollaborationParticipantMessagesCursor | null = null): Promise<CollaborationParticipantMessagesDto> => {
    const rootKey = rootKeyOf(key.rootKind, key.rootRunId)
    const outcome = outcomeByRoot.get(rootKey)
    if (outcome === 'hold') return new Promise<never>(() => undefined)
    if (outcome) throw outcome
    const listed = (storedByRoot.get(rootKey) ?? [])
      .filter((message) => message.senderAgentRunId === key.agentRunId || message.receiverAgentRunId === key.agentRunId)
      .sort(order)
    const after = before ? listed.filter((message) => order(before, message) < 0) : listed
    const messages = after.slice(0, COLLABORATION_PARTICIPANT_MESSAGES_PAGE_SIZE)
    const others = new Set(messages.map((message) => message.senderAgentRunId === key.agentRunId ? message.receiverAgentRunId : message.senderAgentRunId))
    return { messages, counterparts: (counterpartsByRoot.get(rootKey) ?? []).filter((counterpart) => others.has(counterpart.agentRunId)),
      hasMore: after.length > messages.length }
  },
}
