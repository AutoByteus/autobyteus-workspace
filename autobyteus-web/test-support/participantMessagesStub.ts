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

export const clearStoredParticipantMessages = (): void => { storedByRoot.clear() }

export const participantMessagesQueryStub = {
  fetchParticipantMessages: async (key: Readonly<{ rootKind: CollaborationRootKind; rootRunId: string; agentRunId: string }>) =>
    (storedByRoot.get(rootKeyOf(key.rootKind, key.rootRunId)) ?? [])
      .filter((message) => message.senderAgentRunId === key.agentRunId || message.receiverAgentRunId === key.agentRunId),
}
