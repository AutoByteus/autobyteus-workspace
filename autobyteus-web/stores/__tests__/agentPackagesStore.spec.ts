import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  apolloClientMock,
  applicationStoreMock,
  agentDefinitionStoreMock,
  agentTeamDefinitionStoreMock,
} = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
  applicationStoreMock: {
    invalidateApplications: vi.fn(),
    fetchApplications: vi.fn().mockResolvedValue([]),
  },
  agentDefinitionStoreMock: {
    invalidateAgentDefinitions: vi.fn(),
    reloadAllAgentDefinitions: vi.fn().mockResolvedValue(undefined),
  },
  agentTeamDefinitionStoreMock: {
    invalidateAgentTeamDefinitions: vi.fn(),
    reloadAllAgentTeamDefinitions: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => apolloClientMock,
}))

vi.mock('~/graphql/agentPackages', () => ({
  CHECK_AGENT_PACKAGE_UPDATES: {},
  GET_AGENT_PACKAGES: {},
  IMPORT_AGENT_PACKAGE: {},
  RELOAD_AGENT_PACKAGE: {},
  REMOVE_AGENT_PACKAGE: {},
  UPDATE_AGENT_PACKAGE: {},
}))

vi.mock('~/stores/applicationStore', () => ({
  useApplicationStore: () => applicationStoreMock,
}))

vi.mock('~/stores/agentDefinitionStore', () => ({
  useAgentDefinitionStore: () => agentDefinitionStoreMock,
}))

vi.mock('~/stores/agentTeamDefinitionStore', () => ({
  useAgentTeamDefinitionStore: () => agentTeamDefinitionStoreMock,
}))

import { useAgentPackagesStore } from '../agentPackagesStore'

const expectDependentCatalogRefresh = () => {
  expect(applicationStoreMock.invalidateApplications).toHaveBeenCalledOnce()
  expect(agentDefinitionStoreMock.invalidateAgentDefinitions).toHaveBeenCalledOnce()
  expect(agentTeamDefinitionStoreMock.invalidateAgentTeamDefinitions).toHaveBeenCalledOnce()
  expect(applicationStoreMock.fetchApplications).toHaveBeenCalledWith(true)
  expect(agentDefinitionStoreMock.reloadAllAgentDefinitions).toHaveBeenCalledOnce()
  expect(agentTeamDefinitionStoreMock.reloadAllAgentTeamDefinitions).toHaveBeenCalledOnce()
}

describe('agentPackagesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    applicationStoreMock.fetchApplications.mockResolvedValue([])
    agentDefinitionStoreMock.reloadAllAgentDefinitions.mockResolvedValue(undefined)
    agentTeamDefinitionStoreMock.reloadAllAgentTeamDefinitions.mockResolvedValue(undefined)
  })

  it('refreshes dependent catalogs after a successful package import', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        importAgentPackage: [{ packageId: 'pkg-1', displayName: 'Pkg 1' }],
      },
      errors: [],
    })

    const store = useAgentPackagesStore()
    await store.importAgentPackage({
      sourceKind: 'LOCAL_PATH',
      source: '/tmp/pkg-1',
    })

    expect(store.agentPackages).toEqual([{ packageId: 'pkg-1', displayName: 'Pkg 1' }])
    expectDependentCatalogRefresh()
  })

  it('refreshes dependent catalogs after a successful package removal', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        removeAgentPackage: [{ packageId: 'built-in:default', displayName: 'Built-in' }],
      },
      errors: [],
    })

    const store = useAgentPackagesStore()
    await store.removeAgentPackage('pkg-2')

    expect(store.agentPackages).toEqual([{ packageId: 'built-in:default', displayName: 'Built-in' }])
    expectDependentCatalogRefresh()
  })

  it('refreshes dependent catalogs after a local package reload', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        reloadAgentPackage: [{ packageId: 'pkg-1', displayName: 'Pkg 1 reloaded' }],
      },
      errors: [],
    })

    const store = useAgentPackagesStore()
    await store.reloadAgentPackage('pkg-1')

    expect(store.agentPackages).toEqual([{ packageId: 'pkg-1', displayName: 'Pkg 1 reloaded' }])
    expect(store.isPackageActionLoading('pkg-1')).toBe(false)
    expectDependentCatalogRefresh()
  })

  it('updates package state after checking GitHub updates without refreshing dependent catalogs', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        checkAgentPackageUpdates: [{ packageId: 'github:pkg', displayName: 'GitHub Pkg' }],
      },
      errors: [],
    })

    const store = useAgentPackagesStore()
    await store.checkAgentPackageUpdates(['github:pkg'])

    expect(store.agentPackages).toEqual([{ packageId: 'github:pkg', displayName: 'GitHub Pkg' }])
    expect(applicationStoreMock.invalidateApplications).not.toHaveBeenCalled()
    expect(agentDefinitionStoreMock.invalidateAgentDefinitions).not.toHaveBeenCalled()
    expect(agentTeamDefinitionStoreMock.invalidateAgentTeamDefinitions).not.toHaveBeenCalled()
  })

  it('refreshes dependent catalogs after a managed GitHub package update', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        updateAgentPackage: [{ packageId: 'github:pkg', displayName: 'GitHub Pkg updated' }],
      },
      errors: [],
    })

    const store = useAgentPackagesStore()
    await store.updateAgentPackage('github:pkg')

    expect(store.agentPackages).toEqual([{ packageId: 'github:pkg', displayName: 'GitHub Pkg updated' }])
    expect(store.isPackageActionLoading('github:pkg')).toBe(false)
    expectDependentCatalogRefresh()
  })
})
