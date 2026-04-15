<template>
  <iframe
    ref="iframeRef"
    :key="descriptor.launchInstanceId"
    :src="iframeSrc"
    class="h-full min-h-[28rem] w-full bg-white"
    :title="$t('applications.components.applications.ApplicationIframeHost.iframeTitle')"
    @load="handleIframeLoad"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useLocalization } from '~/composables/useLocalization'
import {
  APPLICATION_IFRAME_CHANNEL,
  APPLICATION_IFRAME_CONTRACT_VERSION_V1,
  APPLICATION_IFRAME_READY_EVENT,
  type ApplicationHostBootstrapEnvelopeV1,
  type ApplicationIframeReadySignal,
  isApplicationIframeEnvelopeV1,
  isApplicationUiReadyEnvelopeV1,
} from '~/types/application/ApplicationIframeContract'
import {
  buildApplicationIframeSrc,
  type ApplicationIframeLaunchDescriptor,
} from '~/utils/application/applicationLaunchDescriptor'

const props = defineProps<{
  descriptor: ApplicationIframeLaunchDescriptor
  bootstrapEnvelope: ApplicationHostBootstrapEnvelopeV1 | null
}>()

const emit = defineEmits<{
  iframeLoad: [{ applicationSessionId: string; launchInstanceId: string; src: string }]
  ready: [signal: ApplicationIframeReadySignal]
  bootstrapDelivered: [{ applicationSessionId: string; launchInstanceId: string }]
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
    `[ApplicationIframeHost] bridge error sessionId=${props.descriptor.applicationSessionId} launchInstanceId=${props.descriptor.launchInstanceId} message=${message}`,
  )
  emit('bridgeError', message)
}

const postBootstrapEnvelope = (envelope: ApplicationHostBootstrapEnvelopeV1): void => {
  const bootstrapKey = `${envelope.payload.session.applicationSessionId}::${envelope.payload.session.launchInstanceId}`
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
    `posted bootstrap payload sessionId=${envelope.payload.session.applicationSessionId} launchInstanceId=${envelope.payload.session.launchInstanceId} applicationId=${envelope.payload.application.applicationId}`,
  )
  emit('bootstrapDelivered', {
    applicationSessionId: envelope.payload.session.applicationSessionId,
    launchInstanceId: envelope.payload.session.launchInstanceId,
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
    emitBridgeError(
      $t('applications.components.applications.ApplicationIframeHost.unsupportedContractVersion', {
        actual: payload.contractVersion,
        expected: APPLICATION_IFRAME_CONTRACT_VERSION_V1,
      }),
    )
    return
  }
  if (!isApplicationUiReadyEnvelopeV1(payload)) {
    return
  }
  if (payload.payload.applicationSessionId !== props.descriptor.applicationSessionId) {
    return
  }
  if (payload.payload.launchInstanceId !== props.descriptor.launchInstanceId) {
    return
  }

  logIframeHost(
    `received ready event sessionId=${payload.payload.applicationSessionId} launchInstanceId=${payload.payload.launchInstanceId} origin=${event.origin}`,
  )
  emit('ready', {
    applicationSessionId: payload.payload.applicationSessionId,
    launchInstanceId: payload.payload.launchInstanceId,
    iframeOrigin: event.origin,
  })
}

const handleIframeLoad = (): void => {
  logIframeHost(
    `iframe loaded sessionId=${props.descriptor.applicationSessionId} launchInstanceId=${props.descriptor.launchInstanceId} src=${iframeSrc.value}`,
  )
  emit('iframeLoad', {
    applicationSessionId: props.descriptor.applicationSessionId,
    launchInstanceId: props.descriptor.launchInstanceId,
    src: iframeSrc.value,
  })
}

watch(
  () => props.descriptor.launchInstanceId,
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
    if (envelope.payload.session.applicationSessionId !== props.descriptor.applicationSessionId) {
      return
    }
    if (envelope.payload.session.launchInstanceId !== props.descriptor.launchInstanceId) {
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
