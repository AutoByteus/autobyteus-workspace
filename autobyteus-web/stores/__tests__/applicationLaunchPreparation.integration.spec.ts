import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const {
  apolloClientMock,
  backendReadyMock,
  applicationsCapabilityStoreMock,
  graphqlTokens,
} = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
  backendReadyMock: {
    bindingRevision: 0,
    lastReadyError: null as string | null,
    waitForBoundBackendReady: vi.fn(),
  },
  applicationsCapabilityStoreMock: {
    status: 'resolved',
    isEnabled: true,
    ensureResolved: vi.fn(),
  },
  graphqlTokens: {
    listApplications: {},
    getApplicationById: {},
    getAgentDefinitions: {},
    getAgentTeamDefinitions: {},
    getApplicationPackages: {},
    importApplicationPackage: {},
    removeApplicationPackage: {},
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: () => apolloClientMock,
}))

vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => backendReadyMock,
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

vi.mock('~/stores/workspace', () => ({
  useWorkspaceStore: () => ({
    workspaces: {},
  }),
}))

vi.mock('~/graphql/queries/applicationQueries', () => ({
  ListApplications: graphqlTokens.listApplications,
  GetApplicationById: graphqlTokens.getApplicationById,
}))

vi.mock('~/graphql/queries/agentDefinitionQueries', () => ({
  GetAgentDefinitions: graphqlTokens.getAgentDefinitions,
}))

vi.mock('~/graphql/queries/agentTeamDefinitionQueries', () => ({
  GetAgentTeamDefinitions: graphqlTokens.getAgentTeamDefinitions,
}))

vi.mock('~/graphql/applicationPackages', () => ({
  GET_APPLICATION_PACKAGES: graphqlTokens.getApplicationPackages,
  IMPORT_APPLICATION_PACKAGE: graphqlTokens.importApplicationPackage,
  REMOVE_APPLICATION_PACKAGE: graphqlTokens.removeApplicationPackage,
}))

vi.mock('~/graphql/queries/applicationSessionQueries', () => ({
  GetApplicationSession: {},
  GetApplicationSessionBinding: {},
}))

vi.mock('~/graphql/mutations/applicationSessionMutations', () => ({
  CreateApplicationSession: {},
  SendApplicationInput: {},
  TerminateApplicationSession: {},
}))

const importedApplicationId =
  'bundle-app__importable-package__brief-studio'
const importedTeamDefinitionId =
  'bundle-team__importable-package__brief-studio__bundle-team'
const importedResearcherId =
  'bundle-agent__importable-package__brief-studio__researcher'
const importedWriterId =
  'bundle-agent__importable-package__brief-studio__writer'

const sharedAgentDefinition = {
  id: 'shared-agent',
  name: 'Shared Agent',
  role: 'assistant',
  description: 'Shared catalog entry',
  instructions: 'Shared instructions',
  category: null,
  avatarUrl: null,
  toolNames: [],
  inputProcessorNames: [],
  llmResponseProcessorNames: [],
  systemPromptProcessorNames: [],
  toolExecutionResultProcessorNames: [],
  toolInvocationPreprocessorNames: [],
  lifecycleProcessorNames: [],
  skillNames: [],
  ownershipScope: 'SHARED' as const,
  defaultLaunchConfig: {
    llmModelIdentifier: 'gpt-5.4-mini',
    runtimeKind: 'autobyteus',
    llmConfig: null,
  },
}

const sharedTeamDefinition = {
  id: 'shared-team',
  name: 'Shared Team',
  description: 'Shared team',
  instructions: 'Shared instructions',
  coordinatorMemberName: 'shared-agent',
  nodes: [
    {
      memberName: 'shared-agent',
      ref: 'shared-agent',
      refType: 'AGENT' as const,
      refScope: 'SHARED' as const,
    },
  ],
  ownershipScope: 'SHARED' as const,
}

const importedApplication = {
  id: importedApplicationId,
  localApplicationId: 'brief-studio',
  packageId: 'importable-package',
  name: 'Brief Studio',
  description: 'Imported teaching sample',
  iconAssetPath: null,
  entryHtmlAssetPath: 'ui/index.html',
  writable: true,
  runtimeTarget: {
    kind: 'AGENT_TEAM' as const,
    localId: 'bundle-team',
    definitionId: importedTeamDefinitionId,
  },
}

const importedAgentDefinitions = [
  {
    id: importedResearcherId,
    name: 'researcher',
    role: 'researcher',
    description: 'Researches the brief',
    instructions: 'Research instructions',
    category: null,
    avatarUrl: null,
    toolNames: [],
    inputProcessorNames: [],
    llmResponseProcessorNames: [],
    systemPromptProcessorNames: [],
    toolExecutionResultProcessorNames: [],
    toolInvocationPreprocessorNames: [],
    lifecycleProcessorNames: [],
    skillNames: [],
    ownershipScope: 'APPLICATION_OWNED' as const,
    ownerApplicationId: importedApplicationId,
    ownerApplicationName: 'Brief Studio',
    ownerPackageId: 'importable-package',
    ownerLocalApplicationId: 'brief-studio',
    defaultLaunchConfig: {
      llmModelIdentifier: 'gpt-5.4-mini',
      runtimeKind: 'autobyteus',
      llmConfig: null,
    },
  },
  {
    id: importedWriterId,
    name: 'writer',
    role: 'writer',
    description: 'Writes the brief',
    instructions: 'Writer instructions',
    category: null,
    avatarUrl: null,
    toolNames: [],
    inputProcessorNames: [],
    llmResponseProcessorNames: [],
    systemPromptProcessorNames: [],
    toolExecutionResultProcessorNames: [],
    toolInvocationPreprocessorNames: [],
    lifecycleProcessorNames: [],
    skillNames: [],
    ownershipScope: 'APPLICATION_OWNED' as const,
    ownerApplicationId: importedApplicationId,
    ownerApplicationName: 'Brief Studio',
    ownerPackageId: 'importable-package',
    ownerLocalApplicationId: 'brief-studio',
    defaultLaunchConfig: {
      llmModelIdentifier: 'gpt-5.4-mini',
      runtimeKind: 'autobyteus',
      llmConfig: null,
    },
  },
]

