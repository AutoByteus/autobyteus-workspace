import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { NodeRow } from '~/stores/nodeRowStatus'
import type { NodeEntry, NodeRegistryChange, NodeRegistrySnapshot } from '~/types/node'
import type { NodeAutoUpdateEntries } from '~/shared/nodeAutoUpdateTypes'

const h = vi.hoisted(() => ({ list: null as any }))
vi.mock('~/stores/nodeListStore', () => ({ useNodeListStore: () => h.list }))

import NodeServerUpdate from '../NodeServerUpdate.vue'
import { useAppUpdateStore } from '~/stores/appUpdateStore'
import { useNodeStore } from '~/stores/nodeStore'

/** autobyteus-356 (UC-002, UC-003): a remote node's "Update automatically" and its outcome, under its server line. */

const B = 'srv_studioBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
const ADDRESS = 'http://192.168.2.31:29695'
const row: NodeRow = { key: B, nodeId: B, entryIds: ['remote-1'], windowAddress: ADDRESS, peer: null, name: 'studio', isEmbedded: false }
const idle = { state: 'idle', targetVersion: null, step: null, code: null, message: null }
const older = { inPlaceUpdate: 'available', version: '1.5.11', target: { version: '1.5.12', relation: 'newer' }, update: idle }
const entry = (overrides: Partial<NodeEntry> = {}): NodeEntry => ({
  id: 'remote-1', name: 'studio', baseUrl: ADDRESS, nodeType: 'remote', createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z', ...overrides,
})
const snapshot = (version: number, remote: NodeEntry): NodeRegistrySnapshot => ({ version, nodes: [
  { id: 'embedded-local', name: 'Embedded Node', baseUrl: 'http://127.0.0.1:29695', nodeType: 'embedded', createdAt: 'x', updatedAt: 'x' }, remote,
] })

let outcomes: NodeAutoUpdateEntries = {}
let changed: ((entries: NodeAutoUpdateEntries) => void) | null = null
const api = {
  getNodeAutoUpdateState: vi.fn(async () => outcomes),
  markNodeAutoUpdateRead: vi.fn(async (entryId: string) => ({ ...outcomes, [entryId]: { ...outcomes[entryId]!, read: true } })),
  onNodeAutoUpdateChanged: vi.fn((callback: (entries: NodeAutoUpdateEntries) => void) => { changed = callback; return () => undefined }),
  upsertNodeRegistry: vi.fn(async (change: NodeRegistryChange) => {
    if (change.type !== 'set-auto-update') throw new Error('unexpected')
    registryVersion += 1
    return snapshot(registryVersion, change.enabled ? entry({ autoUpdate: true }) : entry())
  }),
}

let registryVersion = 0
const mountLine = async (answer: unknown, remote: NodeEntry = entry()) => {
  registryVersion += 2
  useNodeStore().applyRegistrySnapshot(snapshot(registryVersion, remote))
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(answer), { status: 200 })))
  const wrapper = mount(NodeServerUpdate, { props: { row } })
  await flushPromises()
  return wrapper
}
const toggle = (wrapper: Awaited<ReturnType<typeof mountLine>>) => wrapper.find('[data-testid="node-auto-update-toggle-remote-1"]')

