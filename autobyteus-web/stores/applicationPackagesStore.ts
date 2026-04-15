import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GET_APPLICATION_PACKAGES,
  IMPORT_APPLICATION_PACKAGE,
  REMOVE_APPLICATION_PACKAGE,
} from '~/graphql/applicationPackages'
import { useApplicationStore } from '~/stores/applicationStore'
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore'
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore'

export type ApplicationPackageSourceKind =
  | 'BUILT_IN'
  | 'LOCAL_PATH'
  | 'GITHUB_REPOSITORY'

export type ApplicationPackageImportSourceKind =
  | 'LOCAL_PATH'
  | 'GITHUB_REPOSITORY'

export interface ApplicationPackage {
  packageId: string
  displayName: string
  path: string
  sourceKind: ApplicationPackageSourceKind
  source: string
  applicationCount: number
  isDefault: boolean
  isRemovable: boolean
}

export interface ApplicationPackageImportInput {
  sourceKind: ApplicationPackageImportSourceKind
  source: string
}

export const useApplicationPackagesStore = defineStore('applicationPackages', () => {
  const applicationPackages = ref<ApplicationPackage[]>([])
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

  async function fetchApplicationPackages(): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_APPLICATION_PACKAGES,
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      if (data?.applicationPackages) {
        applicationPackages.value = data.applicationPackages
      }
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function importApplicationPackage(input: ApplicationPackageImportInput): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: IMPORT_APPLICATION_PACKAGE,
        variables: { input },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      if (data?.importApplicationPackage) {
        applicationPackages.value = data.importApplicationPackage
      }

      await refreshDependentCatalogs()
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function removeApplicationPackage(packageId: string): Promise<void> {
    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.mutate({
        mutation: REMOVE_APPLICATION_PACKAGE,
        variables: { packageId },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      if (data?.removeApplicationPackage) {
        applicationPackages.value = data.removeApplicationPackage
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

  const getApplicationPackages = computed(() => applicationPackages.value)
  const getLoading = computed(() => loading.value)
  const getError = computed(() => error.value)

  return {
    applicationPackages,
    loading,
    error,
    fetchApplicationPackages,
    importApplicationPackage,
    removeApplicationPackage,
    clearError,
    getApplicationPackages,
    getLoading,
    getError,
  }
})
