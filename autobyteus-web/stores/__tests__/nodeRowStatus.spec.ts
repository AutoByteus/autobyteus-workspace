import { describe, expect, it } from 'vitest'
import { rowViewOf, type NodeRow, type RowFacts } from '../nodeRowStatus'
import type { PeerOffer } from '~/stores/remoteCollaborationOffersStore'

/** one-nodes-tab REQ-706, UI/UX spec § State Behavior: each row's dot, directions and its one line, by priority. */

const A = 'srv_thisNodeAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const B = 'srv_otherNodeBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const peerB = { nodeId: B, name: 'studio', baseUrl: 'http://192.168.2.31:29695', addedAt: '2026-10-23T08:00:00.000Z' }
const peerA = { nodeId: A, name: 'Embedded Node', baseUrl: 'http://host.docker.internal:29695', addedAt: '2026-10-23T08:00:00.000Z' }

const row = (overrides: Partial<NodeRow> = {}): NodeRow => ({
  key: B, serverInstanceId: B, desktopIds: ['remote-1'], windowAddress: 'http://192.168.2.31:29695', peer: peerB, name: 'studio', isEmbedded: false, ...overrides,
})
const reached: RowFacts = { probe: { ok: true, serverInstanceId: B }, remote: { switchOn: true, peers: [peerA] }, availability: { available: true }, checkedAt: '2026-10-23T08:00:00.000Z' }
const working: PeerOffer = { phase: 'available', entries: [{ name: 'Writer', kind: 'agent' }], checkedAt: '2026-10-23T08:00:00.000Z' }
const view = (input: { row?: NodeRow; switchOn?: boolean; facts?: RowFacts; offer?: PeerOffer; unfinished?: Parameters<typeof rowViewOf>[0]['unfinishedStep'] }) => rowViewOf({
  row: input.row ?? row(), switchOn: input.switchOn ?? true, thisNodeId: A, facts: 'facts' in input ? input.facts : reached,
  offer: 'offer' in input ? input.offer : working, unfinishedStep: input.unfinished ?? null,
})

describe('rowViewOf', () => {
  it('working: green, both directions working, no line, its offer under the bar', () => {
    const v = view({})
    expect(v).toMatchObject({ checking: false, reachable: true, different: false, out: { state: 'working' }, in: { state: 'working' }, line: null })
    expect(v.offers).toEqual([{ name: 'Writer', kind: 'agent' }])
  })

  it('checking: while the window asks, while this node asks, while the other node is read', () => {
    expect(view({ facts: undefined }).checking).toBe(true)
    expect(view({ facts: { ...reached, probe: null } }).checking).toBe(true)
    expect(view({ offer: { phase: 'checking' } }).checking).toBe(true)
    expect(view({ facts: { ...reached, remote: undefined } }).checking).toBe(true)
    expect(view({ facts: { ...reached, availability: undefined } })).toMatchObject({ checking: false, in: { state: 'checking' } })
  })

  it('off there, not registered there: amber lines with their fixing buttons', () => {
    expect(view({ offer: { phase: 'unavailable', code: 'REMOTE_COLLABORATION_OFF' } }).line).toEqual({ kind: 'offThere', tone: 'warn', fix: 'turnOnThere' })
    expect(view({ offer: { phase: 'unavailable', code: 'PEER_NOT_REGISTERED' } }).line).toEqual({ kind: 'notRegisteredThere', tone: 'warn', fix: 'registerThere' })
  })

  it('a different node: red dot and line with Change address', () => {
    const v = view({ offer: { phase: 'unavailable', code: 'PEER_IDENTITY_MISMATCH' } })
    expect(v).toMatchObject({ different: true, line: { kind: 'different', tone: 'error', fix: 'changeAddress' } })
  })

  it('not reachable: the window\'s cause, or for a node only this node knows, this node\'s cause; Check again', () => {
    const down = view({ facts: { probe: { ok: false, cause: 'refused' }, remote: null, availability: null, checkedAt: 'x' }, offer: { phase: 'unavailable', code: 'PEER_UNREACHABLE', reason: 'refused' } })
    expect(down).toMatchObject({ reachable: false, line: { kind: 'unreachable', tone: 'info', fix: 'checkAgain', cause: 'refused', host: '192.168.2.31:29695' } })
    const peerOnly = view({ row: row({ desktopIds: [], windowAddress: null }), facts: { probe: { ok: false, cause: 'unreachable' }, remote: null, availability: null, checkedAt: 'x' },
      offer: { phase: 'unavailable', code: 'PEER_UNREACHABLE', reason: 'timeout' } })
    expect(peerOnly).toMatchObject({ reachable: false, line: { kind: 'unreachable', cause: 'timeout' } })
  })

  it('a node only this node can reach is reachable by this node\'s answer, not the window\'s (DS-004)', () => {
    const v = view({ row: row({ desktopIds: [], windowAddress: null }), facts: { probe: { ok: false, cause: 'not_found' }, remote: null, availability: null, checkedAt: 'x' } })
    expect(v).toMatchObject({ reachable: true, line: null, out: { state: 'working' } })
  })

  it('a step not finished comes first, with Try again, until both directions work', () => {
    const unfinished = { id: 'turnOnThere' as const, status: 'failed' as const, error: { code: 'PEER_UNREACHABLE', message: 'x', reason: 'refused' as const } }
    const v = view({ offer: { phase: 'unavailable', code: 'REMOTE_COLLABORATION_OFF' }, unfinished })
    expect(v.line).toMatchObject({ kind: 'partial', tone: 'warn', fix: 'tryAgain', error: unfinished.error })
    expect(view({ unfinished }).line).toBeNull()
  })

  it('not collaborating: "registered only by the other node" when it has this node and is on, else "can\'t work with it yet"; Turn on', () => {
    expect(view({ row: row({ peer: null, name: 'nas' }), offer: undefined }).line).toEqual({ kind: 'notRegisteredHereInfo', tone: 'info', fix: 'turnOn' })
    expect(view({ row: row({ peer: null }), offer: undefined, facts: { ...reached, remote: { switchOn: true, peers: [] } } }).line)
      .toEqual({ kind: 'agentsOff', tone: 'info', fix: 'turnOn' })
    expect(view({ row: row({ peer: null }), offer: undefined, facts: { ...reached, remote: { switchOn: false, peers: [peerA] } } }).line)
      .toEqual({ kind: 'agentsOff', tone: 'info', fix: 'turnOn' })
  })

  it('this node\'s switch off: no warnings; the directions say "off on this node"', () => {
    const v = view({ switchOn: false, offer: undefined })
    expect(v).toMatchObject({ line: null, out: { state: 'offHere' }, in: { state: 'offHere' } })
    const peerOnly = view({ switchOn: false, offer: undefined, row: row({ desktopIds: [], windowAddress: null }), facts: { ...reached, probe: { ok: false, cause: 'unreachable' }, remote: null } })
    expect(peerOnly).toMatchObject({ reachable: null, line: null })
  })

  it('it → this node: off there, not registered there, and the other node\'s own reason for not reaching this node', () => {
    expect(view({ facts: { ...reached, remote: { switchOn: false, peers: [peerA] } } }).in).toEqual({ state: 'offThere' })
    expect(view({ facts: { ...reached, remote: { switchOn: true, peers: [] } } }).in).toEqual({ state: 'notRegisteredThere' })
    expect(view({ facts: { ...reached, availability: { available: false, code: 'PEER_UNREACHABLE', reason: 'not_found' } } }).in)
      .toEqual({ state: 'unreachable', cause: 'not_found', host: 'host.docker.internal:29695', fromOther: true })
  })
})
