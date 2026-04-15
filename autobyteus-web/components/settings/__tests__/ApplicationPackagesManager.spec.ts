import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import { setActivePinia } from 'pinia'
import ApplicationPackagesManager from '../ApplicationPackagesManager.vue'
import { useApplicationPackagesStore } from '~/stores/applicationPackagesStore'

const flushPromises = async () => {
  await Promise.resolve()
  await new Promise<void>((resolve) => setTimeout(resolve, 0))
}

const mountComponent = async () => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      applicationPackages: {
        applicationPackages: [
          {
            packageId: 'built-in:applications',
            displayName: 'Built-in Applications',
            path: '/repo/root',
            sourceKind: 'BUILT_IN',
            source: '/repo/root',
            applicationCount: 2,
            isDefault: true,
            isRemovable: false,
          },
          {
            packageId: 'application-local:%2Fcustom%2Froot',
            displayName: 'custom',
            path: '/custom/root',
            sourceKind: 'LOCAL_PATH',
            source: '/custom/root',
            applicationCount: 1,
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

  const store = useApplicationPackagesStore()
  store.fetchApplicationPackages = vi.fn().mockResolvedValue(undefined)
  store.importApplicationPackage = vi.fn().mockResolvedValue(undefined)
  store.removeApplicationPackage = vi.fn().mockResolvedValue(undefined)
  store.clearError = vi.fn()

  const wrapper = mount(ApplicationPackagesManager, {
    global: {
      plugins: [pinia],
    },
  })
  await flushPromises()
  return { wrapper, store }
}

describe('ApplicationPackagesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads sources on mount', async () => {
    const { store } = await mountComponent()
    expect(store.fetchApplicationPackages).toHaveBeenCalledTimes(1)
  })

  it('imports a local path and shows success feedback', async () => {
    const { wrapper, store } = await mountComponent()

    await wrapper.get('[data-testid="application-package-source-input"]').setValue('/new/source/root')
    await wrapper.get('[data-testid="application-package-import-button"]').trigger('click')
    await flushPromises()

    expect(store.importApplicationPackage).toHaveBeenCalledWith({
      sourceKind: 'LOCAL_PATH',
      source: '/new/source/root',
    })
    expect(wrapper.text()).toContain('Application package imported.')
  })

  it('normalizes github.com input into a GitHub import', async () => {
    const { wrapper, store } = await mountComponent()

    await wrapper.get('[data-testid="application-package-source-input"]').setValue('github.com/AutoByteus/autobyteus-apps')
    await wrapper.get('[data-testid="application-package-import-button"]').trigger('click')
    await flushPromises()

    expect(store.importApplicationPackage).toHaveBeenCalledWith({
      sourceKind: 'GITHUB_REPOSITORY',
      source: 'https://github.com/AutoByteus/autobyteus-apps',
    })
  })

  it('removes a custom package entry by package id', async () => {
    const { wrapper, store } = await mountComponent()

    const removeButtons = wrapper.findAll('button').filter((entry) => entry.text() === 'Remove')
    expect(removeButtons.length).toBeGreaterThan(0)
    await removeButtons[0].trigger('click')
    await flushPromises()

    expect(store.removeApplicationPackage).toHaveBeenCalledWith('application-local:%2Fcustom%2Froot')
    expect(wrapper.text()).toContain('Application package removed.')
  })
})
