<template>
  <iframe
    ref="iframeRef"
    :src="iframeSrc"
    class="h-full min-h-[28rem] w-full bg-white"
    :title="$t('applications.components.applications.ApplicationIframeHost.iframeTitle')"
    @load="handleIframeLoad"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  APPLICATION_IFRAME_CHANNEL,
  APPLICATION_IFRAME_CONTRACT_VERSION_V3,
  APPLICATION_IFRAME_READY_EVENT,
  isApplicationIframeEnvelopeV3,
  isApplicationUiReadyEnvelopeV3,
  type ApplicationHostBootstrapEnvelopeV3,
  type ApplicationIframeReadySignal,
} from '@autobyteus/application-sdk-contracts'
import { useLocalization } from '~/composables/useLocalization'
import {
  buildApplicationIframeSrc,
  type ApplicationIframeLaunchDescriptor,
} from '~/utils/application/applicationLaunchDescriptor'

const props = defineProps<{
  descriptor: ApplicationIframeLaunchDescriptor
  bootstrapEnvelope: ApplicationHostBootstrapEnvelopeV3 | null
}>()

const emit = defineEmits<{
  iframeLoad: [{ applicationId: string; iframeLaunchId: string; src: string }]
  ready: [signal: ApplicationIframeReadySignal]
  bootstrapDelivered: [{ applicationId: string; iframeLaunchId: string }]
  bridgeError: [message: string]
}>()

const { t: $t } = useLocalization()
const iframeRef = ref<HTMLIFrameElement | null>(null)
const deliveredBootstrapKey = ref<string | null>(null)

const logIframeHost = (message: string): void => {
  console.info(`[ApplicationIframeHost] ${message}`)
}

const iframeSrc = computed(() => buildApplicationIframeSrc(props.descriptor))

const emitBridgeError = (message: string): void => {
  console.warn(
    `[ApplicationIframeHost] bridge error applicationId=${props.descriptor.applicationId} iframeLaunchId=${props.descriptor.iframeLaunchId} message=${message}`,
  )
  emit('bridgeError', message)
}

const postBootstrapEnvelope = (envelope: ApplicationHostBootstrapEnvelopeV3): void => {
  const bootstrapKey = `${envelope.payload.application.applicationId}::${envelope.payload.iframeLaunchId}`
  if (deliveredBootstrapKey.value === bootstrapKey) {
    return
  }

  const contentWindow = iframeRef.value?.contentWindow
  if (!contentWindow) {
    emitBridgeError($t('applications.components.applications.ApplicationIframeHost.iframeWindowUnavailable'))
    return
  }

  try {
    contentWindow.postMessage(
      envelope,
      props.descriptor.expectedIframeOrigin,
    )
  } catch (error) {
    emitBridgeError(error instanceof Error ? error.message : String(error))
    return
  }

  deliveredBootstrapKey.value = bootstrapKey
  logIframeHost(
    `posted bootstrap payload applicationId=${envelope.payload.application.applicationId} iframeLaunchId=${envelope.payload.iframeLaunchId}`,
  )
  emit('bootstrapDelivered', {
    applicationId: envelope.payload.application.applicationId,
    iframeLaunchId: envelope.payload.iframeLaunchId,
  })
}

const handleIframeMessage = (event: MessageEvent): void => {
  const contentWindow = iframeRef.value?.contentWindow
  if (!contentWindow || event.source !== contentWindow) {
    return
  }
  if (event.origin !== props.descriptor.expectedIframeOrigin) {
    return
  }

  const payload = event.data
  if (!isApplicationIframeEnvelopeV3(payload)) {
    return
  }
  if (payload.channel !== APPLICATION_IFRAME_CHANNEL) {
    return
  }
  if (payload.eventName !== APPLICATION_IFRAME_READY_EVENT) {
    return
  }
  if (payload.contractVersion !== APPLICATION_IFRAME_CONTRACT_VERSION_V3) {
    emitBridgeError(
      $t('applications.components.applications.ApplicationIframeHost.unsupportedContractVersion', {
        actual: payload.contractVersion,
        expected: APPLICATION_IFRAME_CONTRACT_VERSION_V3,
      }),
    )
    return
  }
  if (!isApplicationUiReadyEnvelopeV3(payload)) {
    return
  }
  if (payload.payload.applicationId !== props.descriptor.applicationId) {
    return
  }
  if (payload.payload.iframeLaunchId !== props.descriptor.iframeLaunchId) {
    return
  }

  logIframeHost(
    `received ready event applicationId=${payload.payload.applicationId} iframeLaunchId=${payload.payload.iframeLaunchId} origin=${event.origin}`,
  )
  emit('ready', {
    applicationId: payload.payload.applicationId,
    iframeLaunchId: payload.payload.iframeLaunchId,
    iframeOrigin: event.origin,
  })
}

const handleIframeLoad = (): void => {
  logIframeHost(
    `iframe loaded applicationId=${props.descriptor.applicationId} iframeLaunchId=${props.descriptor.iframeLaunchId} src=${iframeSrc.value}`,
  )
  emit('iframeLoad', {
    applicationId: props.descriptor.applicationId,
    iframeLaunchId: props.descriptor.iframeLaunchId,
    src: iframeSrc.value,
  })
}

watch(
  () => `${props.descriptor.applicationId}:${props.descriptor.iframeLaunchId}`,
  () => {
    deliveredBootstrapKey.value = null
  },
)

watch(
  () => props.bootstrapEnvelope,
  (envelope) => {
    if (!envelope) {
      return
    }
    if (envelope.payload.application.applicationId !== props.descriptor.applicationId) {
      return
    }
    if (envelope.payload.iframeLaunchId !== props.descriptor.iframeLaunchId) {
      return
    }

    postBootstrapEnvelope(envelope)
  },
  { immediate: true },
)

onMounted(() => {
  window.addEventListener('message', handleIframeMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleIframeMessage)
})
</script>
