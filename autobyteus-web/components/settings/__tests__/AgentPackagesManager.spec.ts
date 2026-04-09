import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import AgentPackagesManager from '../AgentPackagesManager.vue'
import { useAgentPackagesStore } from '~/stores/agentPackagesStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      agentPackages: {
        agentPackages: [
          {
            packageId: 'built-in:default',
            displayName: 'Built-in Storage',
            path: '/default/root',
            sourceKind: 'BUILT_IN',
            source: '/default/root',
            sharedAgentCount: 2,
            teamLocalAgentCount: 1,
            agentTeamCount: 1,
            isDefault: true,
            isRemovable: false,
          },
          {
            packageId: 'local:%2Fcustom%2Froot',
            displayName: 'custom',
            path: '/custom/root',
            sourceKind: 'LOCAL_PATH',
            source: '/custom/root',
            sharedAgentCount: 3,
            teamLocalAgentCount: 2,
            agentTeamCount: 2,
            isDefault: false,
            isRemovable: true,
          },
        ],
        loading: false,
        error: '',
      },
    },
  })
  setActivePinia(pinia)

  const store = useAgentPackagesStore()
  store.fetchAgentPackages = vi.fn().mockResolvedValue(undefined)
  store.importAgentPackage = vi.fn().mockResolvedValue(undefined)
  store.removeAgentPackage = vi.fn().mockResolvedValue(undefined)
  store.clearError = vi.fn()

  const wrapper = mount(AgentPackagesManager, {
    global: {
      plugins: [pinia],
    },
  })
  await flushPromises()
  return { wrapper, store }
}

describe('AgentPackagesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads sources on mount', async () => {
    const { store } = await mountComponent()
    expect(store.fetchAgentPackages).toHaveBeenCalledTimes(1)
  })

  it('imports a local path and shows success feedback', async () => {
    const { wrapper, store } = await mountComponent()

    await wrapper.get('[data-testid="agent-package-source-input"]').setValue('/new/source/root')
    await wrapper.get('[data-testid="agent-package-import-button"]').trigger('click')
    await flushPromises()

    expect(store.importAgentPackage).toHaveBeenCalledWith({
      sourceKind: 'LOCAL_PATH',
      source: '/new/source/root',
    })
    expect(wrapper.text()).toContain('Agent package imported.')
  })

  it('normalizes github.com input into a GitHub import', async () => {
    const { wrapper, store } = await mountComponent()

    await wrapper.get('[data-testid="agent-package-source-input"]').setValue('github.com/AutoByteus/autobyteus-agents')
    await wrapper.get('[data-testid="agent-package-import-button"]').trigger('click')
    await flushPromises()

    expect(store.importAgentPackage).toHaveBeenCalledWith({
      sourceKind: 'GITHUB_REPOSITORY',
      source: 'https://github.com/AutoByteus/autobyteus-agents',
    })
  })

  it('removes a custom package entry by package id', async () => {
    const { wrapper, store } = await mountComponent()

    const removeButtons = wrapper.findAll('button').filter((entry) => entry.text() === 'Remove')
    expect(removeButtons.length).toBeGreaterThan(0)
    await removeButtons[0].trigger('click')
    await flushPromises()

    expect(store.removeAgentPackage).toHaveBeenCalledWith('local:%2Fcustom%2Froot')
    expect(wrapper.text()).toContain('Agent package removed.')
  })
})
