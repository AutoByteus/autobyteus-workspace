import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  CHECK_AGENT_PACKAGE_UPDATES,
  GET_AGENT_PACKAGES,
  IMPORT_AGENT_PACKAGE,
  RELOAD_AGENT_PACKAGE,
  REMOVE_AGENT_PACKAGE,
  UPDATE_AGENT_PACKAGE,
} from '~/graphql/agentPackages'
import { useApplicationStore } from '~/stores/applicationStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'

export type AgentPackageSourceKind =
  | 'BUILT_IN'
  | 'LOCAL_PATH'
  | 'GITHUB_REPOSITORY'

export type AgentPackageImportSourceKind =
  | 'LOCAL_PATH'
  | 'GITHUB_REPOSITORY'

export type AgentPackageUpdateStatus =
  | 'NOT_APPLICABLE'
  | 'RELOAD_AVAILABLE'
  | 'NOT_CHECKED'
  | 'UNKNOWN'
  | 'UP_TO_DATE'
  | 'UPDATE_AVAILABLE'
  | 'CHECK_FAILED'
  | 'UPDATE_FAILED'

export interface AgentPackageUpdateInfo {
  status: AgentPackageUpdateStatus
  canCheck: boolean
  canUpdate: boolean
  canReload: boolean
  message: string
  installedRevision: string | null
  latestRevision: string | null
  checkedAt: string | null
  lastError: string | null
}

export interface AgentPackage {
  packageId: string
  displayName: string
  path: string
  sourceKind: AgentPackageSourceKind
  source: string
  sharedAgentCount: number
  teamLocalAgentCount: number
  agentTeamCount: number
  applicationCount: number
  isDefault: boolean
  isRemovable: boolean
  updateInfo: AgentPackageUpdateInfo
}

export interface AgentPackageImportInput {
  sourceKind: AgentPackageImportSourceKind
  source: string
}

const graphQLErrorMessage = (errors: Array<{ message: string }> | undefined): string | null => {
  if (!errors || errors.length === 0) {
    return null
  }
  return errors.map((entry) => entry.message).join(', ')
}

export const useAgentPackagesStore = defineStore('agentPackages', () => {
  const agentPackages = ref<AgentPackage[]>([])
  const loading = ref(false)
  const checkingUpdates = ref(false)
  const actionPackageIds = ref<Record<string, boolean>>({})
  const error = ref('')

  const refreshDependentCatalogs = async (): Promise<void> => {
    const applicationStore = useApplicationStore()
    const agentDefinitionStore = useAgentDefinitionStore()
    const agentTeamDefinitionStore = useAgentTeamDefinitionStore()

    applicationStore.invalidateApplications()
    agentDefinitionStore.invalidateAgentDefinitions()
    agentTeamDefinitionStore.invalidateAgentTeamDefinitions()

    await Promise.all([
      applicationStore.fetchApplications(true),
      agentDefinitionStore.reloadAllAgentDefinitions(),
      agentTeamDefinitionStore.reloadAllAgentTeamDefinitions(),
    ])
  }

  const setPackageActionLoading = (packageId: string, value: boolean): void => {
    actionPackageIds.value = {
      ...actionPackageIds.value,
      [packageId]: value,
    }
    if (!value) {
      const next = { ...actionPackageIds.value }
      delete next[packageId]
      actionPackageIds.value = next
    }
  }

  const isPackageActionLoading = (packageId: string): boolean =>
    Boolean(actionPackageIds.value[packageId])

  async function fetchAgentPackages(): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_AGENT_PACKAGES,
        fetchPolicy: 'network-only',
      })
      const errorMessage = graphQLErrorMessage(errors)
      if (errorMessage) {
        throw new Error(errorMessage)
      }

      if (data?.agentPackages) {
        agentPackages.value = data.agentPackages
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function importAgentPackage(input: AgentPackageImportInput): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: IMPORT_AGENT_PACKAGE,
        variables: { input },
      })
      const errorMessage = graphQLErrorMessage(errors)
      if (errorMessage) {
        throw new Error(errorMessage)
      }

      if (data?.importAgentPackage) {
        agentPackages.value = data.importAgentPackage
      }

      await refreshDependentCatalogs()
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeAgentPackage(packageId: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: REMOVE_AGENT_PACKAGE,
        variables: { packageId },
      })
      const errorMessage = graphQLErrorMessage(errors)
      if (errorMessage) {
        throw new Error(errorMessage)
      }

      if (data?.removeAgentPackage) {
        agentPackages.value = data.removeAgentPackage
      }

      await refreshDependentCatalogs()
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function reloadAgentPackage(packageId: string): Promise<void> {
    setPackageActionLoading(packageId, true)
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: RELOAD_AGENT_PACKAGE,
        variables: { packageId },
      })
      const errorMessage = graphQLErrorMessage(errors)
      if (errorMessage) {
        throw new Error(errorMessage)
      }

      if (data?.reloadAgentPackage) {
        agentPackages.value = data.reloadAgentPackage
      }

      await refreshDependentCatalogs()
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      setPackageActionLoading(packageId, false)
    }
  }

  async function checkAgentPackageUpdates(packageIds?: string[]): Promise<void> {
    checkingUpdates.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: CHECK_AGENT_PACKAGE_UPDATES,
        variables: { packageIds },
      })
      const errorMessage = graphQLErrorMessage(errors)
      if (errorMessage) {
        throw new Error(errorMessage)
      }

      if (data?.checkAgentPackageUpdates) {
        agentPackages.value = data.checkAgentPackageUpdates
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      checkingUpdates.value = false
    }
  }

  async function updateAgentPackage(packageId: string): Promise<void> {
    setPackageActionLoading(packageId, true)
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: UPDATE_AGENT_PACKAGE,
        variables: { packageId },
      })
      const errorMessage = graphQLErrorMessage(errors)
      if (errorMessage) {
        throw new Error(errorMessage)
      }

      if (data?.updateAgentPackage) {
        agentPackages.value = data.updateAgentPackage
      }

      await refreshDependentCatalogs()
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      setPackageActionLoading(packageId, false)
    }
  }

  function clearError(): void {
    error.value = ''
  }

  const getAgentPackages = computed(() => agentPackages.value)
  const getLoading = computed(() => loading.value)
  const getCheckingUpdates = computed(() => checkingUpdates.value)
  const getError = computed(() => error.value)

  return {
    agentPackages,
    loading,
    checkingUpdates,
    actionPackageIds,
    error,
    fetchAgentPackages,
    importAgentPackage,
    removeAgentPackage,
    reloadAgentPackage,
    checkAgentPackageUpdates,
    updateAgentPackage,
    isPackageActionLoading,
    clearError,
    getAgentPackages,
    getLoading,
    getCheckingUpdates,
    getError,
  }
})
