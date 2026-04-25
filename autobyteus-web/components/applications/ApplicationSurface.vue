<template>
  <div
    v-if="application && iframeLaunchId"
    class="h-full min-h-[32rem] w-full"
  >
    <div class="relative h-full min-h-0 overflow-hidden bg-slate-950">
      <div
        v-if="launchDescriptor"
        class="h-full min-h-0 w-full transition-opacity duration-200"
        :class="isCanvasRevealed ? 'opacity-100' : 'pointer-events-none select-none opacity-0'"
        :aria-hidden="isCanvasRevealed ? 'false' : 'true'"
        data-testid="application-surface-canvas"
      >
        <ApplicationIframeHost
          :key="iframeMountKey"
          :descriptor="launchDescriptor"
          :bootstrap-envelope="pendingBootstrapEnvelope"
          @bridge-error="handleBridgeError"
          @bootstrap-delivered="handleBootstrapDelivered"
          @ready="handleReady"
        />
      </div>

      <div
        v-if="launchState === 'failed'"
        class="absolute inset-0 flex min-h-[20rem] flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center"
        data-testid="application-surface-failure-overlay"
      >
        <div class="rounded-full bg-red-500/15 p-3 text-red-300">
          <span class="i-heroicons-exclamation-triangle-20-solid h-6 w-6"></span>
        </div>
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-white">{{ $t('applications.components.applications.ApplicationIframeHost.initializationFailed') }}</h3>
          <p class="max-w-xl text-sm text-slate-300">
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
        class="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950 px-6"
        data-testid="application-surface-loading-overlay"
      >
        <div class="flex flex-col items-center gap-3 text-slate-300">
          <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-400"></div>
          <p class="text-sm font-medium text-white">{{ $t('applications.components.applications.ApplicationIframeHost.initializingApplication') }}</p>
        </div>
      </div>
    </div>
  </div>

  <div
    v-else
    class="flex h-full min-h-[20rem] items-center justify-center bg-slate-950 px-6 text-center text-slate-300"
  >
    <div class="max-w-lg rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-xl shadow-slate-950/30">
      <h2 class="text-lg font-semibold text-white">{{ $t('applications.components.applications.ApplicationSurface.applicationUnavailable') }}</h2>
      <p class="mt-2 text-sm leading-6 text-slate-300">
        {{ $t('applications.components.applications.ApplicationSurface.applicationUnavailableHelp') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import {
  APPLICATION_IFRAME_READY_EVENT,
  createApplicationHostBootstrapEnvelopeV3,
  type ApplicationHostBootstrapEnvelopeV3,
  type ApplicationIframeReadySignal,
} from '@autobyteus/application-sdk-contracts'
import ApplicationIframeHost from '~/components/applications/ApplicationIframeHost.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ApplicationDetailRecord } from '~/stores/applicationStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import {
  areApplicationIframeDescriptorInputsEqual,
  buildApplicationIframeLaunchDescriptor,
  normalizeApplicationHostOrigin,
  type ApplicationIframeLaunchDescriptor,
  type ApplicationIframeLaunchDescriptorInputs,
} from '~/utils/application/applicationLaunchDescriptor'
import { buildApplicationHostTransport } from '~/utils/application/applicationHostTransport'

const APPLICATION_IFRAME_READY_TIMEOUT_MS = 10_000

const props = defineProps<{
  application: ApplicationDetailRecord | null
  iframeLaunchId: string | null
}>()

const { t: $t } = useLocalization()
const windowNodeContextStore = useWindowNodeContextStore()

const launchDescriptor = shallowRef<ApplicationIframeLaunchDescriptor | null>(null)
const committedLaunchInputs = shallowRef<ApplicationIframeLaunchDescriptorInputs | null>(null)
const committedIframeLaunchId = ref<string | null>(null)
const pendingBootstrapEnvelope = shallowRef<ApplicationHostBootstrapEnvelopeV3 | null>(null)
const launchState = ref<'waiting_for_ready' | 'bootstrapped' | 'failed'>('waiting_for_ready')
const launchError = ref<string | null>(null)
const readyTimeoutHandle = ref<number | null>(null)
const iframeMountRevision = ref(0)

const iframeMountKey = computed(() => {
  if (!launchDescriptor.value) {
    return 'unmounted'
  }
  return `${launchDescriptor.value.iframeLaunchId}:${iframeMountRevision.value}`
})

const isCanvasRevealed = computed(() => launchState.value === 'bootstrapped')

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
  committedIframeLaunchId.value = null
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
      `[ApplicationSurface] launch failed applicationId=${launchDescriptor.value.applicationId} iframeLaunchId=${launchDescriptor.value.iframeLaunchId} message=${message}`,
    )
  }
}

