import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import {
  GET_APPLICATION_PACKAGE_DETAILS,
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

export interface ApplicationPackageListItem {
  packageId: string
  displayName: string
  sourceKind: ApplicationPackageSourceKind
  sourceSummary?: string | null
  applicationCount: number
  isPlatformOwned: boolean
  isRemovable: boolean
}

export interface ApplicationPackageDetails extends ApplicationPackageListItem {
  rootPath: string
  source: string
  managedInstallPath?: string | null
  bundledSourceRootPath?: string | null
}

export interface ApplicationPackageImportInput {
  sourceKind: ApplicationPackageImportSourceKind
  source: string
}

export const useApplicationPackagesStore = defineStore('applicationPackages', () => {
  const applicationPackages = ref<ApplicationPackageListItem[]>([])
  const detailsByPackageId = ref<Record<string, ApplicationPackageDetails | null>>({})
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

  const resetDetailsCache = (): void => {
    detailsByPackageId.value = {}
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

      applicationPackages.value = (data?.applicationPackages || []) as ApplicationPackageListItem[]
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchApplicationPackageDetails(
    packageId: string,
    force = false,
  ): Promise<ApplicationPackageDetails | null> {
    if (!force && Object.prototype.hasOwnProperty.call(detailsByPackageId.value, packageId)) {
      return detailsByPackageId.value[packageId] ?? null
    }

    loading.value = true
    error.value = ''

    try {
      const client = getApolloClient()
      const { data, errors } = await client.query({
        query: GET_APPLICATION_PACKAGE_DETAILS,
        variables: { packageId },
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const details = (data?.applicationPackageDetails || null) as ApplicationPackageDetails | null
      detailsByPackageId.value = {
        ...detailsByPackageId.value,
        [packageId]: details,
      }
      return details
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

      applicationPackages.value = (data?.importApplicationPackage || []) as ApplicationPackageListItem[]
      resetDetailsCache()
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

      applicationPackages.value = (data?.removeApplicationPackage || []) as ApplicationPackageListItem[]
      resetDetailsCache()
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
  const getApplicationPackageDetails = computed(() => (
    (packageId: string) => detailsByPackageId.value[packageId] ?? null
  ))
  const getLoading = computed(() => loading.value)
  const getError = computed(() => error.value)

  return {
    applicationPackages,
    detailsByPackageId,
    loading,
    error,
    fetchApplicationPackages,
    fetchApplicationPackageDetails,
    importApplicationPackage,
    removeApplicationPackage,
    clearError,
    getApplicationPackages,
    getApplicationPackageDetails,
    getLoading,
    getError,
  }
})
