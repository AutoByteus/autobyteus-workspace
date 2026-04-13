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
  GET_AGENT_PACKAGES: {},
  IMPORT_AGENT_PACKAGE: {},
  REMOVE_AGENT_PACKAGE: {},
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
    expect(applicationStoreMock.invalidateApplications).toHaveBeenCalledOnce()
    expect(agentDefinitionStoreMock.invalidateAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.invalidateAgentTeamDefinitions).toHaveBeenCalledOnce()
    expect(applicationStoreMock.fetchApplications).toHaveBeenCalledWith(true)
    expect(agentDefinitionStoreMock.reloadAllAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.reloadAllAgentTeamDefinitions).toHaveBeenCalledOnce()
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
    expect(applicationStoreMock.invalidateApplications).toHaveBeenCalledOnce()
    expect(agentDefinitionStoreMock.invalidateAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.invalidateAgentTeamDefinitions).toHaveBeenCalledOnce()
    expect(applicationStoreMock.fetchApplications).toHaveBeenCalledWith(true)
    expect(agentDefinitionStoreMock.reloadAllAgentDefinitions).toHaveBeenCalledOnce()
    expect(agentTeamDefinitionStoreMock.reloadAllAgentTeamDefinitions).toHaveBeenCalledOnce()
  })
})
