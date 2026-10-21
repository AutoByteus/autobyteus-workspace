import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { apolloClientMock } = vi.hoisted(() => ({ apolloClientMock: { query: vi.fn() } }))

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => apolloClientMock) }))

import { useRemoteCollaborationOffersStore } from '../remoteCollaborationOffersStore'

/** A query answer the test settles when it wants (a peer answers at its own pace). */
const deferred = () => {
  let resolve!: (value: unknown) => void
  let reject!: (error: unknown) => void
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}
const offer = (entries: unknown) => ({ data: { peerNodeOffer: { entries, refusalCode: null } } })
const refused = (refusalCode: string) => ({ data: { peerNodeOffer: { entries: null, refusalCode } } })

/** autobyteus-267 DS-002: one state per peer, the triggers' asks, the stale-answer tokens and the mapping. */
describe('remoteCollaborationOffersStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('asks one peer through this node\'s server, network-only, and shows Checking until its answer arrives', async () => {
    const answer = deferred()
    apolloClientMock.query.mockReturnValueOnce(answer.promise)
    const store = useRemoteCollaborationOffersStore()
    const asked = store.ask('srv_b')
    expect(store.peers.srv_b).toEqual({ phase: 'checking' })
    expect(apolloClientMock.query).toHaveBeenCalledWith(expect.objectContaining({ variables: { nodeId: 'srv_b' }, fetchPolicy: 'network-only' }))
    answer.resolve(offer([]))
    await asked
    expect(store.peers.srv_b).toEqual({ phase: 'available', entries: [], checkedAt: expect.any(String) })
  })

  it('maps entries: only fields with a value, unknown kinds dropped, sorted by name within each kind (Agents first)', async () => {
    apolloClientMock.query.mockResolvedValueOnce(offer([
      { name: 'Studio Team', kind: 'agent_team', description: 'Writes and checks articles' },
      { name: 'publisher', kind: 'agent', description: null },
      { name: 'Build Runner', kind: 'agent', description: '' },
      { name: 'Ada Team', kind: 'agent_team', description: null },
      { name: 'Org', kind: 'agent_org', description: null },
    ]))
    const store = useRemoteCollaborationOffersStore()
    await store.ask('srv_b')
    expect(store.peers.srv_b).toEqual({ phase: 'available', checkedAt: expect.any(String), entries: [
      { name: 'Build Runner', kind: 'agent' },
      { name: 'publisher', kind: 'agent' },
      { name: 'Ada Team', kind: 'agent_team' },
      { name: 'Studio Team', kind: 'agent_team', description: 'Writes and checks articles' },
    ] })
  })

  it('keeps the four worded refusal codes; any other refusal, a GraphQL error or a failed query is Not reachable', async () => {
    const store = useRemoteCollaborationOffersStore()
    for (const code of ['REMOTE_COLLABORATION_OFF', 'PEER_NOT_REGISTERED', 'PEER_UNREACHABLE', 'PEER_IDENTITY_MISMATCH']) {
      apolloClientMock.query.mockResolvedValueOnce(refused(code))
      await store.ask('srv_b')
      expect(store.peers.srv_b).toEqual({ phase: 'unavailable', code })
    }
    apolloClientMock.query.mockResolvedValueOnce(refused('REMOTE_REQUEST_INVALID'))
    await store.ask('srv_b')
    expect(store.peers.srv_b).toEqual({ phase: 'unavailable', code: 'PEER_UNREACHABLE' })
    apolloClientMock.query.mockResolvedValueOnce({ data: null, errors: [{ message: 'Remote collaboration is not available on this server.' }] })
    await store.ask('srv_b')
    expect(store.peers.srv_b).toEqual({ phase: 'unavailable', code: 'PEER_UNREACHABLE' })
    apolloClientMock.query.mockRejectedValueOnce(new Error('Failed to fetch'))
    await store.ask('srv_b')
    expect(store.peers.srv_b).toEqual({ phase: 'unavailable', code: 'PEER_UNREACHABLE' })
    expect(apolloClientMock.query).toHaveBeenCalledTimes(7)
  })

  it('askAll asks every peer at once; each settles at its own pace (a slow peer does not hold the others)', async () => {
    const slow = deferred()
    apolloClientMock.query.mockImplementation(({ variables }: { variables: { nodeId: string } }) =>
      variables.nodeId === 'srv_slow' ? slow.promise : Promise.resolve(refused('REMOTE_COLLABORATION_OFF')))
    const store = useRemoteCollaborationOffersStore()
    store.askAll([{ nodeId: 'srv_fast' }, { nodeId: 'srv_slow' }])
    expect(apolloClientMock.query).toHaveBeenCalledTimes(2)
    await vi.waitFor(() => expect(store.peers.srv_fast).toEqual({ phase: 'unavailable', code: 'REMOTE_COLLABORATION_OFF' }))
    expect(store.peers.srv_slow).toEqual({ phase: 'checking' })
    slow.resolve(refused('PEER_UNREACHABLE'))
    await vi.waitFor(() => expect(store.peers.srv_slow).toEqual({ phase: 'unavailable', code: 'PEER_UNREACHABLE' }))
  })

  it('ignores a stale answer: the peer asked again, removed, the switch turned off or the tab left', async () => {
    const store = useRemoteCollaborationOffersStore()
    const first = deferred(); const second = deferred()
    apolloClientMock.query.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const a = store.ask('srv_b'); const b = store.ask('srv_b')
    second.resolve(refused('PEER_NOT_REGISTERED')); await b
    first.resolve(offer([{ name: 'Old', kind: 'agent', description: null }])); await a
    expect(store.peers.srv_b).toEqual({ phase: 'unavailable', code: 'PEER_NOT_REGISTERED' })

    for (const drop of [() => store.forget('srv_b'), () => store.clear()]) {
      const late = deferred()
      apolloClientMock.query.mockReturnValueOnce(late.promise)
      const asked = store.ask('srv_b')
      drop()
      late.resolve(offer([]))
      await asked
      expect(store.peers.srv_b).toBeUndefined()
    }
  })

  it('askAll starts from nothing (a removed peer\'s old state does not survive), and clear drops every state', async () => {
    apolloClientMock.query.mockResolvedValue(offer([]))
    const store = useRemoteCollaborationOffersStore()
    await store.ask('srv_gone')
    store.askAll([{ nodeId: 'srv_b' }])
    expect(Object.keys(store.peers)).toEqual(['srv_b'])
    store.clear()
    expect(store.peers).toEqual({})
  })
})
