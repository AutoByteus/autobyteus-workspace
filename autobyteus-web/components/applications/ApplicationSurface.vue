<template>
  <div
    v-if="application && launchInstanceId"
    class="h-full min-h-[32rem]"
  >
    <div class="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <ApplicationIframeHost
        v-if="launchDescriptor"
        :key="iframeMountKey"
        :descriptor="launchDescriptor"
        :bootstrap-envelope="pendingBootstrapEnvelope"
        @bridge-error="handleBridgeError"
        @bootstrap-delivered="handleBootstrapDelivered"
        @ready="handleReady"
      />

      <div
        v-if="launchState === 'failed'"
        class="absolute inset-0 flex min-h-[20rem] flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center"
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
    <h2 class="text-lg font-semibold text-slate-900">{{ $t('applications.components.applications.ApplicationSurface.applicationUnavailable') }}</h2>
    <p class="mt-2 text-sm">
      {{ $t('applications.components.applications.ApplicationSurface.applicationUnavailableHelp') }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import ApplicationIframeHost from '~/components/applications/ApplicationIframeHost.vue'
import { useLocalization } from '~/composables/useLocalization'
import type { ApplicationCatalogEntry } from '~/stores/applicationStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import {
  APPLICATION_IFRAME_READY_TIMEOUT_MS,
  createApplicationHostBootstrapEnvelopeV2,
  type ApplicationHostBootstrapEnvelopeV2,
  type ApplicationIframeReadySignal,
} from '~/types/application/ApplicationIframeContract'
import {
  areApplicationIframeDescriptorInputsEqual,
  buildApplicationIframeLaunchDescriptor,
  normalizeApplicationHostOrigin,
  type ApplicationIframeLaunchDescriptor,
  type ApplicationIframeLaunchDescriptorInputs,
} from '~/utils/application/applicationLaunchDescriptor'
import { buildApplicationHostTransport } from '~/utils/application/applicationHostTransport'

const props = defineProps<{
  application: ApplicationCatalogEntry | null
  launchInstanceId: string | null
}>()

const { t: $t } = useLocalization()
const windowNodeContextStore = useWindowNodeContextStore()

const launchDescriptor = shallowRef<ApplicationIframeLaunchDescriptor | null>(null)
const committedLaunchInputs = shallowRef<ApplicationIframeLaunchDescriptorInputs | null>(null)
const committedLaunchInstanceId = ref<string | null>(null)
const pendingBootstrapEnvelope = shallowRef<ApplicationHostBootstrapEnvelopeV2 | null>(null)
const launchState = ref<'waiting_for_ready' | 'bootstrapped' | 'failed'>('waiting_for_ready')
const launchError = ref<string | null>(null)
const readyTimeoutHandle = ref<number | null>(null)
const iframeMountRevision = ref(0)

const iframeMountKey = computed(() => {
  if (!launchDescriptor.value) {
    return 'unmounted'
  }
  return `${launchDescriptor.value.launchInstanceId}:${iframeMountRevision.value}`
})

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
  committedLaunchInstanceId.value = null
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
      `[ApplicationSurface] launch failed applicationId=${launchDescriptor.value.applicationId} launchInstanceId=${launchDescriptor.value.launchInstanceId} message=${message}`,
    )
  }
}

const startWaitingForReady = (descriptor: ApplicationIframeLaunchDescriptor): void => {
  clearReadyTimeout()
  pendingBootstrapEnvelope.value = null
  launchError.value = null
  launchState.value = 'waiting_for_ready'
  logApplicationSurface(
    `committed launch descriptor applicationId=${descriptor.applicationId} launchInstanceId=${descriptor.launchInstanceId} entryHtmlUrl=${descriptor.entryHtmlUrl}`,
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

const buildLaunchInputs = (application: ApplicationCatalogEntry): ApplicationIframeLaunchDescriptorInputs => ({
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
  const currentLaunchInstanceId = props.launchInstanceId?.trim() || ''
  if (!currentApplication || !currentLaunchInstanceId) {
    resetLaunchState()
    return
  }

  try {
    const nextInputs = buildLaunchInputs(currentApplication)
    const inputsChanged = !areApplicationIframeDescriptorInputsEqual(
      committedLaunchInputs.value,
      nextInputs,
    )
    const launchChanged = committedLaunchInstanceId.value !== currentLaunchInstanceId

    if (!forceRemount && !inputsChanged && !launchChanged && launchDescriptor.value) {
      return
    }

    iframeMountRevision.value += 1
    committedLaunchInputs.value = nextInputs
    committedLaunchInstanceId.value = currentLaunchInstanceId
    launchDescriptor.value = buildApplicationIframeLaunchDescriptor(
      nextInputs,
      currentLaunchInstanceId,
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
  if (signal.launchInstanceId !== descriptor.launchInstanceId) {
    return
  }
  if (signal.iframeOrigin !== descriptor.expectedIframeOrigin) {
    return
  }

  logApplicationSurface(
    `accepted ready event applicationId=${signal.applicationId} launchInstanceId=${signal.launchInstanceId} origin=${signal.iframeOrigin}`,
  )

  pendingBootstrapEnvelope.value = createApplicationHostBootstrapEnvelopeV2({
    host: {
      origin: descriptor.normalizedHostOrigin,
    },
    application: {
      applicationId: currentApplication.id,
      localApplicationId: currentApplication.localApplicationId,
      packageId: currentApplication.packageId,
      name: currentApplication.name,
    },
    launch: {
      launchInstanceId: descriptor.launchInstanceId,
    },
    requestContext: {
      applicationId: currentApplication.id,
      launchInstanceId: descriptor.launchInstanceId,
    },
    transport: buildApplicationHostTransport(
      windowNodeContextStore.getBoundEndpoints(),
      currentApplication.id,
    ),
  })
}

const handleBootstrapDelivered = (payload: {
  applicationId: string
  launchInstanceId: string
}): void => {
  const descriptor = launchDescriptor.value
  if (!descriptor) {
    return
  }
  if (payload.applicationId !== descriptor.applicationId) {
    return
  }
  if (payload.launchInstanceId !== descriptor.launchInstanceId) {
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
    props.launchInstanceId ?? '',
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
