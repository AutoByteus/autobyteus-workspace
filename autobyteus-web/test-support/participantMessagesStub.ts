import type { CollaborationParticipantMessageDto, CollaborationPastParticipantDto, CollaborationRootKind } from '@autobyteus/collaboration-stream-contracts'

/**
 * autobyteus-358: the Team tab loads one participant's messages with `fetchParticipantMessages`. A test serves a
 * root's stored messages through this stub:
 *   vi.mock('~/services/collaborationMessages/participantMessagesQuery',
 *     async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub)
 *   storeParticipantMessages('agent', 'host-run', messages)
 * The agents of delegated runs that left the tree (autobyteus-469) are served with `storePastParticipants`.
 */
const storedByRoot = new Map<string, readonly CollaborationParticipantMessageDto[]>()
const rootKeyOf = (rootKind: CollaborationRootKind, rootRunId: string) => `${rootKind}:${rootRunId}`

const pastByRoot = new Map<string, readonly CollaborationPastParticipantDto[]>()
export const storePastParticipants = (
  rootKind: CollaborationRootKind, rootRunId: string, participants: readonly CollaborationPastParticipantDto[],
): void => { pastByRoot.set(rootKeyOf(rootKind, rootRunId), participants) }

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

export const clearStoredParticipantMessages = (): void => { storedByRoot.clear(); pastByRoot.clear(); outcomeByRoot.clear() }

export const participantMessagesQueryStub = {
  fetchParticipantMessages: async (key: Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string }>) => {
    const outcome = outcomeByRoot.get(rootKeyOf(key.rootKind, key.rootRunId))
    if (outcome === 'hold') return new Promise<never>(() => undefined)
    if (outcome) throw outcome
    const messages = (storedByRoot.get(rootKeyOf(key.rootKind, key.rootRunId)) ?? [])
      .filter((message) => message.senderAgentRunId === key.agentRunId || message.receiverAgentRunId === key.agentRunId)
    return { messages, pastParticipants: [...pastByRoot.get(rootKeyOf(key.rootKind, key.rootRunId)) ?? []] }
  },
}
