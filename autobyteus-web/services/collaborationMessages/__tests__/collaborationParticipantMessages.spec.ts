import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CollaborationParticipantMessageDto } from '@autobyteus/collaboration-stream-contracts'
import { useCollaborationParticipantMessagesStore } from '../collaborationParticipantMessages'
import { fetchParticipantMessages } from '../participantMessagesQuery'

// autobyteus-358 (REQ-002, AC-002, DS-002): the Team tab's lists load when shown; live messages are buffered from
// before the request and merged by ID; every rebuild of the root reloads them and abandons loads in flight.

vi.mock('../participantMessagesQuery', () => ({ fetchParticipantMessages: vi.fn() }))

type Message = CollaborationParticipantMessageDto
const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string): Message => ({
  messageId, senderAgentRunId, receiverAgentRunId, content: messageId, messageType: 'agent_message', referenceFiles: [],
  createdAt: `2026-11-01T00:00:0${messageId.at(-1)}.000Z`,
})
const deferred = () => {
  let resolve!: (messages: readonly Message[]) => void
  let reject!: (error: Error) => void
  const promise = new Promise<readonly Message[]>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const key = { rootKind: 'agent', rootRunId: 'hub', agentRunId: 'host' } as const
const ids = (messages: readonly Message[]) => messages.map((entry) => entry.messageId)

describe('CollaborationParticipantMessages', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchParticipantMessages).mockReset()
  })

  it('loads a participant once, keeps a live message that arrives during the load, and adds later ones once', async () => {
    const request = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(request.promise)
    const owner = useCollaborationParticipantMessagesStore()
    expect(owner.statusOf(key)).toEqual({ state: 'idle', error: null })

    owner.load(key)
    owner.load(key)
    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    expect(fetchParticipantMessages).toHaveBeenCalledWith(key)
    expect(owner.statusOf(key).state).toBe('loading')
    // During the load: one live message the stored list already holds, one it does not, and one for others only.
    owner.append('agent', 'hub', message('m2', 'copy', 'host'))
    owner.append('agent', 'hub', message('m3', 'host', 'copy'))
    owner.append('agent', 'hub', message('m9', 'copy', 'other-copy'))
    request.resolve([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')])
    await settle()

    expect(owner.statusOf(key)).toEqual({ state: 'loaded', error: null })
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2', 'm3'])
    owner.append('agent', 'hub', message('m4', 'copy', 'host'))
    owner.append('agent', 'hub', message('m4', 'copy', 'host'))
    owner.append('agent_org', 'hub', message('m5', 'copy', 'host'))
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2', 'm3', 'm4'])
    owner.load(key)
    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
  })

  it('reloads loaded lists on a rebuild after a load (a gap reopen), so a message missed in the gap is shown', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce([message('m1', 'host', 'copy')])
    const owner = useCollaborationParticipantMessagesStore()
    owner.load(key)
    await settle()
    const reload = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(reload.promise)

    owner.reloadRoot('agent', 'hub')
    // The loaded messages stay shown while the list loads again.
    expect(owner.statusOf(key).state).toBe('loading')
    expect(ids(owner.messagesOf(key))).toEqual(['m1'])
    owner.append('agent', 'hub', message('m3', 'copy', 'host'))
    reload.resolve([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')])
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2', 'm3'])
  })

  it('abandons a load in flight on a rebuild during the load (a gap reopen): only the reloaded list is kept', async () => {
    const stale = deferred()
    const fresh = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise)
    const owner = useCollaborationParticipantMessagesStore()
    owner.load(key)
    owner.reloadRoot('agent', 'hub')
    owner.append('agent', 'hub', message('m3', 'copy', 'host'))

    stale.resolve([message('m1', 'host', 'copy')])
    await settle()
    expect(owner.statusOf(key).state).toBe('loading')
    fresh.resolve([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')])
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(owner.statusOf(key).state).toBe('loaded')
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2', 'm3'])
  })

  it('keeps the reason of a failed load and tries again when asked', async () => {
    vi.mocked(fetchParticipantMessages).mockRejectedValueOnce(new Error("Message 'm9' must use distinct AgentRun endpoints."))
    const owner = useCollaborationParticipantMessagesStore()
    owner.load(key)
    await settle()
    expect(owner.statusOf(key)).toEqual({ state: 'error', error: "Message 'm9' must use distinct AgentRun endpoints." })
    expect(owner.messagesOf(key)).toEqual([])

    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce([message('m1', 'host', 'copy')])
    owner.load(key)
    await settle()
    expect(owner.statusOf(key).state).toBe('loaded')
    expect(ids(owner.messagesOf(key))).toEqual(['m1'])
  })

  it('drops a released root and ignores its load in flight', async () => {
    const request = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(request.promise)
    const owner = useCollaborationParticipantMessagesStore()
    owner.load(key)
    owner.releaseRoot('agent', 'hub')
    request.resolve([message('m1', 'host', 'copy')])
    await settle()
    expect(owner.statusOf(key)).toEqual({ state: 'idle', error: null })
    expect(owner.messagesOf(key)).toEqual([])
  })
})
