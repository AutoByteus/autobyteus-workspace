import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { getApolloClient } from '~/utils/apolloClient'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { GetSkillImprovementCapability } from '~/graphql/queries/skillImprovementQueries'
import { SetSkillImprovementEnabled } from '~/graphql/mutations/skillImprovementMutations'

export type SkillImprovementCapabilitySource = 'SERVER_SETTING' | 'INITIALIZED_DISABLED'

export interface SkillImprovementCapability {
  enabled: boolean
  settingKey: 'ENABLE_SKILL_IMPROVEMENT'
  source: SkillImprovementCapabilitySource
}

interface SkillImprovementCapabilityQueryResult {
  skillImprovementCapability?: SkillImprovementCapability | null
}

interface SetSkillImprovementEnabledMutationResult {
  setSkillImprovementEnabled?: SkillImprovementCapability | null
}

export type SkillImprovementCapabilityStatus = 'unknown' | 'loading' | 'resolved' | 'error'

export const useSkillImprovementCapabilityStore = defineStore('skillImprovementCapability', () => {
  const capability = ref<SkillImprovementCapability | null>(null)
  const status = ref<SkillImprovementCapabilityStatus>('unknown')
  const error = ref<Error | null>(null)
  const windowNodeContextStore = useWindowNodeContextStore()
  const isEnabled = computed(() => status.value === 'resolved' && capability.value?.enabled === true)

  let resolvePromise: Promise<SkillImprovementCapability | null> | null = null
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

  const resolveCurrentBindingCapability = async (): Promise<SkillImprovementCapability> => {
    if (status.value === 'resolved' && capability.value) {
      return capability.value
    }

    const resolvedCapability = await ensureResolved()
    if (!resolvedCapability) {
      throw new Error('Skill Improvement capability was not resolved for the current binding.')
    }

    return resolvedCapability
  }

  const fetchCapability = async (force = false): Promise<SkillImprovementCapability | null> => {
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

    const promise = (async (): Promise<SkillImprovementCapability | null> => {
      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      await ensureBackendReady()

      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      const client = getApolloClient()
      const { data, errors } = await client.query<SkillImprovementCapabilityQueryResult>({
        query: GetSkillImprovementCapability,
        fetchPolicy: 'network-only',
      })

      if (windowNodeContextStore.bindingRevision !== bindingRevisionAtStart) {
        return null
      }

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const nextCapability = data.skillImprovementCapability ?? null
      if (!nextCapability) {
        throw new Error('Skill Improvement capability was not returned.')
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

  const ensureResolved = async (): Promise<SkillImprovementCapability | null> => fetchCapability(false)

  const refresh = async (): Promise<SkillImprovementCapability | null> => {
    invalidate()
    return fetchCapability(true)
  }

  const setEnabled = async (enabled: boolean): Promise<SkillImprovementCapability> => {
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
      const { data, errors } = await client.mutate<SetSkillImprovementEnabledMutationResult>({
        mutation: SetSkillImprovementEnabled,
        variables: { enabled },
      })

      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        return await resolveCurrentBindingCapability()
      }

      if (errors && errors.length > 0) {
        throw new Error(errors.map((entry: { message: string }) => entry.message).join(', '))
      }

      const nextCapability = data?.setSkillImprovementEnabled ?? null
      if (!nextCapability) {
        throw new Error('Skill Improvement capability update was not returned.')
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
