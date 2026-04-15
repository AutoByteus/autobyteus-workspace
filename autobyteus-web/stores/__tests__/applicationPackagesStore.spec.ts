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

  it('refreshes the application and imported-definition catalogs after a successful package import', async () => {
    apolloClientMock.mutate.mockResolvedValue({
      data: {
        importApplicationPackage: [{ packageId: 'application-pkg-1', displayName: 'Pkg 1' }],
      },
      errors: [],
    })

    const store = useApplicationPackagesStore()
    await store.importApplicationPackage({
      sourceKind: 'LOCAL_PATH',
      source: '/tmp/application-pkg-1',
    })

    expect(store.applicationPackages).toEqual([{ packageId: 'application-pkg-1', displayName: 'Pkg 1' }])
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
        removeApplicationPackage: [{ packageId: 'built-in:applications', displayName: 'Built-in Applications' }],
      },
      errors: [],
    })

    const store = useApplicationPackagesStore()
    await store.removeApplicationPackage('application-pkg-2')

    expect(store.applicationPackages).toEqual([{ packageId: 'built-in:applications', displayName: 'Built-in Applications' }])
    expect(applicationStoreMock.invalidateApplications).toHaveBeenCalledOnce()
    expect(agentDefinitionStoreMock.invalidateAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.invalidateAgentTeamDefinitions).toHaveBeenCalledOnce()
    expect(applicationStoreMock.fetchApplications).toHaveBeenCalledWith(true)
    expect(agentDefinitionStoreMock.reloadAllAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.reloadAllAgentTeamDefinitions).toHaveBeenCalledOnce()
  })
})
