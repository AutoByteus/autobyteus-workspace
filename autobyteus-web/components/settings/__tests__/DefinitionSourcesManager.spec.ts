import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import DefinitionSourcesManager from '../DefinitionSourcesManager.vue'
import { useDefinitionSourcesStore } from '~/stores/definitionSourcesStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      definitionSources: {
        definitionSources: [
          {
            path: '/default/root',
            agentCount: 2,
            agentTeamCount: 1,
            isDefault: true,
          },
          {
            path: '/custom/root',
            agentCount: 3,
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

  const store = useDefinitionSourcesStore()
  store.fetchDefinitionSources = vi.fn().mockResolvedValue(undefined)
  store.addDefinitionSource = vi.fn().mockResolvedValue(undefined)
  store.removeDefinitionSource = vi.fn().mockResolvedValue(undefined)
  store.clearError = vi.fn()

  const wrapper = mount(DefinitionSourcesManager, {
    global: {
      plugins: [pinia],
    },
  })
  await flushPromises()
  return { wrapper, store }
}

describe('DefinitionSourcesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads sources on mount', async () => {
    const { store } = await mountComponent()
    expect(store.fetchDefinitionSources).toHaveBeenCalledTimes(1)
  })

  it('adds a source path and shows success feedback', async () => {
    const { wrapper, store } = await mountComponent()

    await wrapper.get('[data-testid="definition-source-input"]').setValue('/new/source/root')
    await wrapper.get('[data-testid="definition-source-add-button"]').trigger('click')
    await flushPromises()

    expect(store.addDefinitionSource).toHaveBeenCalledWith('/new/source/root')
    expect(wrapper.text()).toContain('Import path added.')
  })

  it('removes a custom source path', async () => {
    const { wrapper, store } = await mountComponent()

    const removeButtons = wrapper.findAll('button').filter((entry) => entry.text() === 'Remove')
    expect(removeButtons.length).toBeGreaterThan(0)
    await removeButtons[0].trigger('click')
    await flushPromises()

    expect(store.removeDefinitionSource).toHaveBeenCalledWith('/custom/root')
    expect(wrapper.text()).toContain('Import path removed.')
  })
})
