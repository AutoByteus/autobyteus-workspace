import { defineStore } from 'pinia'
import { computed, ref, watch, type Ref } from 'vue'
import type gqlTag from 'graphql-tag'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

type DocumentNode = ReturnType<typeof gqlTag>

/** Common shape of every per-node feature capability returned by the server. */
export interface BoundNodeCapability {
  enabled: boolean
  settingKey: string
  source: string
}

export type BoundNodeCapabilityStatus = 'unknown' | 'loading' | 'resolved' | 'error'

/** The public API every bound-node capability store exposes (as seen through a Pinia store instance). */
export interface BoundNodeCapabilityStoreApi<TCapability extends BoundNodeCapability = BoundNodeCapability> {
  readonly capability: TCapability | null
  readonly status: BoundNodeCapabilityStatus
  readonly error: Error | null
  readonly isEnabled: boolean
  invalidate(): void
  ensureResolved(): Promise<TCapability | null>
  refresh(): Promise<TCapability | null>
  setEnabled(enabled: boolean): Promise<TCapability>
}

export interface BoundNodeCapabilityStoreOptions {
  /** Pinia store id. */
  id: string
  query: DocumentNode
  mutation: DocumentNode
  /** Root field returned by `query`. */
  queryField: string
  /** Root field returned by `mutation` (called with `{ enabled }`). */
  mutationField: string
  /** Human-readable feature name used in error messages. */
  label: string
}

type CapabilityPayload<TCapability> = Record<string, TCapability | null | undefined>

const joinGraphqlErrors = (errors: ReadonlyArray<{ message: string }>): Error =>
  new Error(errors.map((entry) => entry.message).join(', '))

/**
 * Builds a Pinia store that resolves, caches and updates one boolean feature
 * capability for the currently bound backend node. The cache is invalidated
 * whenever `windowNodeContextStore.bindingRevision` changes, and responses
 * that arrive after a rebinding are discarded.
 */
export const createBoundNodeCapabilityStore = <TCapability extends BoundNodeCapability>(
  options: BoundNodeCapabilityStoreOptions,
) => defineStore(options.id, () => {
  const capability = ref<TCapability | null>(null) as Ref<TCapability | null>
  const status = ref<BoundNodeCapabilityStatus>('unknown')
  const error = ref<Error | null>(null)
  const windowNodeContextStore = useWindowNodeContextStore()
  const isEnabled = computed(() => status.value === 'resolved' && capability.value?.enabled === true)

  let resolvePromise: Promise<TCapability | null> | null = null
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

  const resolveCurrentBindingCapability = async (): Promise<TCapability> => {
    if (status.value === 'resolved' && capability.value) {
      return capability.value
    }

    const resolvedCapability = await ensureResolved()
    if (!resolvedCapability) {
      throw new Error(`${options.label} capability was not resolved for the current binding.`)
    }

    return resolvedCapability
  }

  const fetchCapability = async (force = false): Promise<TCapability | null> => {
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

    const promise = (async (): Promise<TCapability | null> => {
      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return null
      }

      await ensureBackendReady()

      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return null
      }

      const client = getApolloClient()
      const { data, errors } = await client.query<CapabilityPayload<TCapability>>({
        query: options.query,
        fetchPolicy: 'network-only',
      })

      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return null
      }

      if (errors && errors.length > 0) {
        throw joinGraphqlErrors(errors)
      }

      const nextCapability = data[options.queryField] ?? null
      if (!nextCapability) {
        throw new Error(`${options.label} capability was not returned.`)
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
      if (!hasBindingRevisionChanged(bindingRevisionAtStart)) {
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

  const ensureResolved = async (): Promise<TCapability | null> => fetchCapability(false)

  const refresh = async (): Promise<TCapability | null> => {
    invalidate()
    return fetchCapability(true)
  }

  const setEnabled = async (enabled: boolean): Promise<TCapability> => {
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
      const { data, errors } = await client.mutate<CapabilityPayload<TCapability>>({
        mutation: options.mutation,
        variables: { enabled },
      })

      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return await resolveCurrentBindingCapability()
      }

      if (errors && errors.length > 0) {
        throw joinGraphqlErrors(errors)
      }

      const nextCapability = data?.[options.mutationField] ?? null
      if (!nextCapability) {
        throw new Error(`${options.label} capability update was not returned.`)
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
