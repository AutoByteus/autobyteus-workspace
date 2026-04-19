import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { useApplicationsCapabilityStore } from '~/stores/applicationsCapabilityStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import { createApplicationLaunchInstanceId } from '~/utils/application/applicationLaunchDescriptor'

export type ApplicationHostLaunchStatus = 'idle' | 'preparing' | 'ready' | 'failed'

export type ApplicationHostLaunchState = {
  applicationId: string
  status: ApplicationHostLaunchStatus
  launchInstanceId: string | null
  engineState: string | null
  startedAt: string | null
  lastFailure: string | null
  lastError: string | null
}

type EnsureReadyResponse = {
  state?: string | null
  ready?: boolean | null
  startedAt?: string | null
  lastFailure?: string | null
}

const createIdleLaunchState = (applicationId: string): ApplicationHostLaunchState => ({
  applicationId,
  status: 'idle',
  launchInstanceId: null,
  engineState: null,
  startedAt: null,
  lastFailure: null,
  lastError: null,
})

const readErrorMessage = async (response: Response): Promise<string> => {
  const payload = await response.json().catch(() => null) as { detail?: string; message?: string } | null
  return payload?.detail || payload?.message || `Request failed with status ${response.status}.`
}

export const useApplicationHostStore = defineStore('applicationHost', () => {
  const launches = ref<Record<string, ApplicationHostLaunchState>>({})
  const launchGenerations = ref<Record<string, number>>({})
  let watcherRegistered = false
  const windowNodeContextStore = useWindowNodeContextStore()

  const getLaunchState = computed(
    () => (applicationId: string): ApplicationHostLaunchState => (
      launches.value[applicationId] ?? createIdleLaunchState(applicationId)
    ),
  )

  const hasBindingRevisionChanged = (bindingRevisionAtStart: number): boolean => (
    windowNodeContextStore.bindingRevision !== bindingRevisionAtStart
  )

  const setLaunchState = (nextState: ApplicationHostLaunchState): ApplicationHostLaunchState => {
    launches.value = {
      ...launches.value,
      [nextState.applicationId]: nextState,
    }
    return nextState
  }

  const resetLaunches = (): void => {
    launches.value = {}
    launchGenerations.value = {}
  }

  const clearLaunchState = (applicationId: string): void => {
    const normalizedApplicationId = applicationId.trim()
    if (!normalizedApplicationId) {
      return
    }

    if (Object.prototype.hasOwnProperty.call(launches.value, normalizedApplicationId)) {
      const nextLaunches = { ...launches.value }
      delete nextLaunches[normalizedApplicationId]
      launches.value = nextLaunches
    }

    if (Object.prototype.hasOwnProperty.call(launchGenerations.value, normalizedApplicationId)) {
      const nextGenerations = { ...launchGenerations.value }
      delete nextGenerations[normalizedApplicationId]
      launchGenerations.value = nextGenerations
    }
  }

  const ensureBackendReady = async (): Promise<void> => {
    const isReady = await windowNodeContextStore.waitForBoundBackendReady()
    if (!isReady) {
      throw new Error(windowNodeContextStore.lastReadyError || 'Bound backend is not ready')
    }
  }

  const requestEnsureReady = async (applicationId: string): Promise<EnsureReadyResponse> => {
    const restBaseUrl = windowNodeContextStore.getBoundEndpoints().rest.replace(/\/+$/, '')
    const response = await globalThis.fetch(
      `${restBaseUrl}/applications/${encodeURIComponent(applicationId)}/backend/ensure-ready`,
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
        },
      },
    )

    if (!response.ok) {
      throw new Error(await readErrorMessage(response))
    }

    return await response.json() as EnsureReadyResponse
  }

  const startLaunch = async (applicationId: string): Promise<ApplicationHostLaunchState> => {
    const normalizedApplicationId = applicationId.trim()
    if (!normalizedApplicationId) {
      throw new Error('applicationId is required.')
    }

    const bindingRevisionAtStart = windowNodeContextStore.bindingRevision
    const applicationsCapabilityStore = useApplicationsCapabilityStore()
    await applicationsCapabilityStore.ensureResolved()

    if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
      throw new Error('Application host launch was interrupted by a backend rebinding.')
    }

    if (!applicationsCapabilityStore.isEnabled) {
      throw new Error('Applications are disabled in the current runtime configuration.')
    }

    setLaunchState({
      ...createIdleLaunchState(normalizedApplicationId),
      status: 'preparing',
    })

    try {
      await ensureBackendReady()

      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        throw new Error('Application host launch was interrupted by a backend rebinding.')
      }

      const engineStatus = await requestEnsureReady(normalizedApplicationId)

      if (hasBindingRevisionChanged(bindingRevisionAtStart)) {
        throw new Error('Application host launch was interrupted by a backend rebinding.')
      }

      const nextGeneration = (launchGenerations.value[normalizedApplicationId] ?? 0) + 1
      launchGenerations.value = {
        ...launchGenerations.value,
        [normalizedApplicationId]: nextGeneration,
      }

      return setLaunchState({
        applicationId: normalizedApplicationId,
        status: 'ready',
        launchInstanceId: createApplicationLaunchInstanceId(normalizedApplicationId, nextGeneration),
        engineState: typeof engineStatus.state === 'string' ? engineStatus.state : null,
        startedAt: typeof engineStatus.startedAt === 'string' ? engineStatus.startedAt : null,
        lastFailure: typeof engineStatus.lastFailure === 'string' ? engineStatus.lastFailure : null,
        lastError: null,
      })
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause)
      setLaunchState({
        applicationId: normalizedApplicationId,
        status: 'failed',
        launchInstanceId: null,
        engineState: null,
        startedAt: null,
        lastFailure: null,
        lastError: message,
      })
      throw cause
    }
  }

  const registerWatchers = (): void => {
    if (watcherRegistered) {
      return
    }

    const applicationsCapabilityStore = useApplicationsCapabilityStore()

    watch(
      () => windowNodeContextStore.bindingRevision,
      () => {
        resetLaunches()
      },
      { flush: 'sync' },
    )

    watch(
      () => [applicationsCapabilityStore.status, applicationsCapabilityStore.isEnabled] as const,
      ([statusValue, isEnabledValue]) => {
        if (statusValue !== 'resolved' || !isEnabledValue) {
          resetLaunches()
        }
      },
      { immediate: true, flush: 'sync' },
    )

    watcherRegistered = true
  }

  registerWatchers()

  return {
    getLaunchState,
    startLaunch,
    clearLaunchState,
    resetLaunches,
  }
})
