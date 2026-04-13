import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { GetApplicationById, ListApplications } from '~/graphql/queries/applicationQueries'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

export type ApplicationRuntimeTargetKind = 'AGENT' | 'AGENT_TEAM'

export interface ApplicationRuntimeTarget {
  __typename?: 'ApplicationRuntimeTarget'
  kind: ApplicationRuntimeTargetKind
  localId: string
  definitionId: string
}

export interface ApplicationCatalogEntry {
  __typename?: 'Application'
  id: string
  localApplicationId: string
  packageId: string
  name: string
  description?: string | null
  iconAssetPath?: string | null
  entryHtmlAssetPath: string
  writable: boolean
  runtimeTarget: ApplicationRuntimeTarget
}

interface ListApplicationsQueryResult {
  listApplications?: ApplicationCatalogEntry[] | null
}

interface GetApplicationByIdQueryResult {
  application?: ApplicationCatalogEntry | null
}

const upsertApplication = (
  applications: ApplicationCatalogEntry[],
  application: ApplicationCatalogEntry,
): ApplicationCatalogEntry[] => {
  const existingIndex = applications.findIndex((entry) => entry.id === application.id)
  if (existingIndex === -1) {
    return [...applications, application]
  }
  const nextApplications = [...applications]
  nextApplications[existingIndex] = application
  return nextApplications
}

export const useApplicationStore = defineStore('application', () => {
  const applications = ref<ApplicationCatalogEntry[]>([])
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const hasFetched = ref(false)

  const getApplicationById = computed(
    () => (applicationId: string): ApplicationCatalogEntry | null =>
      applications.value.find((application) => application.id === applicationId) ?? null,
  )

  const isApplicationsEnabled = (): boolean => {
    const runtimeConfig = useRuntimeConfig()
    return Boolean(runtimeConfig.public.enableApplications)
  }

  const ensureBackendReady = async (): Promise<void> => {
    const windowNodeContextStore = useWindowNodeContextStore()
    const isReady = await windowNodeContextStore.waitForBoundBackendReady()
    if (!isReady) {
      throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready')
    }
  }

  const fetchApplications = async (force = false): Promise<ApplicationCatalogEntry[]> => {
    if (!isApplicationsEnabled()) {
      applications.value = []
      loading.value = false
      error.value = null
      hasFetched.value = false
      return []
    }

    if (hasFetched.value && !force) {
      return applications.value
    }

    loading.value = true
    error.value = null

    try {
      await ensureBackendReady()
      const client = getApolloClient()
      const { data, errors } = await client.query<ListApplicationsQueryResult>({
        query: ListApplications,
        fetchPolicy: force ? 'network-only' : 'cache-first',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      applications.value = [...(data.listApplications ?? [])].sort(
        (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
      )
      hasFetched.value = true
      return applications.value
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause))
      error.value = nextError
      console.error('Failed to fetch applications:', nextError)
      throw nextError
    } finally {
      loading.value = false
    }
  }

  const fetchApplicationById = async (
    applicationId: string,
    force = false,
  ): Promise<ApplicationCatalogEntry | null> => {
    const normalizedApplicationId = applicationId.trim()
    if (!normalizedApplicationId) {
      return null
    }

    if (!force) {
      const existing = getApplicationById.value(normalizedApplicationId)
      if (existing) {
        return existing
      }
    }

    loading.value = true
    error.value = null

    try {
      await ensureBackendReady()
      const client = getApolloClient()
      const { data, errors } = await client.query<GetApplicationByIdQueryResult>({
        query: GetApplicationById,
        variables: { id: normalizedApplicationId },
        fetchPolicy: 'network-only',
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const application = data.application ?? null
      if (application) {
        applications.value = upsertApplication(applications.value, application).sort(
          (left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
        )
      }
      return application
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause))
      error.value = nextError
      console.error(`Failed to fetch application '${normalizedApplicationId}':`, nextError)
      throw nextError
    } finally {
      loading.value = false
    }
  }

  const clearError = (): void => {
    error.value = null
  }

  const invalidateApplications = (): void => {
    applications.value = []
    loading.value = false
    error.value = null
    hasFetched.value = false
  }

  return {
    applications,
    loading,
    error,
    hasFetched,
    getApplicationById,
    isApplicationsEnabled,
    fetchApplications,
    fetchApplicationById,
    clearError,
    invalidateApplications,
  }
})
