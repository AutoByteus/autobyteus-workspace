import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'

const A = 'srv_thisNodeAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const D1 = 'srv_docker8001DDDDDDDDDDDDDDDDDDDDDDDDDD'
const D3 = 'srv_node8003CCCCCCCCCCCCCCCCCCCCCCCCCCCC'
const NAS = 'srv_nasNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNNN'

const h = vi.hoisted(() => ({
  probes: new Map<string, unknown>(),
  remote: new Map<string, unknown>(),
  nodeStore: null as any,
  peers: null as any,
  offers: null as any,
  capability: null as any,
  connector: { plan: vi.fn(), run: vi.fn() },
}))

vi.mock('~/utils/nodeIdentityProbe', async (original) => ({
  ...(await original<typeof import('~/utils/nodeIdentityProbe')>()),
  probeNodeIdentity: vi.fn(async (url: string) => h.probes.get(url) ?? { ok: false, cause: 'refused' }),
}))
vi.mock('~/services/nodeCollaboration/nodeCollaborationApi', () => ({
  createNodeCollaborationApi: (url: string) => {
    const state = h.remote.get(url) as { switchOn: boolean; peers: unknown[] } | undefined
    return {
      capability: async () => { if (!state) throw new Error('down'); return { enabled: state.switchOn } },
      peers: async () => { if (!state) throw new Error('down'); return state.peers },
      peerNodeAvailability: async () => ({ available: true }),
    }
  },
}))
vi.mock('~/stores/nodeStore', () => ({ useNodeStore: () => h.nodeStore }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ nodeId: 'embedded-local' }) }))
vi.mock('~/stores/remoteCollaborationStore', () => ({ useRemoteCollaborationStore: () => h.peers }))
vi.mock('~/stores/remoteCollaborationOffersStore', () => ({ useRemoteCollaborationOffersStore: () => h.offers }))
vi.mock('~/stores/remoteCollaborationCapabilityStore', () => ({ useRemoteCollaborationCapabilityStore: () => h.capability }))
vi.mock('~/services/nodeCollaboration/windowNodeCollaborationConnector', () => ({ useNodeCollaborationConnector: () => h.connector }))

import { useNodeListStore } from '../nodeListStore'

const entry = (id: string, name: string, baseUrl: string, extra: Record<string, unknown> = {}) => ({
  id, name, baseUrl, nodeType: id === 'embedded-local' ? 'embedded' : 'remote', isSystem: id === 'embedded-local',
  createdAt: `2026-10-0${extra.order ?? 1}T00:00:00.000Z`, updatedAt: 'x', ...extra,
})
const peer = (nodeId: string, name: string, baseUrl: string) => ({ nodeId, name, baseUrl, addedAt: 'x' })
const flush = async () => { for (let i = 0; i < 10; i += 1) await Promise.resolve() }