const startWaitingForReady = (descriptor: ApplicationIframeLaunchDescriptor): void => {
  clearReadyTimeout()
  pendingBootstrapEnvelope.value = null
  launchError.value = null
  launchState.value = 'waiting_for_ready'
  logApplicationSurface(
    `committed launch descriptor applicationId=${descriptor.applicationId} iframeLaunchId=${descriptor.iframeLaunchId} entryHtmlUrl=${descriptor.entryHtmlUrl}`,
  )
  readyTimeoutHandle.value = window.setTimeout(() => {
    failLaunch(
      $t('applications.components.applications.ApplicationIframeHost.readyTimeout', {
        eventName: APPLICATION_IFRAME_READY_EVENT,
        timeoutMs: APPLICATION_IFRAME_READY_TIMEOUT_MS,
      }),
    )
  }, APPLICATION_IFRAME_READY_TIMEOUT_MS)
}

const buildLaunchInputs = (application: ApplicationDetailRecord): ApplicationIframeLaunchDescriptorInputs => ({
  applicationId: application.id,
  entryHtmlAssetPath: application.entryHtmlAssetPath,
  restBaseUrl: windowNodeContextStore.getBoundEndpoints().rest,
  normalizedHostOrigin: normalizeApplicationHostOrigin(
    window.location.origin,
    window.location.protocol,
  ),
})

const commitLaunchDescriptor = (forceRemount: boolean): void => {
  const currentApplication = props.application
  const currentIframeLaunchId = props.iframeLaunchId?.trim() || ''
  if (!currentApplication || !currentIframeLaunchId) {
    resetLaunchState()
    return
  }

  try {
    const nextInputs = buildLaunchInputs(currentApplication)
    const inputsChanged = !areApplicationIframeDescriptorInputsEqual(
      committedLaunchInputs.value,
      nextInputs,
    )
    const launchChanged = committedIframeLaunchId.value !== currentIframeLaunchId

    if (!forceRemount && !inputsChanged && !launchChanged && launchDescriptor.value) {
      return
    }

    iframeMountRevision.value += 1
    committedLaunchInputs.value = nextInputs
    committedIframeLaunchId.value = currentIframeLaunchId
    launchDescriptor.value = buildApplicationIframeLaunchDescriptor(
      nextInputs,
      currentIframeLaunchId,
    )
    startWaitingForReady(launchDescriptor.value)
  } catch (error) {
    failLaunch(error instanceof Error ? error.message : String(error))
  }
}

const handleReady = (signal: ApplicationIframeReadySignal): void => {
  const currentApplication = props.application
  const descriptor = launchDescriptor.value
  if (!currentApplication || !descriptor) {
    return
  }
  if (launchState.value !== 'waiting_for_ready' || pendingBootstrapEnvelope.value) {
    return
  }
  if (signal.applicationId !== descriptor.applicationId) {
    return
  }
  if (signal.iframeLaunchId !== descriptor.iframeLaunchId) {
    return
  }
  if (signal.iframeOrigin !== descriptor.expectedIframeOrigin) {
    return
  }

  logApplicationSurface(
    `accepted ready event applicationId=${signal.applicationId} iframeLaunchId=${signal.iframeLaunchId} origin=${signal.iframeOrigin}`,
  )

  pendingBootstrapEnvelope.value = createApplicationHostBootstrapEnvelopeV3({
    host: {
      origin: descriptor.normalizedHostOrigin,
    },
    application: {
      applicationId: currentApplication.id,
      localApplicationId: currentApplication.technicalDetails.localApplicationId,
      packageId: currentApplication.technicalDetails.packageId,
      name: currentApplication.name,
    },
    iframeLaunchId: descriptor.iframeLaunchId,
    requestContext: {
      applicationId: currentApplication.id,
    },
    transport: buildApplicationHostTransport(
      windowNodeContextStore.getBoundEndpoints(),
      currentApplication.id,
    ),
  })
}

const handleBootstrapDelivered = (payload: {
  applicationId: string
  iframeLaunchId: string
}): void => {
  const descriptor = launchDescriptor.value
  if (!descriptor) {
    return
  }
  if (payload.applicationId !== descriptor.applicationId) {
    return
  }
  if (payload.iframeLaunchId !== descriptor.iframeLaunchId) {
    return
  }

  clearReadyTimeout()
  launchState.value = 'bootstrapped'
  launchError.value = null
  pendingBootstrapEnvelope.value = null
}

const handleBridgeError = (message: string): void => {
  failLaunch(message)
}

const retryLaunch = (): void => {
  commitLaunchDescriptor(true)
}

watch(
  () => [
    props.application?.id ?? '',
    props.application?.entryHtmlAssetPath ?? '',
    props.iframeLaunchId ?? '',
    windowNodeContextStore.bindingRevision,
  ] as const,
  () => {
    commitLaunchDescriptor(false)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  clearReadyTimeout()
})
</script>
