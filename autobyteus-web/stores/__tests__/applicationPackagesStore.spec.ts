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

vi.mock('~/graphql/applicationPackages', () => ({
  GET_APPLICATION_PACKAGES: {},
  GET_APPLICATION_PACKAGE_DETAILS: {},
  IMPORT_APPLICATION_PACKAGE: {},
  REMOVE_APPLICATION_PACKAGE: {},
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

import { useApplicationPackagesStore } from '../applicationPackagesStore'

describe('applicationPackagesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    applicationStoreMock.fetchApplications.mockResolvedValue([])
    agentDefinitionStoreMock.reloadAllAgentDefinitions.mockResolvedValue(undefined)
    agentTeamDefinitionStoreMock.reloadAllAgentTeamDefinitions.mockResolvedValue(undefined)
  })

  it('fetches and caches application package details', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: {
        applicationPackageDetails: {
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
      errors: [],
    })

    const store = useApplicationPackagesStore()
    const details = await store.fetchApplicationPackageDetails('built-in:applications')

    expect(details).toMatchObject({
      packageId: 'built-in:applications',
      rootPath: '/managed/platform',
      bundledSourceRootPath: '/bundle/resources',
    })
    expect(store.getApplicationPackageDetails('built-in:applications')).toMatchObject({
      rootPath: '/managed/platform',
    })

    await store.fetchApplicationPackageDetails('built-in:applications')
    expect(apolloClientMock.query).toHaveBeenCalledTimes(1)
  })

  it('refreshes the application and imported-definition catalogs after a successful package import', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        importApplicationPackage: [{
          packageId: 'application-pkg-1',
          displayName: 'Pkg 1',
          sourceKind: 'LOCAL_PATH',
          sourceSummary: '/tmp/application-pkg-1',
          applicationCount: 1,
          isPlatformOwned: false,
          isRemovable: true,
        }],
      },
      errors: [],
    })

    const store = useApplicationPackagesStore()
    store.detailsByPackageId = {
      'stale-package': {
        packageId: 'stale-package',
        displayName: 'Stale',
        sourceKind: 'LOCAL_PATH',
        sourceSummary: '/tmp/stale',
        applicationCount: 1,
        isPlatformOwned: false,
        isRemovable: true,
        rootPath: '/tmp/stale',
        source: '/tmp/stale',
      },
    }

    await store.importApplicationPackage({
      sourceKind: 'LOCAL_PATH',
      source: '/tmp/application-pkg-1',
    })

    expect(store.applicationPackages).toEqual([{ 
      packageId: 'application-pkg-1',
      displayName: 'Pkg 1',
      sourceKind: 'LOCAL_PATH',
      sourceSummary: '/tmp/application-pkg-1',
      applicationCount: 1,
      isPlatformOwned: false,
      isRemovable: true,
    }])
    expect(store.detailsByPackageId).toEqual({})
    expect(applicationStoreMock.invalidateApplications).toHaveBeenCalledOnce()
    expect(agentDefinitionStoreMock.invalidateAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.invalidateAgentTeamDefinitions).toHaveBeenCalledOnce()
    expect(applicationStoreMock.fetchApplications).toHaveBeenCalledWith(true)
    expect(agentDefinitionStoreMock.reloadAllAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.reloadAllAgentTeamDefinitions).toHaveBeenCalledOnce()
  })

  it('refreshes the application and imported-definition catalogs after a successful package removal', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        removeApplicationPackage: [{
          packageId: 'built-in:applications',
          displayName: 'Platform Applications',
          sourceKind: 'BUILT_IN',
          sourceSummary: 'Managed by AutoByteus',
          applicationCount: 2,
          isPlatformOwned: true,
          isRemovable: false,
        }],
      },
      errors: [],
    })

    const store = useApplicationPackagesStore()
    store.detailsByPackageId = {
      'application-pkg-2': {
        packageId: 'application-pkg-2',
        displayName: 'Pkg 2',
        sourceKind: 'LOCAL_PATH',
        sourceSummary: '/tmp/application-pkg-2',
        applicationCount: 1,
        isPlatformOwned: false,
        isRemovable: true,
        rootPath: '/tmp/application-pkg-2',
        source: '/tmp/application-pkg-2',
      },
    }

    await store.removeApplicationPackage('application-pkg-2')

    expect(store.applicationPackages).toEqual([{ 
      packageId: 'built-in:applications',
      displayName: 'Platform Applications',
      sourceKind: 'BUILT_IN',
      sourceSummary: 'Managed by AutoByteus',
      applicationCount: 2,
      isPlatformOwned: true,
      isRemovable: false,
    }])
    expect(store.detailsByPackageId).toEqual({})
    expect(applicationStoreMock.invalidateApplications).toHaveBeenCalledOnce()
    expect(agentDefinitionStoreMock.invalidateAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.invalidateAgentTeamDefinitions).toHaveBeenCalledOnce()
    expect(applicationStoreMock.fetchApplications).toHaveBeenCalledWith(true)
    expect(agentDefinitionStoreMock.reloadAllAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.reloadAllAgentTeamDefinitions).toHaveBeenCalledOnce()
  })
})
