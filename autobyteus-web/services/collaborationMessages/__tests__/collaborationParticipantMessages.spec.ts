import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CollaborationCounterpartDto, CollaborationParticipantMessageDto } from '@autobyteus/collaboration-stream-contracts'
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
/**
 * The query's answer, one page: the participant's messages and the agents of runs that left the tree they name
 * (autobyteus-469; counterparts of kind `past` since autobyteus-565), with nothing older.
 */
const stored = (messages: readonly Message[], pastParticipants: { agentRunId: string; address: string }[] = []) =>
  ({ messages: [...messages], counterparts: pastParticipants.map((participant) => ({ kind: 'past' as const, ...participant })), hasMore: false })
const past = (agentRunId: string, address: string) => ({ kind: 'past' as const, agentRunId, address })
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
    expect(fetchParticipantMessages).toHaveBeenCalledWith(key, null)
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
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
    owner.load(key)
    await settle()
    owner.advance('agent', 'hub', 'X', 5)
    const reload = deferred()
    vi.mocked(fetchParticipantMessages).mockReturnValueOnce(reload.promise)

    owner.reloadRoot('agent', 'hub', live('X', 7, 6), () => true)
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
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
    owner.load(key)
    owner.reloadRoot('agent', 'hub', live('X', 6, 5), () => true)
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
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
    owner.load(key)
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
    request.resolve([message('m1', 'host', 'copy')])
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    expect(owner.statusOf(key).state).toBe('loaded')
    expect(ids(owner.messagesOf(key))).toEqual(['m1'])
  })

  it('keeps the list on a checkpoint reconnect whose base is the checkpoint event it saw (a new child, a Save)', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
    owner.load(key)
    await settle()
    owner.append('agent', 'hub', message('m2', 'copy', 'host'))
    owner.advance('agent', 'hub', 'X', 5)
    // The single `checkpoint_required` event at 6 was seen; the reconnect's snapshot is based on it.
    owner.advance('agent', 'hub', 'X', 6)
    owner.reloadRoot('agent', 'hub', live('X', 6), () => true)

    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    expect(owner.statusOf(key).state).toBe('loaded')
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2'])
    // A message in the reconnect window moves the base past what the lists saw: they load again.
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host'), message('m3', 'host', 'copy')]))
    owner.advance('agent', 'hub', 'X', 7)
    owner.reloadRoot('agent', 'hub', live('X', 8, 8), () => true)
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2', 'm3'])
  })

  it('keeps the lists when the base moved without a message past C (a new copy\'s output before a reconnect, L-002); C becomes the base', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4, 3), () => true)
    owner.load(key)
    await settle()
    owner.advance('agent', 'hub', 'X', 5)
    // The new copy published 15 presentation events before the snapshot: the base moved, the latest message did not.
    owner.reloadRoot('agent', 'hub', live('X', 20, 3), () => true)
    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    expect(owner.statusOf(key).state).toBe('loaded')
    // The lists now hold every message through 20: a message at 21 missed before the next snapshot reloads them.
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')]))
    owner.reloadRoot('agent', 'hub', live('X', 22, 21), () => true)
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2'])
  })

  it('reloads on every rebuild from a stored view, which names no live sequence', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValue(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', STORED, () => true)
    owner.load(key)
    await settle()
    owner.reloadRoot('agent', 'hub', STORED, () => true)
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(owner.statusOf(key).state).toBe('loaded')
  })

  it('reloads after a stop and resume, so a message the resumed root produced before the attach is shown', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 9), () => true)
    owner.load(key)
    await settle()
    // Stopped: the stored view; resumed: another publisher, which produced m2 (its sequence 1) before the attach.
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    owner.reloadRoot('agent', 'hub', STORED, () => true)
    await settle()
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')]))
    owner.reloadRoot('agent', 'hub', live('Y', 1, 1), () => true)
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(3)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2'])
  })

  it('reloads on a reconnect to another publisher (a server restart) although its base is at or below the old C', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
    owner.load(key)
    await settle()
    owner.advance('agent', 'hub', 'X', 500)
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')]))
    owner.reloadRoot('agent', 'hub', live('Y', 3), () => true)
    await settle()

    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1', 'm2'])
    // An event of the old publisher's stream does not move the new sequence.
    owner.advance('agent', 'hub', 'X', 900)
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'copy'), message('m2', 'copy', 'host')]))
    owner.reloadRoot('agent', 'hub', live('Y', 4, 4), () => true)
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
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
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
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(3)
  })

  it('keeps the agents of runs that left the tree with the list, and names such a counterpart from its address (autobyteus-469 D-5, AC-011)', async () => {
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'closed-run'), message('m2', 'copy', 'host')],
      [{ agentRunId: 'closed-run', address: '/solution_designer' }]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.load(key)
    await settle()
    expect(owner.counterpartsOf(key)).toEqual([past('closed-run', '/solution_designer')])
    const rows = participantMessagesView({ key, isRemote: false,
      identityOf: (agentRunId) => agentRunId === 'copy' ? { kind: 'configured', address: '/copy', label: 'copy' } : null }).listMessages()
    expect(rows.map((row) => [row.messageId, row.counterpart])).toEqual([
      ['m2', { kind: 'configured', address: '/copy', label: 'copy' }],
      ['m1', { kind: 'past', address: '/solution_designer', label: 'solution designer' }],
    ])
    // A root that drops its lists drops them too.
    owner.releaseRoot('agent', 'hub')
    expect(owner.counterpartsOf(key)).toEqual([])
  })

  it('autobyteus-461 SR-084: a tree change that removes an agent re-fetches a list naming it, so it stays named (AC-011); others are not asked', async () => {
    vi.mocked(fetchParticipantMessages)
      .mockResolvedValueOnce(stored([message('m1', 'host', 'closed-run')]))
      .mockResolvedValueOnce(stored([message('m1', 'host', 'closed-run')], [{ agentRunId: 'closed-run', address: '/release_notes_writer' }]))
    const store = useCollaborationParticipantMessagesStore()
    let holds = true
    const view = participantMessagesView({ key, isRemote: false,
      identityOf: (agentRunId) => holds && agentRunId === 'closed-run' ? { kind: 'member', address: '/release_notes_writer', label: 'release notes writer' } as never : null })
    view.loadMessages()
    await settle()
    expect(view.listMessages().map((row) => row.messageId)).toEqual(['m1'])
    // Its Task closed: the run left the tree (no view rebuild), and its row is named from the server's answer.
    holds = false
    store.reloadNamingUnknown('agent', 'hub', () => false)
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(view.listMessages()).toMatchObject([{ messageId: 'm1', counterpart: { kind: 'past', address: '/release_notes_writer' } }])
    // A list that names only agents the view holds is not asked again.
    store.reloadNamingUnknown('agent', 'hub', () => true)
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
  })

  it('re-fetches a kept list when the rebuilt view no longer holds an agent it names, so that agent is named again (autobyteus-469 CR-002)', async () => {
    // Loaded while the worker was in the tree: the server named no past participant.
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'worker')]))
    const owner = useCollaborationParticipantMessagesStore()
    owner.reloadRoot('agent', 'hub', live('X', 4), () => true)
    owner.load(key)
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    // A rebuild in the same live sequence that missed no message, while the view still holds the worker: kept.
    owner.reloadRoot('agent', 'hub', live('X', 5, 4), () => true)
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledOnce()
    // The worker's Task closed and the rebuilt view no longer holds it: the list loads again, keeping its rows meanwhile.
    vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(stored([message('m1', 'host', 'worker')], [{ agentRunId: 'worker', address: '/worker' }]))
    owner.reloadRoot('agent', 'hub', live('X', 6, 4), (agentRunId) => agentRunId === 'host')
    expect(ids(owner.messagesOf(key))).toEqual(['m1'])
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    expect(ids(owner.messagesOf(key))).toEqual(['m1'])
    expect(owner.counterpartsOf(key)).toEqual([past('worker', '/worker')])
    // Named now by its past participant: a later such rebuild keeps the list.
    owner.reloadRoot('agent', 'hub', live('X', 7, 4), (agentRunId) => agentRunId === 'host')
    await settle()
    expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
  })

  describe('autobyteus-565: a page at a time, and a standalone run\'s own list (DS-001, REQ-002, REQ-005)', () => {
    const own = { rootKind: 'agent', rootRunId: 'pm', agentRunId: 'pm' } as const
    const at = (messageId: string, second: number, sender = 'pm', receiver = 'other-pm'): Message => ({ ...message(messageId, sender, receiver),
      createdAt: new Date(Date.UTC(2026, 10, 1, 0, 0, second)).toISOString() })
    const page = (messages: readonly Message[], hasMore: boolean, counterparts: readonly CollaborationCounterpartDto[] = []) => ({ messages: [...messages], counterparts: [...counterparts], hasMore })
    const party = (agentRunId: string, address: string | null, nodeName: string | null = null) => ({ agentRunId, address, nodeName })

    it('loads the next older page after the last loaded message, adds it by ID, and stops when nothing older follows', async () => {
      vi.mocked(fetchParticipantMessages)
        .mockResolvedValueOnce(page([at('m4', 4), at('m3', 3)], true, [{ kind: 'run', agentRunId: 'other-pm', address: '/project_task_manager' }]))
        .mockResolvedValueOnce(page([at('m2', 2), at('m1', 1, 'linux-pm', 'pm')], false,
          [{ kind: 'run', agentRunId: 'other-pm', address: '/stale' }, { kind: 'remote', agentRunId: 'linux-pm', address: null, nodeName: 'ryan-ai-linux' }]))
      const owner = useCollaborationParticipantMessagesStore()
      owner.load(own)
      await settle()
      expect(owner.hasMoreOf(own)).toBe(true)
      owner.loadMore(own)
      owner.loadMore(own)
      expect(owner.moreStatusOf(own)).toEqual({ state: 'loading', error: null })
      // A live message while the older page loads is kept.
      owner.append('agent', 'pm', at('m5', 5))
      await settle()
      expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
      expect(fetchParticipantMessages).toHaveBeenLastCalledWith(own, { createdAt: at('m3', 3).createdAt, messageId: 'm3' })
      expect(ids(owner.messagesOf(own)).sort()).toEqual(['m1', 'm2', 'm3', 'm4', 'm5'])
      expect(owner.hasMoreOf(own)).toBe(false)
      expect(owner.moreStatusOf(own)).toEqual({ state: 'idle', error: null })
      // The first page's name of an agent stays; the older page adds the ones it names.
      expect(owner.counterpartsOf(own)).toEqual([{ kind: 'run', agentRunId: 'other-pm', address: '/project_task_manager' },
        { kind: 'remote', agentRunId: 'linux-pm', address: null, nodeName: 'ryan-ai-linux' }])
      owner.loadMore(own)
      expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
    })

    it('keeps the loaded messages and the reason when an older page fails, and tries again when asked; a reload drops an answer in flight', async () => {
      vi.mocked(fetchParticipantMessages)
        .mockResolvedValueOnce(page([at('m4', 4)], true))
        .mockRejectedValueOnce(new Error('log unreadable'))
      const owner = useCollaborationParticipantMessagesStore()
      owner.reloadRoot('agent', 'pm', live('X', 1), () => true)
      owner.load(own)
      await settle()
      owner.loadMore(own)
      await settle()
      expect(owner.moreStatusOf(own)).toEqual({ state: 'error', error: 'log unreadable' })
      expect(ids(owner.messagesOf(own))).toEqual(['m4'])
      const older = deferred()
      vi.mocked(fetchParticipantMessages).mockReturnValueOnce(older.promise).mockResolvedValueOnce(page([at('m6', 6), at('m4', 4)], true))
      owner.loadMore(own)
      // The root reloads (another live sequence) meanwhile: its newest page only; the older answer is dropped.
      owner.reloadRoot('agent', 'pm', live('Y', 1), () => true)
      older.resolve([at('m3', 3)])
      await settle()
      expect(ids(owner.messagesOf(own))).toEqual(['m6', 'm4'])
      expect(owner.hasMoreOf(own)).toBe(true)
      expect(owner.moreStatusOf(own)).toEqual({ state: 'idle', error: null })
    })

    it('names the other agent of a live message to the own list from its parties: another run\'s by its address, another node\'s with its node', async () => {
      const load = deferred()
      vi.mocked(fetchParticipantMessages).mockReturnValueOnce(load.promise)
      const owner = useCollaborationParticipantMessagesStore()
      owner.load(own)
      // During the load: kept with its parties.
      owner.append('agent', 'pm', at('m1', 1, 'linux-pm', 'pm'), { sender: party('linux-pm', '/project_task_manager', 'ryan-ai-linux'), receiver: party('pm', '/pm') })
      load.resolve([])
      await settle()
      owner.append('agent', 'pm', at('m2', 2, 'pm', 'other-pm'), { sender: party('pm', '/pm'), receiver: party('other-pm', '/project_task_manager') })
      const rows = participantMessagesView({ key: own, isRemote: false,
        identityOf: (agentRunId) => agentRunId === 'pm' ? { kind: 'configured', address: '/pm', label: 'PM' } : null }).listMessages()
      expect(rows.map((row) => [row.messageId, row.direction, row.counterpart])).toEqual([
        ['m2', 'sent', { kind: 'run', address: '/project_task_manager', label: 'project task manager' }],
        ['m1', 'received', { kind: 'remote', address: '/project_task_manager', label: 'project task manager', nodeName: 'ryan-ai-linux' }],
      ])
      // Named from parties, not from the server: a list that names an agent the view does not hold still loads again.
      vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(page([at('m2', 2), at('m1', 1, 'linux-pm', 'pm')], false,
        [{ kind: 'run', agentRunId: 'other-pm', address: '/project_task_manager' }, { kind: 'remote', agentRunId: 'linux-pm', address: '/project_task_manager', nodeName: 'ryan-ai-linux' }]))
      owner.reloadNamingUnknown('agent', 'pm', (agentRunId) => agentRunId === 'pm')
      await settle()
      expect(fetchParticipantMessages).toHaveBeenCalledTimes(2)
      expect(owner.counterpartsOf(own).map((counterpart) => counterpart.kind)).toEqual(['run', 'remote'])
    })

    it('an own list shows an agent nothing names by its run ID; any other list leaves its row out and ignores parties, as before (REQ-006)', async () => {
      vi.mocked(fetchParticipantMessages).mockResolvedValueOnce(page([at('m1', 1, 'pm', 'deleted-run')], false)).mockResolvedValueOnce(page([], false))
      const owner = useCollaborationParticipantMessagesStore()
      const noTree = () => null
      owner.load(own)
      owner.load(key)
      await settle()
      expect(participantMessagesView({ key: own, isRemote: false, identityOf: noTree }).listMessages().map((row) => row.counterpart))
        .toEqual([{ kind: 'run', address: null, label: 'deleted-run' }])
      // The hub's list of its host (not the run's own agent): a live message's parties name nobody, and an unnamed row stays out.
      owner.append('agent', 'hub', message('m7', 'host', 'stranger'), { sender: party('host', '/host'), receiver: party('stranger', '/stranger', 'docker') })
      expect(ids(owner.messagesOf(key))).toEqual(['m7'])
      expect(owner.counterpartsOf(key)).toEqual([])
      expect(participantMessagesView({ key, isRemote: false, identityOf: noTree }).listMessages()).toEqual([])
    })
  })
})
