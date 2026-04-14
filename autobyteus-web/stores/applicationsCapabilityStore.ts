import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { GetApplicationsCapability } from '~/graphql/queries/applicationCapabilityQueries'
import { SetApplicationsEnabled } from '~/graphql/mutations/applicationCapabilityMutations'

export type ApplicationsCapabilityScope = 'BOUND_NODE'
export type ApplicationsCapabilitySource =
  | 'SERVER_SETTING'
  | 'INITIALIZED_FROM_DISCOVERED_APPLICATIONS'
  | 'INITIALIZED_EMPTY_CATALOG'

export interface ApplicationsCapability {
  enabled: boolean
  scope: ApplicationsCapabilityScope
  settingKey: 'ENABLE_APPLICATIONS'
  source: ApplicationsCapabilitySource
}

interface ApplicationsCapabilityQueryResult {
  applicationsCapability?: ApplicationsCapability | null
}

interface SetApplicationsEnabledMutationResult {
  setApplicationsEnabled?: ApplicationsCapability | null
}

export type ApplicationsCapabilityStatus = 'unknown' | 'loading' | 'resolved' | 'error'

export const useApplicationsCapabilityStore = defineStore('applicationsCapability', () => {
  const capability = ref<ApplicationsCapability | null>(null)
  const status = ref<ApplicationsCapabilityStatus>('unknown')
  const error = ref<Error | null>(null)
  const windowNodeContextStore = useWindowNodeContextStore()
  const isEnabled = computed(() => status.value === 'resolved' && capability.value?.enabled === true)

  let resolvePromise: Promise<ApplicationsCapability | null> | null = null
  let watcherRegistered = false

  const invalidate = (): void => {
    resolvePromise = null
    capability.value = null
    status.value = 'unknown'
    error.value = null
  }

  const ensureBackendReady = async (): Promise<void> => {
    const isReady = await windowNodeContextStore.waitForBoundBackendReady()
    if (!isReady) {
      throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready')
    }
  }

  const fetchCapability = async (force = false): Promise<ApplicationsCapability | null> => {
    if (!force && capability.value && status.value === 'resolved') {
      return capability.value
    }

    if (resolvePromise) {
      return resolvePromise
    }

    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    status.value = 'loading'
    error.value = null
    capability.value = null

    const promise = (async (): Promise<ApplicationsCapability | null> => {
      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      await ensureBackendReady()

      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      const client = getApolloClient()
      const { data, errors } = await client.query<ApplicationsCapabilityQueryResult>({
        query: GetApplicationsCapability,
        fetchPolicy: 'network-only',
      })

      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const nextCapability = data.applicationsCapability ?? null
      if (!nextCapability) {
        throw new Error('Applications capability was not returned.')
      }

      capability.value = nextCapability
      status.value = 'resolved'
      error.value = null
      return nextCapability
    })()

    resolvePromise = promise

    try {
      return await promise
    } catch (cause) {
      if (windowNodeContextStore.bindingRevision === bindingRevisionAtStart) {
        const nextError = cause instanceof Error ? cause : new Error(String(cause))
        capability.value = null
        status.value = 'error'
        error.value = nextError
      }
      throw cause
    } finally {
      if (resolvePromise === promise) {
        resolvePromise = null
      }
    }
  }

  const ensureResolved = async (): Promise<ApplicationsCapability | null> => fetchCapability(false)

  const refresh = async (): Promise<ApplicationsCapability | null> => {
    invalidate()
    return fetchCapability(true)
  }

  const setEnabled = async (enabled: boolean): Promise<ApplicationsCapability> => {
    const previousCapability = capability.value
    const previousStatus = status.value

    status.value = 'loading'
    error.value = null

    try {
      await ensureBackendReady()
      const client = getApolloClient()
      const { data, errors } = await client.mutate<SetApplicationsEnabledMutationResult>({
        mutation: SetApplicationsEnabled,
        variables: { enabled },
      })

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const nextCapability = data?.setApplicationsEnabled ?? null
      if (!nextCapability) {
        throw new Error('Applications capability update was not returned.')
      }

      capability.value = nextCapability
      status.value = 'resolved'
      error.value = null
      return nextCapability
    } catch (cause) {
      const nextError = cause instanceof Error ? cause : new Error(String(cause))
      capability.value = previousCapability
      status.value = previousCapability ? 'resolved' : previousStatus === 'resolved' ? 'resolved' : 'error'
      error.value = nextError
      throw nextError
    }
  }

  const registerWatchers = (): void => {
    if (watcherRegistered) {
      return
    }

    watch(
      () => windowNodeContextStore.bindingRevision,
      () => {
        invalidate()
        void refresh().catch(() => undefined)
      },
      { flush: 'sync' },
    )

    watcherRegistered = true
  }

  registerWatchers()

  return {
    capability,
    status,
    error,
    isEnabled,
    invalidate,
    ensureResolved,
    refresh,
    setEnabled,
  }
})
