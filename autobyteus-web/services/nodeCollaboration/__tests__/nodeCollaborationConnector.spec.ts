import { describe, expect, it, vi } from 'vitest'
import { createNodeCollaborationConnector, registrationName, type NodeCollaborationConnectorDependencies } from '../nodeCollaborationConnector'
import type { NodeCollaborationApi } from '../nodeCollaborationApi'
import type { NodeChangeTarget } from '../nodeChangePlan'
import type { PeerNode } from '~/stores/remoteCollaborationStore'
import { NodeSettingsError } from '~/utils/nodeSettingsError'

/**
 * one-nodes-tab DS-003: the plan rule, the naming rule (§ Naming Rule) and the run rules (§ Run Rules, AR-007); with
 * autobyteus-437, two nodes collaborate once paired: one `pair` step (an invite there, accepted here).
 */

const A = 'srv_thisNodeAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const B = 'srv_node8003BBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const peer = (nodeId: string, name: string, baseUrl = 'http://x', paired = true): PeerNode =>
  ({ nodeId, name, baseUrl, addedAt: '2026-10-23T08:00:00.000Z', paired })
const refusal = (code: string, extra: Record<string, unknown> = {}) => new NodeSettingsError({ code, message: code, ...extra })

const target: NodeChangeTarget = { rowKey: B, name: '8003', nodeId: B, entryIds: ['remote-8003'], windowAddress: 'http://localhost:8003' }
const here = { name: 'Embedded Node', nodeId: A, windowAddress: 'http://127.0.0.1:29695' }

const world = (input: { hereOn?: boolean; herePeers?: PeerNode[]; thereOn?: boolean; therePeers?: PeerNode[]; thereDown?: boolean } = {}) => {
  const calls: string[] = []
  const log = (entry: string) => { calls.push(entry) }
  const herePeers = input.herePeers ?? []
  const there: NodeCollaborationApi = {
    capability: vi.fn(async () => { if (input.thereDown) throw refusal('PEER_UNREACHABLE', { reason: 'refused' }); return { enabled: input.thereOn ?? false } }),
    setEnabled: vi.fn(async (on) => log(`there.setEnabled(${on})`)),
    peers: vi.fn(async () => { if (input.thereDown) throw refusal('PEER_UNREACHABLE'); return input.therePeers ?? [] }),
    createInvite: vi.fn(async () => { log('there.createInvite()'); return { inviteText: 'abpi_invite', expiresAt: '2026-11-08T10:10:00.000Z' } }),
    removePeer: vi.fn(async (nodeId) => log(`there.removePeer(${nodeId})`)),
    changePeerAddress: vi.fn(),
    peerNodeAvailability: vi.fn(),
  }
  const deps: NodeCollaborationConnectorDependencies = {
    here: {
      switchOn: () => input.hereOn ?? true,
      setSwitch: vi.fn(async (on) => log(`here.setSwitch(${on})`)),
      loadPeers: vi.fn(async () => herePeers),
      acceptInvite: vi.fn(async (invite, name, nameOnInviter) => log(`here.acceptInvite(${invite},${name},${nameOnInviter})`)),
      renamePeer: vi.fn(async (nodeId, name) => log(`here.rename(${nodeId},${name})`)),
      removePeer: vi.fn(async (nodeId) => log(`here.removePeer(${nodeId})`)),
      changePeerAddress: vi.fn(async (nodeId, url) => log(`here.changeAddress(${nodeId},${url})`)),
    },
    list: {
      rename: vi.fn(async (id, name) => log(`list.rename(${id},${name})`)),
      remove: vi.fn(async (id) => log(`list.remove(${id})`)),
    },
    there: vi.fn(() => there),
  }
  return { deps, there, calls, connector: createNodeCollaborationConnector(deps) }
}

const ids = (plan: { steps: Array<{ id: string }> }) => plan.steps.map((step) => step.id)
const statuses = (plan: { steps: Array<{ id: string; status: string }> }) => plan.steps.map((step) => `${step.id}:${step.status}`)

describe('registrationName (§ Naming Rule)', () => {
  it('makes a valid name: disallowed runs become "-", a leading non-alphanumeric is dropped, cut to 64, "node" when empty', () => {
    expect(registrationName('http://localhost:8003', [])).toBe('localhost-8003')
    expect(registrationName('my node/2 (lab)', [])).toBe('my node-2 -lab-')
    expect(registrationName('Embedded Node', [])).toBe('Embedded Node')
    expect(registrationName('--?!', [])).toBe('node')
    expect(registrationName('x'.repeat(80), [])).toHaveLength(64)
  })

  it('makes it unique against the side being written, case-insensitively, with " 2", " 3" (cut to fit 64)', () => {
    expect(registrationName('Embedded Node', ['embedded node'])).toBe('Embedded Node 2')
    expect(registrationName('Embedded Node', ['Embedded Node', 'Embedded Node 2'])).toBe('Embedded Node 3')
    const long = 'y'.repeat(64)
    expect(registrationName(long, [long])).toBe(`${'y'.repeat(62)} 2`)
  })
})

