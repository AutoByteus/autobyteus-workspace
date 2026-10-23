import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import RemoteCollaborationCard from '../RemoteCollaborationCard.vue'

const { slots } = vi.hoisted(() => ({ slots: { store: null as any, capability: null as any, offers: null as any } }))

vi.mock('~/stores/remoteCollaborationStore', () => ({ useRemoteCollaborationStore: () => slots.store }))
vi.mock('~/stores/remoteCollaborationCapabilityStore', () => ({ useRemoteCollaborationCapabilityStore: () => slots.capability }))
vi.mock('~/stores/remoteCollaborationOffersStore', () => ({ useRemoteCollaborationOffersStore: () => slots.offers }))
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key.split('.').slice(-2).join('.'), resolvedLocale: { value: 'en' } }) }))

const peer = { nodeId: 'srv_b', name: 'docker', baseUrl: 'http://localhost:29700', addedAt: '2026-10-20T09:00:00.000Z' }

const mountCard = (enabled: boolean) => {
  slots.capability = reactive({ status: 'resolved', isEnabled: enabled, capability: { enabled, settingKey: 'ENABLE_REMOTE_COLLABORATION', source: enabled ? 'SERVER_SETTING' : 'DEFAULT_DISABLED' },
    error: null, ensureResolved: vi.fn(async () => undefined), setEnabled: vi.fn() })
  slots.store = reactive({
    peers: [peer], loading: false, saving: false, error: null as string | null, errorScope: null as string | null,
    load: vi.fn(async () => undefined), addPeer: vi.fn(async () => ({ ...peer, nodeId: 'srv_new', name: 'docker2' })), renamePeer: vi.fn(async () => true),
    removePeer: vi.fn(async () => true),
  })
  slots.offers = reactive({ peers: {} as Record<string, unknown>, askAll: vi.fn(), ask: vi.fn(async () => undefined), forget: vi.fn(), clear: vi.fn() })
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

  it('loads the settings and lists the peers; the rules are one collapsed line, and there is no availability card (BEH-502)', async () => {
    const wrapper = mountCard(true)
    await nextTick()
    expect(slots.store.load).toHaveBeenCalledOnce()
    expect(slots.capability.ensureResolved).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="remote-collaboration-peer-srv_b"]').text()).toContain('docker')
    expect(wrapper.get('[data-testid="remote-collaboration-peer-srv_b"]').text()).toContain('http://localhost:29700')
    expect(wrapper.find('[data-testid="remote-collaboration-availability"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="remote-collaboration-rules"]').exists()).toBe(false)
    const toggle = wrapper.get('[data-testid="remote-collaboration-rules-toggle"]')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(toggle.text()).toBe('rules.title')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    const rules = wrapper.get('[data-testid="remote-collaboration-rules"]')
    expect(rules.get('p').text()).toBe('rules.lead')
    expect(rules.findAll('li').map((item) => item.text())).toEqual(['rules.runtime', 'rules.workspace', 'rules.login', 'rules.refused'])
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

  describe('the peers\' offers (autobyteus-267)', () => {
    it('REQ-504: opening the tab with the switch on asks every peer once, after the peers are loaded', async () => {
      const wrapper = mountCard(true)
      await flushPromises()
      expect(slots.offers.askAll).toHaveBeenCalledOnce()
      expect(slots.offers.askAll).toHaveBeenCalledWith([peer])
      expect(slots.offers.ask).not.toHaveBeenCalled()
      // Leaving the tab drops every state; nothing polls.
      wrapper.unmount()
      expect(slots.offers.clear).toHaveBeenCalledOnce()
    })

    it('REQ-508 / AC-505: with the switch off nobody is asked and the notice says why; turning it on asks every peer, off clears', async () => {
      const wrapper = mountCard(false)
      await flushPromises()
      expect(slots.offers.askAll).not.toHaveBeenCalled()
      expect(wrapper.get('[data-testid="remote-collaboration-peers-off-notice"]').text()).toBe('peers.switchOff')
      expect(wrapper.find('[data-testid="remote-collaboration-peer-refresh-srv_b"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="remote-collaboration-peer-remove-srv_b"]').exists()).toBe(true)
      slots.capability.isEnabled = true
      await flushPromises()
      expect(slots.offers.askAll).toHaveBeenCalledWith([peer])
      expect(wrapper.find('[data-testid="remote-collaboration-peers-off-notice"]').exists()).toBe(false)
      slots.capability.isEnabled = false
      await flushPromises()
      expect(slots.offers.clear).toHaveBeenCalledOnce()
    })

    it('a peer just added is asked at once; a removed peer\'s state is dropped only when the removal is accepted', async () => {
      const wrapper = mountCard(true)
      await flushPromises()
      await wrapper.get('[data-testid="remote-collaboration-peer-url"]').setValue('http://b:29700')
      await wrapper.get('[data-testid="remote-collaboration-peer-name"]').setValue('docker2')
      await wrapper.get('[data-testid="remote-collaboration-add-peer"]').trigger('submit')
      await flushPromises()
      expect(slots.offers.ask).toHaveBeenCalledWith('srv_new')
      slots.store.addPeer.mockResolvedValueOnce(null)
      await wrapper.get('[data-testid="remote-collaboration-peer-url"]').setValue('http://web')
      await wrapper.get('[data-testid="remote-collaboration-peer-name"]').setValue('web')
      await wrapper.get('[data-testid="remote-collaboration-add-peer"]').trigger('submit')
      await flushPromises()
      expect(slots.offers.ask).toHaveBeenCalledTimes(1)

      slots.store.removePeer.mockResolvedValueOnce(false)
      await wrapper.get('[data-testid="remote-collaboration-peer-remove-srv_b"]').trigger('click')
      await flushPromises()
      expect(slots.offers.forget).not.toHaveBeenCalled()
      await wrapper.get('[data-testid="remote-collaboration-peer-remove-srv_b"]').trigger('click')
      await flushPromises()
      expect(slots.offers.forget).toHaveBeenCalledWith('srv_b')
    })

    it('ST-02: Checking… with a spinner and the waiting sentence; Refresh is disabled', async () => {
      const wrapper = mountCard(true)
      slots.offers.peers = { srv_b: { phase: 'checking' } }
      await flushPromises()
      const chip = wrapper.get('[data-testid="remote-collaboration-peer-status-srv_b"]')
      expect(chip.attributes('role')).toBe('status')
      expect(chip.text()).toBe('status.waiting')
      expect(chip.find('.animate-spin').exists()).toBe(true)
      expect(wrapper.get('[data-testid="remote-collaboration-peer-detail-srv_b"]').text()).toBe('detail.waiting')
      const refresh = wrapper.get('[data-testid="remote-collaboration-peer-refresh-srv_b"]')
      expect(refresh.attributes('disabled')).toBeDefined()
      expect(refresh.attributes('aria-label')).toBe('peers.refreshLabel')
    })

    it('ST-03 … ST-06: each refusal has its chip colour, its wording and its sentence; Refresh asks only that peer', async () => {
      const wrapper = mountCard(true)
      await flushPromises()
      for (const [code, colour] of [['REMOTE_COLLABORATION_OFF', 'amber'], ['PEER_NOT_REGISTERED', 'amber'], ['PEER_UNREACHABLE', 'red'], ['PEER_IDENTITY_MISMATCH', 'red']]) {
        slots.offers.peers = { srv_b: { phase: 'unavailable', code } }
        await nextTick()
        const chip = wrapper.get('[data-testid="remote-collaboration-peer-status-srv_b"]')
        expect(chip.text()).toBe(`status.${code}`)
        expect(chip.classes()).toEqual(expect.arrayContaining([`bg-${colour}-100`, `text-${colour}-700`]))
        expect(wrapper.get('[data-testid="remote-collaboration-peer-detail-srv_b"]').text()).toBe(`detail.${code}`)
      }
      const refresh = wrapper.get('[data-testid="remote-collaboration-peer-refresh-srv_b"]')
      expect(refresh.attributes('disabled')).toBeUndefined()
      await refresh.trigger('click')
      expect(slots.offers.ask).toHaveBeenCalledExactlyOnceWith('srv_b')
    })

    it('ST-01 / ST-07: Available shows the offer line, or the empty sentence; an unknown peer state shows nothing', async () => {
      const wrapper = mountCard(true)
      await flushPromises()
      expect(wrapper.find('[data-testid="remote-collaboration-peer-status-srv_b"]').exists()).toBe(false)
      slots.offers.peers = { srv_b: { phase: 'available', checkedAt: '2026-10-21T09:41:00.000Z', entries: [
        { name: 'Code Reviewer', kind: 'agent' }, { name: 'Studio Team', kind: 'agent_team', description: 'Writes' }] } }
      await nextTick()
      const chip = wrapper.get('[data-testid="remote-collaboration-peer-status-srv_b"]')
      expect(chip.text()).toBe('status.available')
      expect(chip.classes()).toEqual(expect.arrayContaining(['bg-green-100', 'text-green-700']))
      expect(wrapper.find('[data-testid="remote-collaboration-peer-offer-srv_b"]').exists()).toBe(true)
      slots.offers.peers = { srv_b: { phase: 'available', checkedAt: '2026-10-21T09:41:00.000Z', entries: [] } }
      await nextTick()
      expect(wrapper.get('[data-testid="remote-collaboration-peer-empty-srv_b"]').text()).toBe('peers.emptyOffer')
      expect(wrapper.find('[data-testid="remote-collaboration-peer-offer-srv_b"]').exists()).toBe(false)
    })
  })
})
