import type { CollaborationParticipantMessageDto, CollaborationRootKind } from '@autobyteus/collaboration-stream-contracts'

/**
 * autobyteus-358: the Team tab loads one participant's messages with `fetchParticipantMessages`. A test serves a
 * root's stored messages through this stub:
 *   vi.mock('~/services/collaborationMessages/participantMessagesQuery',
 *     async () => (await import('~/test-support/participantMessagesStub')).participantMessagesQueryStub)
 *   storeParticipantMessages('agent', 'host-run', messages)
 */
const storedByRoot = new Map<string, readonly CollaborationParticipantMessageDto[]>()
const rootKeyOf = (rootKind: CollaborationRootKind, rootRunId: string) => `${rootKind}:${rootRunId}`

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

export const clearStoredParticipantMessages = (): void => { storedByRoot.clear(); outcomeByRoot.clear() }

export const participantMessagesQueryStub = {
  fetchParticipantMessages: async (key: Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string }>) => {
    const outcome = outcomeByRoot.get(rootKeyOf(key.rootKind, key.rootRunId))
    if (outcome === 'hold') return new Promise<never>(() => undefined)
    if (outcome) throw outcome
    return (storedByRoot.get(rootKeyOf(key.rootKind, key.rootRunId)) ?? [])
      .filter((message) => message.senderAgentRunId === key.agentRunId || message.receiverAgentRunId === key.agentRunId)
  },
}
