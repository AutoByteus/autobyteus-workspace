<template>
  <div class="relative h-full min-h-[28rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <template v-if="session">
      <div
        v-if="session.bootstrapState === 'bootstrap_failed'"
        class="flex h-full min-h-[28rem] flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center"
      >
        <div class="rounded-full bg-red-100 p-3 text-red-600">
          <span class="i-heroicons-exclamation-triangle-20-solid h-6 w-6"></span>
        </div>
        <div class="space-y-2">
          <h3 class="text-lg font-semibold text-slate-900">Application initialization failed</h3>
          <p class="max-w-xl text-sm text-slate-600">
            {{ session.bootstrapError || 'The bundled application did not complete the required iframe handshake.' }}
          </p>
        </div>
        <button
          type="button"
          class="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          @click="retryBootstrap"
        >
          Retry bootstrap
        </button>
      </div>

      <template v-else-if="iframeSrc">
        <iframe
          ref="iframeRef"
          :key="iframeRenderKey"
          :src="iframeSrc"
          class="h-full min-h-[28rem] w-full bg-white"
          title="Application iframe host"
          @load="handleIframeLoad"
        />

        <div
          v-if="session.bootstrapState !== 'bootstrapped'"
          class="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/85 backdrop-blur-sm"
        >
          <div class="flex flex-col items-center gap-3 text-slate-600">
            <div class="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p class="text-sm font-medium">Initializing application…</p>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useApplicationSessionStore } from '~/stores/applicationSessionStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'
import {
  APPLICATION_IFRAME_CHANNEL,
  APPLICATION_IFRAME_CONTRACT_VERSION_V1,
  APPLICATION_IFRAME_READY_EVENT,
  APPLICATION_IFRAME_READY_TIMEOUT_MS,
  createApplicationHostBootstrapEnvelopeV1,
  isApplicationIframeEnvelopeV1,
  isApplicationUiReadyEnvelopeV1,
  serializeApplicationHostOrigin,
} from '~/types/application/ApplicationIframeContract'
import {
  appendApplicationIframeLaunchHints,
  resolveApplicationAssetOrigin,
  resolveApplicationAssetUrl,
} from '~/utils/application/applicationAssetUrl'
import { buildApplicationSessionTransport } from '~/utils/application/applicationSessionTransport'

type IframeLaunchDescriptor = {
  src: string
  expectedIframeOrigin: string
  hostOrigin: string
}

const props = defineProps<{
  applicationSessionId: string
}>()

const applicationSessionStore = useApplicationSessionStore()
const windowNodeContextStore = useWindowNodeContextStore()
const iframeRef = ref<HTMLIFrameElement | null>(null)
const iframeRenderKey = ref(0)
const readyTimeoutHandle = ref<number | null>(null)
const handshakeCompleted = ref(false)
const iframeSrc = ref<string | null>(null)
const iframeLaunchDescriptor = ref<IframeLaunchDescriptor | null>(null)

const session = computed(() =>
  applicationSessionStore.getSessionById(props.applicationSessionId),
)

const clearReadyTimeout = (): void => {
  if (readyTimeoutHandle.value !== null) {
    window.clearTimeout(readyTimeoutHandle.value)
    readyTimeoutHandle.value = null
  }
}

const failBootstrap = (message: string): void => {
  clearReadyTimeout()
  handshakeCompleted.value = true
  applicationSessionStore.markSessionBootstrapFailed(props.applicationSessionId, message)
}

const beginWaitingForReady = (): void => {
  clearReadyTimeout()
  handshakeCompleted.value = false
  applicationSessionStore.markSessionBootstrapWaiting(props.applicationSessionId)
  readyTimeoutHandle.value = window.setTimeout(() => {
    failBootstrap(
      `The bundled application did not send a valid ${APPLICATION_IFRAME_READY_EVENT} message within ${APPLICATION_IFRAME_READY_TIMEOUT_MS} ms.`,
    )
  }, APPLICATION_IFRAME_READY_TIMEOUT_MS)
}