/** one-nodes-tab DS-001, DS-002, DS-004 (REQ-702, REQ-704, REQ-711; AR-003, AR-008, AR-009; DEC-705, DEC-706). */
describe('nodeListStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    h.probes.clear()
    h.remote.clear()
    h.nodeStore = reactive({
      nodes: [
        entry('embedded-local', 'Embedded Node', 'http://127.0.0.1:29695'),
        entry('remote-ba22', 'http://localhost:8001', 'http://localhost:8001', { order: 2 }),
        entry('remote-8003', 'http://localhost:8003', 'http://localhost:8003', { order: 3, serverInstanceId: D3 }),
      ],
      initializeRegistry: vi.fn(async () => undefined),
      getNodeById(id: string) { return this.nodes.find((node: any) => node.id === id) ?? null },
      identifyNode: vi.fn(async (id: string, serverInstanceId: string) => {
        const node = h.nodeStore.nodes.find((candidate: any) => candidate.id === id)
        if (node) node.serverInstanceId = serverInstanceId
      }),
      addRemoteNode: vi.fn(async (input: any) => {
        const added = entry(`remote-${h.nodeStore.nodes.length}`, input.name, input.baseUrl, { order: 9, ...(input.serverInstanceId ? { serverInstanceId: input.serverInstanceId } : {}) })
        h.nodeStore.nodes.push(added)
        return added
      }),
    })
    h.peers = reactive({
      peers: [peer(D1, 'docker', 'http://localhost:8001'), peer(NAS, 'nas', 'http://192.168.2.55:29695')],
      load: vi.fn(async () => undefined),
    })
    h.offers = reactive({ peers: {} as Record<string, unknown>, ask: vi.fn(async (id: string) => { h.offers.peers[id] = { phase: 'available', entries: [], checkedAt: 'x' } }), clear: vi.fn() })
    h.capability = reactive({ isEnabled: true, status: 'resolved', ensureResolved: vi.fn(async () => null), setEnabled: vi.fn(async () => null) })
    h.probes.set('http://127.0.0.1:29695', { ok: true, nodeId: A })
    h.probes.set('http://localhost:8001', { ok: true, nodeId: D1 })
    h.probes.set('http://localhost:8003', { ok: true, nodeId: D3 })
    h.remote.set('http://localhost:8001', { switchOn: true, peers: [peer(A, 'electron', 'http://host.docker.internal:29695')] })
    h.remote.set('http://localhost:8003', { switchOn: false, peers: [] })
    Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: { openNodeWindow: vi.fn() } })
  })

  it('AC-702: the user\'s data shows each node once: desktop "http://localhost:8001" and peer "docker" join by node ID, named "docker"', async () => {
    const store = useNodeListStore()
    await store.open()
    await flush()
    expect(h.nodeStore.identifyNode).toHaveBeenCalledWith('remote-ba22', D1)
    expect(store.rows.map((row) => [row.key, row.name, row.desktopIds, row.peer?.name ?? null])).toEqual([
      [D1, 'docker', ['remote-ba22'], 'docker'],
      [D3, 'http://localhost:8003', ['remote-8003'], null],
      [NAS, 'nas', [], 'nas'],
    ])
    expect(store.thisNodeId).toBe(A)
  })

  it('a node never reached is its own row until it is reached (REQ-702)', async () => {
    h.probes.delete('http://localhost:8001')
    const store = useNodeListStore()
    await store.open()
    await flush()
    expect(store.rows.map((row) => row.key)).toEqual(['d:remote-ba22', D3, D1, NAS])
    expect(store.views['d:remote-ba22']).toMatchObject({ reachable: false, line: { kind: 'unreachable', cause: 'refused' } })
  })

  it('two desktop entries of one node join into one row, the first-created first; its Remove covers both', async () => {
    h.nodeStore.nodes.push(entry('remote-dup', 'docker again', 'http://127.0.0.1:8001', { order: 4, serverInstanceId: D1 }))
    const store = useNodeListStore()
    await store.open()
    await flush()
    expect(store.rowByKey(D1)?.desktopIds).toEqual(['remote-ba22', 'remote-dup'])
  })

  it('AR-009: "it → this node" via the address the other node has for this node, read from its peers', async () => {
    const store = useNodeListStore()
    await store.open()
    await flush()
    expect(store.facts[D1]!.remote!.peers[0]!.baseUrl).toBe('http://host.docker.internal:29695')
    expect(store.views[D1]).toMatchObject({ out: { state: 'working' }, in: { state: 'working' }, line: null })
    expect(store.views[D3]!.line).toEqual({ kind: 'agentsOff', tone: 'info', fix: 'turnOn' })
  })

  it('AR-008: an address already listed is refused even when its node is down, and the row is highlighted', async () => {
    h.probes.set('http://localhost:8003', { ok: false, cause: 'refused' })
    const store = useNodeListStore()
    await store.open()
    await flush()
    await expect(store.addNode({ address: 'localhost:8003', name: 'again', collaborate: true })).resolves.toEqual({ ok: false, error: 'duplicate', existing: 'http://localhost:8003' })
    expect(store.flashKey).toBe(D3)
    expect(h.nodeStore.addRemoteNode).not.toHaveBeenCalled()
  })

  it('TR-703: another address of a listed node is refused by its node ID; invalid fields are refused', async () => {
    h.probes.set('http://192.168.2.20:8001', { ok: true, nodeId: D1 })
    const store = useNodeListStore()
    await store.open()
    await flush()
    await expect(store.addNode({ address: 'http://192.168.2.20:8001', name: 'x', collaborate: true })).resolves.toEqual({ ok: false, error: 'duplicate', existing: 'docker' })
    await expect(store.addNode({ address: 'http://a b', name: '/bad', collaborate: true })).resolves.toEqual({ ok: false, error: 'invalid', address: true, name: true })
  })

  it('TR-702: adding stores the node with its node ID, opens no window, and asks for the confirmation only when reachable and the switch is on', async () => {
    const E = 'srv_newNodeEEEEEEEEEEEEEEEEEEEEEEEEEEEEE'
    h.probes.set('http://localhost:8004', { ok: true, nodeId: E })
    const store = useNodeListStore()
    await store.open()
    await flush()
    await expect(store.addNode({ address: 'localhost:8004', name: '8004', collaborate: true })).resolves.toEqual({ ok: true, key: E, confirm: true })
    expect(h.nodeStore.addRemoteNode).toHaveBeenCalledWith({ name: '8004', baseUrl: 'http://localhost:8004', serverInstanceId: E })
    expect(window.electronAPI.openNodeWindow).not.toHaveBeenCalled()
    await expect(store.addNode({ address: 'localhost:8005', name: '8005', collaborate: true })).resolves.toMatchObject({ ok: true, confirm: false })
    expect(h.nodeStore.addRemoteNode).toHaveBeenLastCalledWith({ name: '8005', baseUrl: 'http://localhost:8005', serverInstanceId: undefined })
    await expect(store.addNode({ address: 'localhost:8006', name: '8006', collaborate: false })).resolves.toMatchObject({ ok: true, confirm: false })
  })

  it('TR-704/705/712: keeps each row\'s unfinished step until a later run clears it, and shows it as the row\'s line', async () => {
    h.peers.peers.push(peer(D3, '8003', 'http://localhost:8003'))
    h.remote.set('http://localhost:8003', { switchOn: false, peers: [] })
    const store = useNodeListStore()
    await store.open()
    await flush()
    const step = { id: 'turnOnThere' as const, status: 'failed' as const, error: { code: 'PEER_UNREACHABLE', message: 'x', reason: 'refused' as const } }
    store.setUnfinishedStep(D3, step)
    expect(store.unfinishedStepOf(D3)).toEqual(step)
    expect(store.views[D3]!.line).toMatchObject({ kind: 'partial', fix: 'tryAgain' })
    store.setUnfinishedStep(D3, null)
    expect(store.unfinishedStepOf(D3)).toBeNull()
  })

  it('DS-003: the change subject names the row\'s node, where this window reaches it, and this node', async () => {
    const store = useNodeListStore()
    await store.open()
    await flush()
    expect(store.changeSubjectOf(D1)).toEqual({
      target: { rowKey: D1, name: 'docker', nodeId: D1, desktopIds: ['remote-ba22'], windowAddress: 'http://localhost:8001' },
      here: { name: 'Embedded Node', nodeId: A, windowAddress: 'http://127.0.0.1:29695' },
    })
    expect(store.changeSubjectOf('missing')).toBeNull()
  })

  it('UXJ-706 / TR-711: rename and change address run through the connector without a confirmation; a refused name reads as taken', async () => {
    const store = useNodeListStore()
    await store.open()
    await flush()
    h.connector.plan.mockImplementation(async (kind: string) => ({ kind, steps: [{ id: 'renameHere', status: 'todo' }] }))
    h.connector.run.mockImplementationOnce(async (plan: any) => { plan.steps[0].status = 'failed'; plan.steps[0].error = { code: 'PEER_NAME_TAKEN', message: 'x' } })
    await expect(store.renameNode(D1, 'studio')).resolves.toMatchObject({ ok: false, error: 'taken' })
    expect(h.connector.plan).toHaveBeenLastCalledWith('rename', expect.objectContaining({ rowKey: D1 }), expect.objectContaining({ nodeId: A }), { name: 'studio' })
    h.connector.run.mockImplementationOnce(async (plan: any) => { plan.steps[0].status = 'done' })
    await expect(store.changeAddress(D1, 'host.docker.internal:8001')).resolves.toEqual({ ok: true })
    expect(h.connector.plan).toHaveBeenLastCalledWith('changeAddress', expect.anything(), expect.anything(), { address: 'http://host.docker.internal:8001' })
    await expect(store.renameNode(D1, 'nas')).resolves.toEqual({ ok: false, error: 'taken' })
  })

  it('DEC-706: a node only this node knows has Open once this window reaches it; its first Open adds a desktop entry', async () => {
    h.probes.set('http://192.168.2.55:29695', { ok: true, nodeId: NAS })
    const store = useNodeListStore()
    await store.open()
    await flush()
    expect(store.canOpen(NAS)).toBe(true)
    await store.openNode(NAS)
    expect(h.nodeStore.addRemoteNode).toHaveBeenCalledWith({ name: 'nas', baseUrl: 'http://192.168.2.55:29695', serverInstanceId: NAS })
    expect(window.electronAPI.openNodeWindow).toHaveBeenCalledWith('remote-3')
  })

  it('a node only this node knows and this window cannot reach has no Open', async () => {
    const store = useNodeListStore()
    await store.open()
    await flush()
    expect(store.canOpen(NAS)).toBe(false)
  })
})
