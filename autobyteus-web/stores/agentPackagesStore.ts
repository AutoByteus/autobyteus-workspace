import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GET_AGENT_PACKAGES,
  IMPORT_AGENT_PACKAGE,
  REMOVE_AGENT_PACKAGE,
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

export interface AgentPackage {
  packageId: string
  displayName: string
  path: string
  sourceKind: AgentPackageSourceKind
  source: string
  sharedAgentCount: number
  teamLocalAgentCount: number
  agentTeamCount: number
  isDefault: boolean
  isRemovable: boolean
}

export interface AgentPackageImportInput {
  sourceKind: AgentPackageImportSourceKind
  source: string
}

export const useAgentPackagesStore = defineStore('agentPackages', () => {
  const agentPackages = ref<AgentPackage[]>([])
  const loading = ref(false)
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

  async function fetchAgentPackages(): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_AGENT_PACKAGES,
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
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

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
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

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
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

  function clearError(): void {
    error.value = ''
  }

  const getAgentPackages = computed(() => agentPackages.value)
  const getLoading = computed(() => loading.value)
  const getError = computed(() => error.value)

  return {
    agentPackages,
    loading,
    error,
    fetchAgentPackages,
    importAgentPackage,
    removeAgentPackage,
    clearError,
    getAgentPackages,
    getLoading,
    getError,
  }
})