const importedTeamDefinition = {
  id: importedTeamDefinitionId,
  name: 'bundle-team',
  description: 'Brief Studio launch team',
  instructions: 'Coordinate the brief',
  coordinatorMemberName: 'writer',
  defaultLaunchConfig: {
    llmModelIdentifier: 'gpt-5.4',
    runtimeKind: 'codex',
    llmConfig: {
      reasoning_effort: 'high',
    },
  },
  nodes: [
    {
      memberName: 'researcher',
      ref: importedResearcherId,
      refType: 'AGENT' as const,
      refScope: 'APPLICATION_OWNED' as const,
    },
    {
      memberName: 'writer',
      ref: importedWriterId,
      refType: 'AGENT' as const,
      refScope: 'APPLICATION_OWNED' as const,
    },
  ],
  ownershipScope: 'APPLICATION_OWNED' as const,
  ownerApplicationId: importedApplicationId,
  ownerApplicationName: 'Brief Studio',
  ownerPackageId: 'importable-package',
  ownerLocalApplicationId: 'brief-studio',
}

import { useAgentDefinitionStore } from '../agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '../agentTeamDefinitionStore'
import { useApplicationPackagesStore } from '../applicationPackagesStore'
import { useApplicationSessionStore } from '../applicationSessionStore'

describe('application launch preparation after importing an application package', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    backendReadyMock.bindingRevision = 0
    backendReadyMock.lastReadyError = null
    backendReadyMock.waitForBoundBackendReady.mockResolvedValue(true)
    applicationsCapabilityStoreMock.status = 'resolved'
    applicationsCapabilityStoreMock.isEnabled = true
    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(undefined)

    let packageImported = false

    apolloClientMock.query.mockImplementation(async ({ query, variables }) => {
      if (query === graphqlTokens.getAgentDefinitions) {
        return {
          data: {
            agentDefinitions: packageImported
              ? [sharedAgentDefinition, ...importedAgentDefinitions]
              : [sharedAgentDefinition],
          },
          errors: [],
        }
      }

      if (query === graphqlTokens.getAgentTeamDefinitions) {
        return {
          data: {
            agentTeamDefinitions: packageImported
              ? [sharedTeamDefinition, importedTeamDefinition]
              : [sharedTeamDefinition],
          },
          errors: [],
        }
      }

      if (query === graphqlTokens.listApplications) {
        return {
          data: {
            listApplications: packageImported ? [importedApplication] : [],
          },
          errors: [],
        }
      }

      if (query === graphqlTokens.getApplicationById) {
        return {
          data: {
            application: packageImported && variables?.id === importedApplicationId
              ? importedApplication
              : null,
          },
          errors: [],
        }
      }

      throw new Error(`Unexpected query in test setup: ${String(query)}`)
    })

    apolloClientMock.mutate.mockImplementation(async ({ mutation }) => {
      if (mutation === graphqlTokens.importApplicationPackage) {
        packageImported = true
        return {
          data: {
            importApplicationPackage: [
              {
                packageId: 'importable-package',
                displayName: 'Importable Package',
              },
            ],
          },
          errors: [],
        }
      }

      throw new Error(`Unexpected mutation in test setup: ${String(mutation)}`)
    })
  })

  it('prepares the imported application launch even when shared definition catalogs were already loaded', async () => {
    const agentDefinitionStore = useAgentDefinitionStore()
    const teamDefinitionStore = useAgentTeamDefinitionStore()
    const applicationPackagesStore = useApplicationPackagesStore()
    const applicationSessionStore = useApplicationSessionStore()

    await agentDefinitionStore.fetchAllAgentDefinitions()
    await teamDefinitionStore.fetchAllAgentTeamDefinitions()

    expect(agentDefinitionStore.agentDefinitions).toEqual([sharedAgentDefinition])
    expect(teamDefinitionStore.agentTeamDefinitions).toEqual([sharedTeamDefinition])

    await applicationPackagesStore.importApplicationPackage({
      sourceKind: 'LOCAL_PATH',
      source: '/tmp/brief-studio/importable-package',
    })

    const preparedLaunch = await applicationSessionStore.prepareLaunchDraft(importedApplicationId)

    expect(preparedLaunch).toMatchObject({
      kind: 'AGENT_TEAM',
      application: {
        id: importedApplicationId,
        name: 'Brief Studio',
      },
      teamDefinition: {
        id: importedTeamDefinitionId,
        name: 'bundle-team',
      },
      leafMembers: [
        {
          memberName: 'researcher',
          memberRouteKey: 'researcher',
          agentDefinitionId: importedResearcherId,
        },
        {
          memberName: 'writer',
          memberRouteKey: 'writer',
          agentDefinitionId: importedWriterId,
        },
      ],
      config: {
        teamDefinitionId: importedTeamDefinitionId,
        teamDefinitionName: 'bundle-team',
        llmModelIdentifier: 'gpt-5.4',
        runtimeKind: 'codex',
        llmConfig: {
          reasoning_effort: 'high',
        },
      },
    })
  })
})
