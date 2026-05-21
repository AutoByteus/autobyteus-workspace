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

const updateInfo = (overrides = {}) => ({
  status: 'NOT_APPLICABLE',
  canCheck: false,
  canUpdate: false,
  canReload: false,
  message: 'No update action.',
  installedRevision: null,
  latestRevision: null,
  checkedAt: null,
  lastError: null,
  ...overrides,
})

const defaultPackages = [
  {
    packageId: 'built-in:default',
    displayName: 'Built-in Storage',
    path: '/default/root',
    sourceKind: 'BUILT_IN',
    source: '/default/root',
    sharedAgentCount: 2,
    teamLocalAgentCount: 1,
    agentTeamCount: 1,
    applicationCount: 0,
    isDefault: true,
    isRemovable: false,
    updateInfo: updateInfo({ message: 'Built-in package is platform managed.' }),
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
    applicationCount: 0,
    isDefault: false,
    isRemovable: true,
    updateInfo: updateInfo({
      status: 'RELOAD_AVAILABLE',
      canReload: true,
      message: 'Reload after changing this local folder outside AutoByteus.',
    }),
  },
]

const mountComponent = async (packages = defaultPackages) => {
  const pinia = createTestingPinia({
    createSpy: vi.fn,
    stubActions: true,
    initialState: {
      agentPackages: {
        agentPackages: packages,
        loading: false,
        checkingUpdates: false,
        actionPackageIds: {},
        error: '',
      },
    },
  })
  setActivePinia(pinia)

  const store = useAgentPackagesStore()
  store.fetchAgentPackages = vi.fn().mockResolvedValue(undefined)
  store.importAgentPackage = vi.fn().mockResolvedValue(undefined)
  store.removeAgentPackage = vi.fn().mockResolvedValue(undefined)
  store.reloadAgentPackage = vi.fn().mockResolvedValue(undefined)
  store.checkAgentPackageUpdates = vi.fn().mockResolvedValue(undefined)
  store.updateAgentPackage = vi.fn().mockResolvedValue(undefined)
  store.isPackageActionLoading = vi.fn().mockReturnValue(false)
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

  it('renders reload for local rows and calls the store action', async () => {
    const { wrapper, store } = await mountComponent()

    await wrapper.get('[data-testid="agent-package-reload-button-local_3A_252Fcustom_252Froot"]').trigger('click')
    await flushPromises()

    expect(store.reloadAgentPackage).toHaveBeenCalledWith('local:%2Fcustom%2Froot')
    expect(wrapper.text()).toContain('Agent package reloaded.')
  })

  it('renders update only for GitHub rows with an available update', async () => {
    const githubPackage = {
      packageId: 'github:autobyteus/autobyteus-agents',
      displayName: 'AutoByteus/autobyteus-agents',
      path: '/managed/github/autobyteus__autobyteus-agents',
      sourceKind: 'GITHUB_REPOSITORY',
      source: 'https://github.com/AutoByteus/autobyteus-agents',
      sharedAgentCount: 1,
      teamLocalAgentCount: 0,
      agentTeamCount: 0,
      applicationCount: 0,
      isDefault: false,
      isRemovable: true,
      updateInfo: updateInfo({
        status: 'UPDATE_AVAILABLE',
        canCheck: true,
        canUpdate: true,
        message: 'Update available.',
        installedRevision: 'old',
        latestRevision: 'new',
      }),
    }
    const { wrapper, store } = await mountComponent([defaultPackages[0], githubPackage])

    expect(wrapper.text()).toContain('Update available.')
    await wrapper.get('[data-testid="agent-package-update-button-github_3Aautobyteus_2Fautobyteus-agents"]').trigger('click')
    await flushPromises()

    expect(store.checkAgentPackageUpdates).toHaveBeenCalledTimes(1)
    expect(store.updateAgentPackage).toHaveBeenCalledWith('github:autobyteus/autobyteus-agents')
    expect(wrapper.text()).toContain('Agent package updated.')
  })

  it('renders unknown GitHub revision state and calls check again for that row', async () => {
    const githubPackage = {
      packageId: 'github:autobyteus/unknown-agents',
      displayName: 'AutoByteus/unknown-agents',
      path: '/managed/github/autobyteus__unknown-agents',
      sourceKind: 'GITHUB_REPOSITORY',
      source: 'https://github.com/AutoByteus/unknown-agents',
      sharedAgentCount: 1,
      teamLocalAgentCount: 0,
      agentTeamCount: 0,
      applicationCount: 0,
      isDefault: false,
      isRemovable: true,
      updateInfo: updateInfo({
        status: 'UNKNOWN',
        canCheck: true,
        canUpdate: true,
        message: 'Installed revision is unknown. Update to latest to normalize it.',
      }),
    }
    const { wrapper, store } = await mountComponent([defaultPackages[0], githubPackage])

    expect(wrapper.text()).toContain('Installed revision is unknown. Update to latest to normalize it.')
    expect(wrapper.find('[data-testid="agent-package-update-button-github_3Aautobyteus_2Funknown-agents"]').exists()).toBe(true)

    await wrapper.get('[data-testid="agent-package-check-button-github_3Aautobyteus_2Funknown-agents"]').trigger('click')
    await flushPromises()

    expect(store.checkAgentPackageUpdates).toHaveBeenNthCalledWith(1)
    expect(store.checkAgentPackageUpdates).toHaveBeenNthCalledWith(2, ['github:autobyteus/unknown-agents'])
    expect(wrapper.text()).toContain('Agent package update status refreshed.')
  })

  it('shows failed update feedback from the store error state', async () => {
    const githubPackage = {
      packageId: 'github:autobyteus/failing-agents',
      displayName: 'AutoByteus/failing-agents',
      path: '/managed/github/autobyteus__failing-agents',
      sourceKind: 'GITHUB_REPOSITORY',
      source: 'https://github.com/AutoByteus/failing-agents',
      sharedAgentCount: 1,
      teamLocalAgentCount: 0,
      agentTeamCount: 0,
      applicationCount: 0,
      isDefault: false,
      isRemovable: true,
      updateInfo: updateInfo({
        status: 'UPDATE_FAILED',
        canCheck: true,
        canUpdate: true,
        message: 'Last update failed: download failed.',
        lastError: 'download failed',
      }),
    }
    const { wrapper, store } = await mountComponent([defaultPackages[0], githubPackage])
    store.updateAgentPackage = vi.fn(async () => {
      store.error = 'Last update failed: download failed.'
      throw new Error('download failed')
    })

    await wrapper.get('[data-testid="agent-package-update-button-github_3Aautobyteus_2Ffailing-agents"]').trigger('click')
    await flushPromises()

    expect(store.updateAgentPackage).toHaveBeenCalledWith('github:autobyteus/failing-agents')
    expect(wrapper.text()).toContain('Last update failed: download failed.')
    expect(wrapper.text()).not.toContain('Agent package updated.')
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