describe('NodeAutoUpdate', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    useAppUpdateStore().currentVersion = '1.5.12'
    h.list = { reachedAddressOf: vi.fn(() => ADDRESS) }
    outcomes = {}
    changed = null
    Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: api })
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: undefined })
  })

  it('a node that can update in place shows the switch, off by default, with what it means (AC-001)', async () => {
    const wrapper = await mountLine(older)
    expect(toggle(wrapper).attributes('aria-checked')).toBe('false')
    const block = wrapper.get('[data-testid="node-auto-update-remote-1"]')
    expect(block.text()).toContain('Update automatically')
    expect(block.text()).toContain("Keep this node on this app's version.")
  })

  it('turning it on is a desktop registry change for the row\'s entry; turning it off removes it (REQ-003, REQ-006)', async () => {
    const wrapper = await mountLine(older)
    await toggle(wrapper).trigger('click')
    await flushPromises()
    expect(api.upsertNodeRegistry).toHaveBeenCalledExactlyOnceWith({ type: 'set-auto-update', entryId: 'remote-1', enabled: true })
    expect(toggle(wrapper).attributes('aria-checked')).toBe('true')
  })

  it('a failed save says so and leaves the switch', async () => {
    api.upsertNodeRegistry.mockRejectedValueOnce(new Error('disk full'))
    const wrapper = await mountLine(older)
    await toggle(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-testid="node-auto-update-error-remote-1"]').exists()).toBe(true)
    expect(toggle(wrapper).attributes('aria-checked')).toBe('false')
  })

  it('no switch for a node that cannot update in place, unless it is on', async () => {
    const unavailable = { inPlaceUpdate: 'unavailable', version: '1.5.11' }
    expect(toggle(await mountLine(unavailable)).exists()).toBe(false)
    expect(toggle(await mountLine(unavailable, entry({ autoUpdate: true }))).attributes('aria-checked')).toBe('true')
  })

  it('not in a browser window (no desktop shell)', async () => {
    Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: undefined })
    expect(toggle(await mountLine(older)).exists()).toBe(false)
  })

  it('an automatic update says "Updated automatically to <version>", new this time, and is marked seen (REQ-005)', async () => {
    outcomes = { 'remote-1': { version: '1.5.12', requestedAt: '2026-11-01T10:00:00.000Z', outcome: 'AUTO_UPDATED', reason: null, read: false } }
    const wrapper = await mountLine({ ...older, version: '1.5.12', target: { version: '1.5.12', relation: 'same' } }, entry({ autoUpdate: true }))
    expect(wrapper.get('[data-testid="node-auto-update-updated-remote-1"]').text()).toContain('Updated automatically to 1.5.12')
    expect(wrapper.find('[data-testid="node-auto-update-new-remote-1"]').exists()).toBe(true)
    expect(api.markNodeAutoUpdateRead).toHaveBeenCalledExactlyOnceWith('remote-1')
  })

  it('a seen outcome shows without "New"', async () => {
    outcomes = { 'remote-1': { version: '1.5.12', requestedAt: '2026-11-01T10:00:00.000Z', outcome: 'AUTO_UPDATED', reason: null, read: true } }
    const wrapper = await mountLine(older, entry({ autoUpdate: true }))
    expect(wrapper.find('[data-testid="node-auto-update-updated-remote-1"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="node-auto-update-new-remote-1"]').exists()).toBe(false)
    expect(api.markNodeAutoUpdateRead).not.toHaveBeenCalled()
  })

  it('a failed automatic update says nothing was changed, with the node reason (AC-005)', async () => {
    const wrapper = await mountLine(older, entry({ autoUpdate: true }))
    expect(wrapper.find('[data-testid="node-auto-update-failed-remote-1"]').exists()).toBe(false)
    outcomes = { 'remote-1': { version: '1.5.12', requestedAt: '2026-11-01T10:00:00.000Z', outcome: 'AUTO_FAILED', reason: 'The new version did not start; rolled back to 1.5.11.', read: false } }
    changed!(outcomes)
    await flushPromises()
    const failure = wrapper.get('[data-testid="node-auto-update-failed-remote-1"]').text()
    expect(failure).toContain('Automatic update failed. Nothing was changed.')
    expect(failure).toContain('rolled back to 1.5.11.')
  })

  it('a pending attempt shows no outcome line', async () => {
    outcomes = { 'remote-1': { version: '1.5.12', requestedAt: '2026-11-01T10:00:00.000Z', outcome: 'PENDING', reason: null, read: false } }
    const wrapper = await mountLine(older, entry({ autoUpdate: true }))
    expect(wrapper.find('[data-testid="node-auto-update-updated-remote-1"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="node-auto-update-failed-remote-1"]').exists()).toBe(false)
  })
})
