<template>
  <div
    v-if="session"
    class="h-[calc(100vh-11rem)] min-h-[38rem]"
  >
    <div class="relative h-full min-h-[34rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <ApplicationIframeHost
        v-if="launchDescriptor"
        :descriptor="launchDescriptor"
        :bootstrap-envelope="pendingBootstrapEnvelope"
        @bridge-error="handleBridgeError"
        @bootstrap-delivered="handleBootstrapDelivered"
        @ready="handleReady"
      />

      <div
        v-if="launchState === 'failed'"
        class="absolute inset-0 flex min-h-[34rem] flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center"
      >
        <div class="rounded-full bg-red-100 p-3 text-red-600">
          <span class="i-heroicons-exclamation-triangle-20-solid h-6 w-6"></span>
        </div>
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-slate-900">{{ $t('applications.components.applications.ApplicationIframeHost.initializationFailed') }}</h3>
          <p class="max-w-xl text-sm text-slate-600">
            {{ launchError || $t('applications.components.applications.ApplicationIframeHost.handshakeDidNotComplete') }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          @click="retryLaunch"
        >
          {{ $t('applications.components.applications.ApplicationIframeHost.retryBootstrap') }}
        </button>
      </div>

      <div
        v-else-if="launchDescriptor && launchState !== 'bootstrapped'"
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-3 text-slate-600">
          <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p class="text-sm font-medium">{{ $t('applications.components.applications.ApplicationIframeHost.initializingApplication') }}</p>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else
    class="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600 shadow-sm"
  >
    <h2 class="text-lg font-semibold text-slate-900">{{ $t('applications.components.applications.ApplicationSurface.noActiveSession') }}</h2>
    <p class="mt-2 text-sm">
      {{ $t('applications.components.applications.ApplicationSurface.noActiveSessionHelp') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import ApplicationIframeHost from '~/components/applications/ApplicationIframeHost.vue'
import { useLocalization } from '~/composables/useLocalization'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import {
  APPLICATION_IFRAME_READY_TIMEOUT_MS,
  createApplicationHostBootstrapEnvelopeV1,
  type ApplicationHostBootstrapEnvelopeV1,
  type ApplicationIframeReadySignal,
} from '~/types/application/ApplicationIframeContract'
import type { ApplicationSession } from '~/types/application/ApplicationSession'
import {
  areApplicationIframeDescriptorInputsEqual,
  buildApplicationIframeLaunchDescriptor,
  createApplicationLaunchInstanceId,
  normalizeApplicationHostOrigin,
  type ApplicationIframeLaunchDescriptor,
  type ApplicationIframeLaunchDescriptorInputs,
} from '~/utils/application/applicationLaunchDescriptor'
import { buildApplicationSessionTransport } from '~/utils/application/applicationSessionTransport'

const props = defineProps<{
  session: ApplicationSession | null
}>()

const { t: $t } = useLocalization()
const windowNodeContextStore = useWindowNodeContextStore()

const launchDescriptor = shallowRef<ApplicationIframeLaunchDescriptor | null>(null)
const committedLaunchInputs = shallowRef<ApplicationIframeLaunchDescriptorInputs | null>(null)
const pendingBootstrapEnvelope = shallowRef<ApplicationHostBootstrapEnvelopeV1 | null>(null)
const launchState = ref<'waiting_for_ready' | 'bootstrapped' | 'failed'>('waiting_for_ready')
const launchError = ref<string | null>(null)
const readyTimeoutHandle = ref<number | null>(null)
const launchGeneration = ref(0)

const logApplicationSurface = (message: string): void => {
  console.info(`[ApplicationSurface] ${message}`)
}

const clearReadyTimeout = (): void => {
  if (readyTimeoutHandle.value !== null) {
    window.clearTimeout(readyTimeoutHandle.value)
    readyTimeoutHandle.value = null
  }
}

const resetLaunchState = (): void => {
  clearReadyTimeout()
  launchDescriptor.value = null
  committedLaunchInputs.value = null
  pendingBootstrapEnvelope.value = null
  launchError.value = null
  launchState.value = 'waiting_for_ready'
}

const failLaunch = (message: string): void => {
  clearReadyTimeout()
  pendingBootstrapEnvelope.value = null
  launchState.value = 'failed'
  launchError.value = message
  if (launchDescriptor.value) {
    console.warn(
      `[ApplicationSurface] launch failed sessionId=${launchDescriptor.value.applicationSessionId} launchInstanceId=${launchDescriptor.value.launchInstanceId} message=${message}`,
    )
  }
}

const startWaitingForReady = (descriptor: ApplicationIframeLaunchDescriptor): void => {
  clearReadyTimeout()
  pendingBootstrapEnvelope.value = null
  launchError.value = null
  launchState.value = 'waiting_for_ready'
  logApplicationSurface(
    `committed launch descriptor sessionId=${descriptor.applicationSessionId} launchInstanceId=${descriptor.launchInstanceId} entryHtmlUrl=${descriptor.entryHtmlUrl}`,
  )
  readyTimeoutHandle.value = window.setTimeout(() => {
    failLaunch(
      $t('applications.components.applications.ApplicationIframeHost.readyTimeout', {
        eventName: 'autobyteus.application.ui.ready',
        timeoutMs: APPLICATION_IFRAME_READY_TIMEOUT_MS,
      }),
    )
  }, APPLICATION_IFRAME_READY_TIMEOUT_MS)
}

const buildLaunchInputs = (session: ApplicationSession): ApplicationIframeLaunchDescriptorInputs => ({
  applicationSessionId: session.applicationSessionId,
  entryHtmlAssetPath: session.application.entryHtmlAssetPath,
  restBaseUrl: windowNodeContextStore.getBoundEndpoints().rest,
  normalizedHostOrigin: normalizeApplicationHostOrigin(
    window.location.origin,
    window.location.protocol,
  ),
})

const commitLaunchDescriptor = (forceNewLaunchInstance: boolean): void => {
  const currentSession = props.session
  if (!currentSession) {
    resetLaunchState()
    return
  }

  try {
    const nextInputs = buildLaunchInputs(currentSession)
    const inputsChanged = !areApplicationIframeDescriptorInputsEqual(
      committedLaunchInputs.value,
      nextInputs,
    )

    if (!forceNewLaunchInstance && !inputsChanged && launchDescriptor.value) {
      return
    }

    launchGeneration.value += 1
    const nextDescriptor = buildApplicationIframeLaunchDescriptor(
      nextInputs,
      createApplicationLaunchInstanceId(
        currentSession.applicationSessionId,
        launchGeneration.value,
      ),
    )

    committedLaunchInputs.value = nextInputs
    launchDescriptor.value = nextDescriptor
    startWaitingForReady(nextDescriptor)
  } catch (error) {
    failLaunch(error instanceof Error ? error.message : String(error))
  }
}

const handleReady = (signal: ApplicationIframeReadySignal): void => {
  const currentSession = props.session
  const descriptor = launchDescriptor.value
  if (!currentSession || !descriptor) {
    return
  }
  if (launchState.value !== 'waiting_for_ready' || pendingBootstrapEnvelope.value) {
    return
  }
  if (signal.applicationSessionId !== descriptor.applicationSessionId) {
    return
  }
  if (signal.launchInstanceId !== descriptor.launchInstanceId) {
    return
  }
  if (signal.iframeOrigin !== descriptor.expectedIframeOrigin) {
    return
  }

  logApplicationSurface(
    `accepted ready event sessionId=${signal.applicationSessionId} launchInstanceId=${signal.launchInstanceId} origin=${signal.iframeOrigin}`,
  )

  pendingBootstrapEnvelope.value = createApplicationHostBootstrapEnvelopeV1({
    host: {
      origin: descriptor.normalizedHostOrigin,
    },
    application: {
      applicationId: currentSession.application.applicationId,
      localApplicationId: currentSession.application.localApplicationId,
      packageId: currentSession.application.packageId,
      name: currentSession.application.name,
    },
    session: {
      applicationSessionId: currentSession.applicationSessionId,
      launchInstanceId: descriptor.launchInstanceId,
    },
    runtime: {
      kind: currentSession.runtime.kind,
      runId: currentSession.runtime.runId,
      definitionId: currentSession.runtime.definitionId,
    },
    transport: buildApplicationSessionTransport(
      windowNodeContextStore.getBoundEndpoints(),
      currentSession.application.applicationId,
    ),
  })
}

const handleBootstrapDelivered = (payload: {
  applicationSessionId: string
  launchInstanceId: string
}): void => {
  const descriptor = launchDescriptor.value
  if (!descriptor) {
    return
  }
  if (payload.applicationSessionId !== descriptor.applicationSessionId) {
    return
  }
  if (payload.launchInstanceId !== descriptor.launchInstanceId) {
    return
  }

  clearReadyTimeout()
  launchState.value = 'bootstrapped'
  launchError.value = null
  pendingBootstrapEnvelope.value = null
  logApplicationSurface(
    `bootstrap delivered sessionId=${payload.applicationSessionId} launchInstanceId=${payload.launchInstanceId}`,
  )
}

const handleBridgeError = (message: string): void => {
  failLaunch(message)
}

const retryLaunch = (): void => {
  commitLaunchDescriptor(true)
}

watch(
  [
    () => props.session?.applicationSessionId ?? '',
    () => props.session?.application.entryHtmlAssetPath ?? '',
    () => windowNodeContextStore.getBoundEndpoints().rest,
  ],
  () => {
    commitLaunchDescriptor(false)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearReadyTimeout()
})
</script>
