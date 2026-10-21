import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import RemoteCollaborationCard from '../RemoteCollaborationCard.vue'

const { slots } = vi.hoisted(() => ({ slots: { store: null as any, capability: null as any } }))

vi.mock('~/stores/remoteCollaborationStore', () => ({ useRemoteCollaborationStore: () => slots.store }))
vi.mock('~/stores/remoteCollaborationCapabilityStore', () => ({ useRemoteCollaborationCapabilityStore: () => slots.capability }))
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key.split('.').slice(-2).join('.') }) }))

const peer = { nodeId: 'srv_b', name: 'docker', baseUrl: 'http://localhost:29700', addedAt: '2026-10-20T09:00:00.000Z' }

const mountCard = (enabled: boolean) => {
  slots.capability = reactive({ status: 'resolved', isEnabled: enabled, capability: { enabled, settingKey: 'ENABLE_REMOTE_COLLABORATION', source: enabled ? 'SERVER_SETTING' : 'DEFAULT_DISABLED' },
    error: null, ensureResolved: vi.fn(async () => undefined), setEnabled: vi.fn() })
  slots.store = reactive({
    peers: [peer], loading: false, saving: false, error: null as string | null, errorScope: null as string | null,
    load: vi.fn(async () => undefined), addPeer: vi.fn(async () => true), renamePeer: vi.fn(async () => true), removePeer: vi.fn(async () => true),
  })
  return mount(RemoteCollaborationCard, {
    global: {
      stubs: {
        FeatureCapabilityToggleCard: { template: '<div data-testid="toggle-card" />' },
      },
    },
  })
}

describe('RemoteCollaborationCard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('loads the settings, lists the peers and says which agents peers can start and how they run; there is no publish list', async () => {
    const wrapper = mountCard(true)
    await nextTick()
    expect(slots.store.load).toHaveBeenCalledOnce()
    expect(slots.capability.ensureResolved).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="remote-collaboration-peer-srv_b"]').text()).toContain('docker')
    expect(wrapper.get('[data-testid="remote-collaboration-peer-srv_b"]').text()).toContain('http://localhost:29700')
    expect(wrapper.get('[data-testid="remote-collaboration-availability"]').text()).toContain('availability.note')
    expect(wrapper.find('[data-testid="remote-collaboration-published"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="remote-collaboration-publish-start"]').exists()).toBe(false)
  })

  it('adds a peer by URL and name only while the switch is on', async () => {
    const off = mountCard(false)
    await off.get('[data-testid="remote-collaboration-peer-url"]').setValue('http://b:29700')
    await off.get('[data-testid="remote-collaboration-peer-name"]').setValue('docker2')
    expect(off.get('[data-testid="remote-collaboration-peer-add"]').attributes('disabled')).toBeDefined()
    expect(off.find('[data-testid="remote-collaboration-peer-switch-hint"]').exists()).toBe(true)

    const on = mountCard(true)
    await on.get('[data-testid="remote-collaboration-peer-url"]').setValue(' http://b:29700 ')
    await on.get('[data-testid="remote-collaboration-peer-name"]').setValue('docker2')
    await on.get('[data-testid="remote-collaboration-add-peer"]').trigger('submit')
    expect(slots.store.addPeer).toHaveBeenCalledWith({ baseUrl: 'http://b:29700', name: 'docker2' })
  })

  it('removes a peer', async () => {
    const wrapper = mountCard(true)
    await wrapper.get('[data-testid="remote-collaboration-peer-remove-srv_b"]').trigger('click')
    expect(slots.store.removePeer).toHaveBeenCalledWith('srv_b')
  })

  it('shows the server reason of a refused change next to the action that failed', async () => {
    const wrapper = mountCard(true)
    slots.store.error = 'Another peer is already named \'docker\'.'
    slots.store.errorScope = 'peers'
    await nextTick()
    expect(wrapper.get('[data-testid="remote-collaboration-peers-error"]').text()).toBe('Another peer is already named \'docker\'.')
    expect(wrapper.find('[data-testid="remote-collaboration-error"]').exists()).toBe(false)
    slots.store.error = 'The server could not be reached.'
    slots.store.errorScope = 'load'
    await nextTick()
    expect(wrapper.get('[data-testid="remote-collaboration-error"]').text()).toBe('The server could not be reached.')
    expect(wrapper.find('[data-testid="remote-collaboration-peers-error"]').exists()).toBe(false)
  })
})
