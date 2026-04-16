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
            displayName: 'Platform Applications',
            sourceKind: 'BUILT_IN',
            sourceSummary: 'Managed by AutoByteus',
            applicationCount: 2,
            isPlatformOwned: true,
            isRemovable: false,
          },
          {
            packageId: 'application-local:%2Fcustom%2Froot',
            displayName: 'custom',
            sourceKind: 'LOCAL_PATH',
            sourceSummary: '/custom/root',
            applicationCount: 1,
            isPlatformOwned: false,
            isRemovable: true,
          },
        ],
        detailsByPackageId: {
          'built-in:applications': {
            packageId: 'built-in:applications',
            displayName: 'Platform Applications',
            sourceKind: 'BUILT_IN',
            sourceSummary: 'Managed by AutoByteus',
            applicationCount: 2,
            isPlatformOwned: true,
            isRemovable: false,
            rootPath: '/managed/platform',
            source: '/bundle/resources',
            managedInstallPath: '/managed/platform',
            bundledSourceRootPath: '/bundle/resources',
          },
        },
        loading: false,
        error: '',
      },
    },
  })
  setActivePinia(pinia)

  const store = useApplicationPackagesStore()
  store.fetchApplicationPackages = vi.fn().mockResolvedValue(undefined)
  store.fetchApplicationPackageDetails = vi.fn().mockResolvedValue(null)
  store.importApplicationPackage = vi.fn().mockResolvedValue(undefined)
  store.removeApplicationPackage = vi.fn().mockResolvedValue(undefined)
  store.clearError = vi.fn()

  const wrapper = mount(ApplicationPackagesManager, {
    global: {
      plugins: [pinia],
      mocks: {
        $t: (key: string, params?: Record<string, unknown>) => {
          if (key === 'settings.components.settings.ApplicationPackagesManager.applicationsCount') {
            return `Applications: ${String(params?.count ?? '')}`
          }
          const messages: Record<string, string> = {
            'settings.components.settings.ApplicationPackagesManager.title': 'Application Packages',
            'settings.components.settings.ApplicationPackagesManager.description': 'Description',
            'settings.components.settings.ApplicationPackagesManager.platformOwned': 'Platform-owned',
            'settings.components.settings.ApplicationPackagesManager.showDetails': 'Show details',
            'settings.components.settings.ApplicationPackagesManager.hideDetails': 'Hide details',
            'settings.components.settings.ApplicationPackagesManager.remove': 'Remove',
            'settings.components.settings.ApplicationPackagesManager.loadingDetails': 'Loading details...',
            'settings.components.settings.ApplicationPackagesManager.noDetails': 'No details',
            'settings.components.settings.ApplicationPackagesManager.emptyState': 'Empty',
            'settings.components.settings.ApplicationPackagesManager.packagePathOrGithubUrl': 'Package path or GitHub URL',
            'settings.components.settings.ApplicationPackagesManager.importPlaceholder': '/path or url',
            'settings.components.settings.ApplicationPackagesManager.working': 'Working...',
            'settings.components.settings.ApplicationPackagesManager.importPackage': 'Import Package',
            'settings.components.settings.ApplicationPackagesManager.details.rootPath': 'Root path',
            'settings.components.settings.ApplicationPackagesManager.details.source': 'Source',
            'settings.components.settings.ApplicationPackagesManager.details.managedInstallPath': 'Managed install path',
            'settings.components.settings.ApplicationPackagesManager.details.bundledSourceRootPath': 'Bundled source root',
          }
          return messages[key] ?? key
        },
      },
    },
  })
  await flushPromises()
  return { wrapper, store }
}

describe('ApplicationPackagesManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads packages on mount', async () => {
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

  it('loads details lazily for packages that are not cached yet', async () => {
    const { wrapper, store } = await mountComponent()

    const detailButtons = wrapper.findAll('button').filter((entry) => entry.text() === 'Show details')
    expect(detailButtons.length).toBeGreaterThan(1)

    await detailButtons[1]!.trigger('click')
    await flushPromises()

    expect(store.fetchApplicationPackageDetails).toHaveBeenCalledWith('application-local:%2Fcustom%2Froot')
  })

  it('removes a custom package entry by package id', async () => {
    const { wrapper, store } = await mountComponent()

    const removeButtons = wrapper.findAll('button').filter((entry) => entry.text() === 'Remove')
    expect(removeButtons.length).toBeGreaterThan(0)
    await removeButtons[0]!.trigger('click')
    await flushPromises()

    expect(store.removeApplicationPackage).toHaveBeenCalledWith('application-local:%2Fcustom%2Froot')
    expect(wrapper.text()).toContain('Application package removed.')
  })
})
