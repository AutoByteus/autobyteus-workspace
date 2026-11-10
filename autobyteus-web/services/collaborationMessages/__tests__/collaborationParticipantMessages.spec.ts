import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CollaborationParticipantMessageDto } from '@autobyteus/collaboration-stream-contracts'
import { useCollaborationParticipantMessagesStore } from '../collaborationParticipantMessages'
import { fetchParticipantMessages } from '../participantMessagesQuery'
import { participantMessagesView } from '../participantMessageRows'

// autobyteus-358 (REQ-002, AC-002, DS-002): the Team tab's lists load when shown; live messages are buffered from
// before the request and merged by ID. A rebuild of the root reloads them, abandoning loads in flight, only when a
// message could have been missed (SR-004 … SR-007): a stored view, another live sequence, or a message past the
// sequence C the lists hold every message through.

vi.mock('../participantMessagesQuery', () => ({ fetchParticipantMessages: vi.fn() }))

type Message = CollaborationParticipantMessageDto
const message = (messageId: string, senderAgentRunId: string, receiverAgentRunId: string): Message => ({
  messageId, senderAgentRunId, receiverAgentRunId, content: messageId, messageType: 'agent_message', referenceFiles: [],
  createdAt: `2026-11-01T00:00:0${messageId.at(-1)}.000Z`,
})
/** The query's answer: the participant's messages and the agents of runs that left the tree they name (autobyteus-469). */
const stored = (messages: readonly Message[], pastParticipants: { agentRunId: string; address: string }[] = []) => ({ messages: [...messages], pastParticipants })
const deferred = () => {
  let resolve!: (messages: readonly Message[]) => void
  let reject!: (error: Error) => void
  const promise = new Promise<ReturnType<typeof stored>>((done, fail) => { resolve = (messages) => done(stored(messages)); reject = fail })
  return { promise, resolve, reject }
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const key = { rootKind: 'agent', rootRunId: 'hub', agentRunId: 'host' } as const
const ids = (messages: readonly Message[]) => messages.map((entry) => entry.messageId)
/** A live rebuild: its live sequence, its base, and the sequence of the root's latest message through the base. */
const live = (liveSequenceId: string, baseChangeSequence: number, lastMessageChangeSequence = 0) =>
  ({ liveSequenceId, baseChangeSequence, lastMessageChangeSequence })
const STORED = { liveSequenceId: null, baseChangeSequence: 0, lastMessageChangeSequence: null }

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

  it('reloads loaded lists on a rebuild after a load whose latest message is past C (a gap reopen), so the missed message is shown', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4))
    owner.load(key)
    await settle()
    owner.advance('agent', 'hub', 'X', 5)
    const reload = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(reload.promise)

    owner.reloadRoot('agent', 'hub', live('X', 7, 6))
    // The loaded messages stay shown while the list loads again.
    expect(owner.statusOf(key).state).toBe('loading')
    expect(ids(owner.messagesOf(key))).toEqual(['m1'])
    owner.append('agent', 'hub', message('m3', 'copy', 'host'))
    reload.resolve([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')])
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2', 'm3'])
  })

  it('abandons a load in flight on a rebuild during the load with a message past C (a gap reopen): only the reloaded list is kept', async () => {
    const stale = deferred()
    const fresh = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise)
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4))
    owner.load(key)
    owner.reloadRoot('agent', 'hub', live('X', 6, 5))
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

  it('keeps the list and its load in flight from an inspection to the attach that follows at the same sequence', async () => {
    const request = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(request.promise)
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4))
    owner.load(key)
    owner.reloadRoot('agent', 'hub', live('X', 4))
    request.resolve([message('m1', 'host', 'copy')])
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    expect(owner.statusOf(key).state).toBe('loaded')
    expect(ids(owner.messagesOf(key))).toEqual(['m1'])
  })

  it('keeps the list on a checkpoint reconnect whose base is the checkpoint event it saw (a new child, a Save)', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4))
    owner.load(key)
    await settle()
    owner.append('agent', 'hub', message('m2', 'copy', 'host'))
    owner.advance('agent', 'hub', 'X', 5)
    // The single `checkpoint_required` event at 6 was seen; the reconnect's snapshot is based on it.
    owner.advance('agent', 'hub', 'X', 6)
    owner.reloadRoot('agent', 'hub', live('X', 6))

    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    expect(owner.statusOf(key).state).toBe('loaded')
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2'])
    // A message in the reconnect window moves the base past what the lists saw: they load again.
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host'), message('m3', 'host', 'copy')]))
    owner.advance('agent', 'hub', 'X', 7)
    owner.reloadRoot('agent', 'hub', live('X', 8, 8))
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2', 'm3'])
  })

  it('keeps the lists when the base moved without a message past C (a new copy\'s output before a reconnect, L-002); C becomes the base', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4, 3))
    owner.load(key)
    await settle()
    owner.advance('agent', 'hub', 'X', 5)
    // The new copy published 15 presentation events before the snapshot: the base moved, the latest message did not.
    owner.reloadRoot('agent', 'hub', live('X', 20, 3))
    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    expect(owner.statusOf(key).state).toBe('loaded')
    // The lists now hold every message through 20: a message at 21 missed before the next snapshot reloads them.
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')]))
    owner.reloadRoot('agent', 'hub', live('X', 22, 21))
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2'])
  })

  it('reloads on every rebuild from a stored view, which names no live sequence', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValue(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', STORED)
    owner.load(key)
    await settle()
    owner.reloadRoot('agent', 'hub', STORED)
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(owner.statusOf(key).state).toBe('loaded')
  })

  it('reloads after a stop and resume, so a message the resumed root produced before the attach is shown', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 9))
    owner.load(key)
    await settle()
    // Stopped: the stored view; resumed: another publisher, which produced m2 (its sequence 1) before the attach.
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    owner.reloadRoot('agent', 'hub', STORED)
    await settle()
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')]))
    owner.reloadRoot('agent', 'hub', live('Y', 1, 1))
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(3)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2'])
  })

  it('reloads on a reconnect to another publisher (a server restart) although its base is at or below the old C', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4))
    owner.load(key)
    await settle()
    owner.advance('agent', 'hub', 'X', 500)
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')]))
    owner.reloadRoot('agent', 'hub', live('Y', 3))
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2'])
    // An event of the old publisher's stream does not move the new sequence.
    owner.advance('agent', 'hub', 'X', 900)
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')]))
    owner.reloadRoot('agent', 'hub', live('Y', 4, 4))
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(3)
  })

  it('keeps the reason of a failed load and tries again when asked', async () => {
    vi.mocked(fetchParticipantMessages).mockRejectedValueOnce(new Error("Message 'm9' must use distinct AgentRun endpoints."))
    const owner = useCollaborationParticipantMessagesStore()
    owner.load(key)
    await settle()
    expect(owner.statusOf(key)).toEqual({ state: 'error', error: "Message 'm9' must use distinct AgentRun endpoints." })
    expect(owner.messagesOf(key)).toEqual([])

    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    owner.load(key)
    await settle()
    expect(owner.statusOf(key).state).toBe('loaded')
    expect(ids(owner.messagesOf(key))).toEqual(['m1'])
  })

  it('drops a released root and ignores its load in flight', async () => {
    const request = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(request.promise)
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4))
    owner.load(key)
    owner.releaseRoot('agent', 'hub')
    request.resolve([message('m1', 'host', 'copy')])
    await settle()
    expect(owner.statusOf(key)).toEqual({ state: 'idle', error: null })
    expect(owner.messagesOf(key)).toEqual([])
    // Its live sequence went with it: the next context of the root loads its lists again.
    vi.mocked(fetchParticipantMessages).mockResolvedValue(stored([message('m1', 'host', 'copy')]))
    owner.load(key)
    await settle()
    owner.reloadRoot('agent', 'hub', live('X', 4))
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(3)
  })

  it('keeps the agents of runs that left the tree with the list, and names such a counterpart from its address (autobyteus-469 D-5, AC-011)', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'closed-run'), message('m2', 'copy', 'host')],
      [{ agentRunId: 'closed-run', address: '/solution_designer' }]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.load(key)
    await settle()
    expect(owner.pastParticipantsOf(key)).toEqual([{ agentRunId: 'closed-run', address: '/solution_designer' }])
    const rows = participantMessagesView({ key, isRemote: false,
      identityOf: (agentRunId) => agentRunId === 'copy' ? { kind: 'configured', address: '/copy', label: 'copy' } : null }).listMessages()
    expect(rows.map((row) => [row.messageId, row.counterpart])).toEqual([
      ['m2', { kind: 'configured', address: '/copy', label: 'copy' }],
      ['m1', { kind: 'past', address: '/solution_designer', label: 'solution designer' }],
    ])
    // A root that drops its lists drops them too.
    owner.releaseRoot('agent', 'hub')
    expect(owner.pastParticipantsOf(key)).toEqual([])
  })
})