describe('nodeCollaborationConnector plans', () => {
  it('NAS-19 connect, this node on and 8003 off, nothing registered: turn 8003 on, then one pairing step with both names', async () => {
    const f = world({ hereOn: true, thereOn: false })
    const plan = await f.connector.plan('connect', target, here)
    expect(ids(plan)).toEqual(['turnOnThere', 'pair'])
    expect(plan.steps.find((step) => step.id === 'pair')).toMatchObject({ name: '8003', wanted: '8003', nameThere: 'Embedded Node' })
    expect(f.calls).toEqual([]) // nothing changes on any node before the owner confirms (QR-702)
  })

  it('this node off: turning it on is part of the plan, before the pairing', async () => {
    const plan = await world({ hereOn: false, thereOn: true }).connector.plan('connect', target, here)
    expect(ids(plan)).toEqual(['turnOnHere', 'pair'])
  })

  it('NAS-23 finish: peers registered before pairing pair again under the names they have; a name used there gets a number', async () => {
    const unpaired = world({ hereOn: true, herePeers: [peer(B, '8003', 'http://x', false)], thereOn: true, therePeers: [peer(A, 'My Mac', 'http://y', false)] })
    const again = await unpaired.connector.plan('finish', target, here)
    expect(ids(again)).toEqual(['pair'])
    expect(again.steps[0]).toMatchObject({ name: '8003', nameThere: 'My Mac' })
    const taken = world({ hereOn: true, herePeers: [peer(B, '8003', 'http://x', false)], thereOn: true, therePeers: [peer('srv_other', 'Embedded Node')] })
    const plan = await taken.connector.plan('finish', target, here)
    expect(plan.steps[0]).toMatchObject({ id: 'pair', nameThere: 'Embedded Node 2' })
  })

  it('a pair paired on one side only is removed there first; a pair paired on both sides needs nothing', async () => {
    const oneSided = await world({ hereOn: true, herePeers: [peer(B, '8003')], thereOn: true, therePeers: [] }).connector.plan('finish', target, here)
    expect(ids(oneSided)).toEqual(['removeHere', 'pair'])
    const done = await world({ hereOn: true, herePeers: [peer(B, '8003')], thereOn: true, therePeers: [peer(A, 'Embedded Node')] }).connector.plan('finish', target, here)
    expect(ids(done)).toEqual([])
  })

  it('a node this window cannot read now gives no plan', async () => {
    await expect(world({ thereDown: true }).connector.plan('connect', target, here)).rejects.toBeInstanceOf(NodeSettingsError)
  })

  it('disconnect and remove: this node there only when it is registered there, or when that cannot be read', async () => {
    const both = await world({ herePeers: [peer(B, '8003')], therePeers: [peer(A, 'Embedded Node')] }).connector.plan('remove', target, here)
    expect(ids(both)).toEqual(['removeHere', 'removeThere', 'removeFromList'])
    const notThere = await world({ herePeers: [peer(B, '8003')], therePeers: [] }).connector.plan('disconnect', target, here)
    expect(ids(notThere)).toEqual(['removeHere'])
    const unknown = await world({ herePeers: [peer(B, '8003')], thereDown: true }).connector.plan('remove', target, here)
    expect(ids(unknown)).toEqual(['removeHere', 'removeThere', 'removeFromList'])
    const listOnly = await world().connector.plan('remove', { ...target, nodeId: null, rowKey: 'd:remote-8003' }, here)
    expect(ids(listOnly)).toEqual(['removeFromList'])
  })

})

