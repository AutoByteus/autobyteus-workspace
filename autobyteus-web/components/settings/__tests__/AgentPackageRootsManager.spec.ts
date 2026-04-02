import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import AgentPackageRootsManager from '../AgentPackageRootsManager.vue'
import { useAgentPackageRootsStore } from '~/stores/agentPackageRootsStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      agentPackageRoots: {
        agentPackageRoots: [
          {
            path: '/default/root',
            sharedAgentCount: 2,
            teamLocalAgentCount: 1,
            agentTeamCount: 1,
            isDefault: true,
          },
          {
            path: '/custom/root',
            sharedAgentCount: 3,
            teamLocalAgentCount: 2,
            agentTeamCount: 2,
            isDefault: false,
          },
        ],
        loading: false,
        error: '',
      },
    },
  })
  setActivePinia(pinia)

  const store = useAgentPackageRootsStore()
  store.fetchAgentPackageRoots = vi.fn().mockResolvedValue(undefined)
  store.addAgentPackageRoot = vi.fn().mockResolvedValue(undefined)
  store.removeAgentPackageRoot = vi.fn().mockResolvedValue(undefined)
  store.clearError = vi.fn()

  const wrapper = mount(AgentPackageRootsManager, {
    global: {
      plugins: [pinia],
    },
  })
  await flushPromises()
  return { wrapper, store }
}

describe('AgentPackageRootsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads sources on mount', async () => {
    const { store } = await mountComponent()
    expect(store.fetchAgentPackageRoots).toHaveBeenCalledTimes(1)
  })

  it('adds a source path and shows success feedback', async () => {
    const { wrapper, store } = await mountComponent()

    await wrapper.get('[data-testid="agent-package-root-input"]').setValue('/new/source/root')
    await wrapper.get('[data-testid="agent-package-root-add-button"]').trigger('click')
    await flushPromises()

    expect(store.addAgentPackageRoot).toHaveBeenCalledWith('/new/source/root')
    expect(wrapper.text()).toContain('Agent package root added.')
  })

  it('removes a custom source path', async () => {
    const { wrapper, store } = await mountComponent()

    const removeButtons = wrapper.findAll('button').filter((entry) => entry.text() === 'Remove')
    expect(removeButtons.length).toBeGreaterThan(0)
    await removeButtons[0].trigger('click')
    await flushPromises()

    expect(store.removeAgentPackageRoot).toHaveBeenCalledWith('/custom/root')
    expect(wrapper.text()).toContain('Agent package root removed.')
  })
})