const syncIframeLaunchDescriptor = (): void => {
  clearReadyTimeout()
  handshakeCompleted.value = false
  iframeLaunchDescriptor.value = null
  iframeSrc.value = null

  const currentSession = session.value
  if (!currentSession) {
    return
  }

  try {
    const absoluteEntryHtmlUrl = resolveApplicationAssetUrl(
      currentSession.application.entryHtmlAssetPath,
      windowNodeContextStore.getBoundEndpoints().rest,
    )
    const hostOrigin = serializeApplicationHostOrigin(window.location.origin)
    const src = appendApplicationIframeLaunchHints(absoluteEntryHtmlUrl, {
      contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V1,
      applicationSessionId: currentSession.applicationSessionId,
      hostOrigin,
    })

    iframeLaunchDescriptor.value = {
      src,
      expectedIframeOrigin: resolveApplicationAssetOrigin(absoluteEntryHtmlUrl),
      hostOrigin,
    }
    iframeSrc.value = src
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    failBootstrap(message)
  }
}

const postBootstrapPayload = (): void => {
  const currentSession = session.value
  const launchDescriptor = iframeLaunchDescriptor.value
  const contentWindow = iframeRef.value?.contentWindow
  if (!currentSession || !contentWindow || !launchDescriptor) {
    failBootstrap('Application iframe window is not available for bootstrap.')
    return
  }

  const bootstrapMessage = createApplicationHostBootstrapEnvelopeV1({
    host: {
      origin: launchDescriptor.hostOrigin,
    },
    application: {
      applicationId: currentSession.application.applicationId,
      localApplicationId: currentSession.application.localApplicationId,
      packageId: currentSession.application.packageId,
      name: currentSession.application.name,
    },
    session: {
      applicationSessionId: currentSession.applicationSessionId,
    },
    runtime: currentSession.runtime,
    transport: buildApplicationSessionTransport(
      windowNodeContextStore.getBoundEndpoints(),
    ),
  })

  contentWindow.postMessage(
    bootstrapMessage,
    launchDescriptor.expectedIframeOrigin,
  )
  handshakeCompleted.value = true
  clearReadyTimeout()
  applicationSessionStore.markSessionBootstrapped(currentSession.applicationSessionId)
}

const handleIframeMessage = (event: MessageEvent): void => {
  const currentSession = session.value
  const launchDescriptor = iframeLaunchDescriptor.value
  const contentWindow = iframeRef.value?.contentWindow
  if (!currentSession || !launchDescriptor || !contentWindow || event.source !== contentWindow) {
    return
  }
  if (event.origin !== launchDescriptor.expectedIframeOrigin) {
    return
  }

  const payload = event.data
  if (!isApplicationIframeEnvelopeV1(payload)) {
    return
  }
  if (payload.channel !== APPLICATION_IFRAME_CHANNEL) {
    return
  }
  if (payload.eventName !== APPLICATION_IFRAME_READY_EVENT) {
    return
  }
  if (payload.contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION_V1) {
    failBootstrap(
      `Unsupported application iframe contract version '${payload.contractVersion}'. Expected '${APPLICATION_IFRAME_CONTRACT_VERSION_V1}'.`,
    )
    return
  }
  if (!isApplicationUiReadyEnvelopeV1(payload)) {
    return
  }
  if (payload.payload.applicationSessionId !== currentSession.applicationSessionId) {
    return
  }
  if (handshakeCompleted.value) {
    return
  }

  postBootstrapPayload()
}

const handleIframeLoad = (): void => {
  if (!session.value || !iframeLaunchDescriptor.value) {
    return
  }
  beginWaitingForReady()
}

const retryBootstrap = (): void => {
  clearReadyTimeout()
  handshakeCompleted.value = false
  applicationSessionStore.retryBootstrap(props.applicationSessionId)
  syncIframeLaunchDescriptor()
  iframeRenderKey.value += 1
}

watch(
  () => [
    props.applicationSessionId,
    session.value?.application.entryHtmlAssetPath ?? '',
    windowNodeContextStore.getBoundEndpoints().rest,
  ],
  () => {
    syncIframeLaunchDescriptor()
    iframeRenderKey.value += 1
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('message', handleIframeMessage)
})

onBeforeUnmount(() => {
  clearReadyTimeout()
  window.removeEventListener('message', handleIframeMessage)
})
</script>