describe('nodeCollaborationConnector run rules (§ Run Rules)', () => {
  it('NAS-19 connect runs in order: switch here, switch there, then the pairing: an invite there, accepted here', async () => {
    const f = world({ hereOn: false, thereOn: false })
    const plan = await f.connector.plan('connect', target, here)
    await f.connector.run(plan)
    expect(plan.phase).toBe('done')
    expect(f.calls).toEqual([
      'here.setSwitch(true)',
      'there.setEnabled(true)',
      'there.createInvite()',
      'here.acceptInvite(abpi_invite,8003,Embedded Node)',
    ])
  })

  it('connect stops at the first failure: done stays done, the rest is not run; Try again runs only what is left', async () => {
    const f = world({ hereOn: false, thereOn: false })
    vi.mocked(f.there.setEnabled).mockRejectedValueOnce(refusal('PEER_UNREACHABLE', { reason: 'timeout', address: 'http://localhost:8003' }))
    const plan = await f.connector.plan('connect', target, here)
    await f.connector.run(plan)
    expect(plan.phase).toBe('failed')
    expect(statuses(plan)).toEqual(['turnOnHere:done', 'turnOnThere:failed', 'pair:notRun'])
    expect(plan.steps[1]!.error).toMatchObject({ code: 'PEER_UNREACHABLE', reason: 'timeout' })
    f.calls.length = 0
    await f.connector.run(plan)
    expect(plan.phase).toBe('done')
    expect(f.calls).toEqual(['there.setEnabled(true)', 'there.createInvite()', 'here.acceptInvite(abpi_invite,8003,Embedded Node)'])
  })

  it('a pairing refused there fails the pair step with the code (the row re-plans with fresh facts)', async () => {
    const f = world({ hereOn: true, thereOn: true })
    vi.mocked(f.deps.here.acceptInvite).mockRejectedValueOnce(refusal('PEER_INVITE_INVALID'))
    const plan = await f.connector.plan('connect', target, here)
    await f.connector.run(plan)
    expect(plan.steps.find((step) => step.id === 'pair')).toMatchObject({ status: 'failed', error: { code: 'PEER_INVITE_INVALID' } })
  })

  it('disconnect continues: removeThere runs even when removeHere failed, and each failure is reported', async () => {
    const f = world({ herePeers: [peer(B, '8003')], therePeers: [peer(A, 'Embedded Node')] })
    vi.mocked(f.deps.here.removePeer).mockRejectedValueOnce(refusal('PEER_NOT_FOUND'))
    const plan = await f.connector.plan('disconnect', target, here)
    await f.connector.run(plan)
    expect(statuses(plan)).toEqual(['removeHere:failed', 'removeThere:done'])
    expect(plan.phase).toBe('failed')
  })

  it('AR-007: remove with an unreachable node there still removes the list entries, and reports it', async () => {
    const f = world({ herePeers: [peer(B, '8003')], therePeers: [peer(A, 'Embedded Node')] })
    vi.mocked(f.there.removePeer).mockRejectedValueOnce(refusal('PEER_UNREACHABLE', { reason: 'refused' }))
    const plan = await f.connector.plan('remove', { ...target, entryIds: ['remote-8003', 'remote-8003-old'] }, here)
    await f.connector.run(plan)
    expect(statuses(plan)).toEqual(['removeHere:done', 'removeThere:failed', 'removeFromList:done'])
    expect(f.calls).toContain('list.remove(remote-8003)')
    expect(f.calls).toContain('list.remove(remote-8003-old)')
  })

  it('rename: the peer first, then the list; a refused peer name leaves both names unchanged (VIS-010)', async () => {
    const f = world({ herePeers: [peer(B, '8003')] })
    vi.mocked(f.deps.here.renamePeer).mockRejectedValueOnce(refusal('PEER_NAME_TAKEN'))
    const plan = await f.connector.plan('rename', target, here, { name: 'nas' })
    await f.connector.run(plan)
    expect(statuses(plan)).toEqual(['renameHere:failed', 'renameInList:notRun'])
    expect(f.calls).toEqual([])
    const ok = await f.connector.plan('rename', target, here, { name: 'nas' })
    await f.connector.run(ok)
    expect(f.calls).toEqual([`here.rename(${B},nas)`, 'list.rename(remote-8003,nas)'])
  })

  it('change address: one step; this node\'s server checks the typed address alone (AC-707) and saves it; a refusal keeps its details', async () => {
    const f = world({ herePeers: [peer(B, '8003')] })
    const plan = await f.connector.plan('changeAddress', target, here, { address: 'http://192.168.2.31:8003' })
    expect(ids(plan)).toEqual(['changeAddressHere'])
    await f.connector.run(plan)
    expect(f.calls).toEqual([`here.changeAddress(${B},http://192.168.2.31:8003)`])
    vi.mocked(f.deps.here.changePeerAddress).mockRejectedValueOnce(
      refusal('PEER_UNREACHABLE', { reason: 'refused', address: 'http://127.0.0.1:29695', loopbackInContainer: true }))
    const failed = await f.connector.plan('changeAddress', target, here, { address: 'http://127.0.0.1:29695' })
    await f.connector.run(failed)
    expect(failed.steps[0]).toMatchObject({ status: 'failed', error: { code: 'PEER_UNREACHABLE', address: 'http://127.0.0.1:29695', loopbackInContainer: true } })
  })
})
