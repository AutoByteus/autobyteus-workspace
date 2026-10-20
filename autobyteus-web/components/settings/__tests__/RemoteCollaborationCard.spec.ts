import { describe, expect, it, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import RemoteCollaborationCard from '../RemoteCollaborationCard.vue'

const { slots } = vi.hoisted(() => ({ slots: { store: null as any, capability: null as any } }))

vi.mock('~/stores/remoteCollaborationStore', () => ({ useRemoteCollaborationStore: () => slots.store }))
vi.mock('~/stores/remoteCollaborationCapabilityStore', () => ({ useRemoteCollaborationCapabilityStore: () => slots.capability }))
vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => ({
    agentDefinitions: [
      { id: 'publisher', name: 'Publisher', ownershipScope: 'SHARED', defaultLaunchConfig: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet', llmConfig: null } },
      { id: 'team-local', name: 'Local', ownershipScope: 'TEAM_LOCAL' },
    ],
    fetchAllAgentDefinitions: vi.fn(async () => undefined),
  }),
}))
vi.mock('~/composables/useLocalization', () => ({ useLocalization: () => ({ t: (key: string) => key.split('.').slice(-2).join('.') }) }))

const peer = { nodeId: 'srv_b', name: 'docker', baseUrl: 'http://localhost:29700', addedAt: '2026-10-20T09:00:00.000Z' }
const published = {
  agentDefinitionId: 'publisher', definitionName: 'Publisher', address: '/publisher', runtimeKind: 'claude_agent_sdk',
  llmModelIdentifier: 'sonnet', llmConfig: null, workspaceRootPath: '/work', autoExecuteTools: false, publishedAt: '2026-10-20T09:05:00.000Z',
}

const mountCard = (enabled: boolean) => {
  slots.capability = reactive({ status: 'resolved', isEnabled: enabled, capability: { enabled, settingKey: 'ENABLE_REMOTE_COLLABORATION', source: enabled ? 'SERVER_SETTING' : 'DEFAULT_DISABLED' },
    error: null, ensureResolved: vi.fn(async () => undefined), setEnabled: vi.fn() })
  slots.store = reactive({
    peers: [peer], publishedAgents: [published], loading: false, saving: false, error: null as string | null, errorScope: null as string | null,
    load: vi.fn(async () => undefined), addPeer: vi.fn(async () => true), renamePeer: vi.fn(async () => true), removePeer: vi.fn(async () => true),
    publishAgent: vi.fn(async () => true), updatePublishedAgent: vi.fn(async () => true), unpublishAgent: vi.fn(async () => true),
  })
  return mount(RemoteCollaborationCard, {
    global: {
      stubs: {
        FeatureCapabilityToggleCard: { template: '<div data-testid="toggle-card" />' },
        RuntimeModelConfigFields: { template: '<div data-testid="runtime-model-fields" />' },
        ApplicationWorkspaceRootSelector: { props: ['modelValue'], emits: ['update:modelValue'],
          template: '<input data-testid="workspace" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
      },
    },
  })
}

describe('RemoteCollaborationCard', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('loads the settings and lists the peers and published agents with their launch settings', async () => {
    const wrapper = mountCard(true)
    await nextTick()
    expect(slots.store.load).toHaveBeenCalledOnce()
    expect(slots.capability.ensureResolved).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="remote-collaboration-peer-srv_b"]').text()).toContain('docker')
    expect(wrapper.get('[data-testid="remote-collaboration-peer-srv_b"]').text()).toContain('http://localhost:29700')
    const row = wrapper.get('[data-testid="remote-collaboration-published-publisher"]').text()
    expect(row).toContain('Publisher')
    expect(row).toContain('/publisher')
    expect(row).toContain('claude_agent_sdk · sonnet · /work')
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

  it('removes a peer and unpublishes an agent', async () => {
    const wrapper = mountCard(true)
    await wrapper.get('[data-testid="remote-collaboration-peer-remove-srv_b"]').trigger('click')
    expect(slots.store.removePeer).toHaveBeenCalledWith('srv_b')
    await wrapper.get('[data-testid="remote-collaboration-unpublish-publisher"]').trigger('click')
    expect(slots.store.unpublishAgent).toHaveBeenCalledWith('publisher')
  })

  it('publishes a shared agent with its default runtime and model, a workspace and auto-approve off by default', async () => {
    const wrapper = mountCard(true)
    slots.store.publishedAgents = []
    await nextTick()
    await wrapper.get('[data-testid="remote-collaboration-publish-start"]').trigger('click')
    const select = wrapper.get('[data-testid="remote-collaboration-publish-agent"]')
    expect(select.findAll('option').map((option) => option.attributes('value'))).toEqual(['', 'publisher'])
    await select.setValue('publisher')
    expect(wrapper.get('[data-testid="remote-collaboration-publish-save"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-testid="workspace"]').setValue('/home/me/publishing')
    expect((wrapper.get('[data-testid="remote-collaboration-publish-auto-approve"]').element as HTMLInputElement).checked).toBe(false)
    await wrapper.get('[data-testid="remote-collaboration-publish-form"]').trigger('submit')
    expect(slots.store.publishAgent).toHaveBeenCalledWith({ agentDefinitionId: 'publisher', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'sonnet',
      llmConfig: null, workspaceRootPath: '/home/me/publishing', autoExecuteTools: false })
  })

  it('shows the server reason of a refused change next to the action that failed', async () => {
    const wrapper = mountCard(true)
    slots.store.error = 'Another peer is already named \'docker\'.'
    slots.store.errorScope = 'peers'
    await nextTick()
    expect(wrapper.get('[data-testid="remote-collaboration-peers-error"]').text()).toBe('Another peer is already named \'docker\'.')
    expect(wrapper.find('[data-testid="remote-collaboration-published-error"]').exists()).toBe(false)
    slots.store.error = 'The model \'sonnet\' is not available on claude_agent_sdk.'
    slots.store.errorScope = 'published'
    await nextTick()
    expect(wrapper.get('[data-testid="remote-collaboration-published-error"]').text()).toContain('not available')
    expect(wrapper.find('[data-testid="remote-collaboration-peers-error"]').exists()).toBe(false)
  })
})
