import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { GetSelfEvolutionCapability } from '~/graphql/queries/selfEvolutionQueries'
import { SetSelfEvolutionEnabled } from '~/graphql/mutations/selfEvolutionMutations'

export type SelfEvolutionCapabilitySource = 'SERVER_SETTING' | 'INITIALIZED_DISABLED'

export interface SelfEvolutionCapability {
  enabled: boolean
  settingKey: 'ENABLE_SELF_EVOLUTION'
  source: SelfEvolutionCapabilitySource
}

interface SelfEvolutionCapabilityQueryResult {
  selfEvolutionCapability?: SelfEvolutionCapability | null
}

interface SetSelfEvolutionEnabledMutationResult {
  setSelfEvolutionEnabled?: SelfEvolutionCapability | null
}

export type SelfEvolutionCapabilityStatus = 'unknown' | 'loading' | 'resolved' | 'error'

export const useSelfEvolutionCapabilityStore = defineStore('selfEvolutionCapability', () => {
  const capability = ref<SelfEvolutionCapability | null>(null)
  const status = ref<SelfEvolutionCapabilityStatus>('unknown')
  const error = ref<Error | null>(null)
  const windowNodeContextStore = useWindowNodeContextStore()
  const isEnabled = computed(() => status.value === 'resolved' && capability.value?.enabled === true)

  let resolvePromise: Promise<SelfEvolutionCapability | null> | null = null
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

  const hasBindingRevisionChanged = (bindingRevisionAtStart: number): boolean => (
    windowNodeContextStore.bindingRevision !== bindingRevisionAtStart
  )

  const resolveCurrentBindingCapability = async (): Promise<SelfEvolutionCapability> => {
    if (status.value === 'resolved' && capability.value) {
      return capability.value
    }

    const resolvedCapability = await ensureResolved()
    if (!resolvedCapability) {
      throw new Error('Self-evolution capability was not resolved for the current binding.')
    }

    return resolvedCapability
  }

  const fetchCapability = async (force = false): Promise<SelfEvolutionCapability | null> => {
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

    const promise = (async (): Promise<SelfEvolutionCapability | null> => {
      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      await ensureBackendReady()

      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      const client = getApolloClient()
      const { data, errors } = await client.query<SelfEvolutionCapabilityQueryResult>({
        query: GetSelfEvolutionCapability,
        fetchPolicy: 'network-only',
      })

      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const nextCapability = data.selfEvolutionCapability ?? null
      if (!nextCapability) {
        throw new Error('Self-evolution capability was not returned.')
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

  const ensureResolved = async (): Promise<SelfEvolutionCapability | null> => fetchCapability(false)

  const refresh = async (): Promise<SelfEvolutionCapability | null> => {
    invalidate()
    return fetchCapability(true)
  }

  const setEnabled = async (enabled: boolean): Promise<SelfEvolutionCapability> => {
    const previousCapability = capability.value
    const previousStatus = status.value
    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision

    status.value = 'loading'
    error.value = null

    try {
      await ensureBackendReady()
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return await resolveCurrentBindingCapability()
      }

      const client = getApolloClient()
      const { data, errors } = await client.mutate<SetSelfEvolutionEnabledMutationResult>({
        mutation: SetSelfEvolutionEnabled,
        variables: { enabled },
      })

      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return await resolveCurrentBindingCapability()
      }

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const nextCapability = data?.setSelfEvolutionEnabled ?? null
      if (!nextCapability) {
        throw new Error('Self-evolution capability update was not returned.')
      }

      capability.value = nextCapability
      status.value = 'resolved'
      error.value = null
      return nextCapability
    } catch (cause) {
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return await resolveCurrentBindingCapability()
      }

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
