import type { ApplicationHostTransport } from '~/types/application/ApplicationHostTransport'

export const APPLICATION_IFRAME_CHANNEL = 'autobyteus.application.host' as const
export const APPLICATION_IFRAME_CONTRACT_VERSION_V2 = '2' as const
export const APPLICATION_IFRAME_READY_EVENT = 'autobyteus.application.ui.ready' as const
export const APPLICATION_IFRAME_BOOTSTRAP_EVENT = 'autobyteus.application.host.bootstrap' as const
export const APPLICATION_IFRAME_QUERY_CONTRACT_VERSION = 'autobyteusContractVersion' as const
export const APPLICATION_IFRAME_QUERY_APPLICATION_ID = 'autobyteusApplicationId' as const
export const APPLICATION_IFRAME_QUERY_LAUNCH_INSTANCE_ID = 'autobyteusLaunchInstanceId' as const
export const APPLICATION_IFRAME_QUERY_HOST_ORIGIN = 'autobyteusHostOrigin' as const
export const APPLICATION_IFRAME_READY_TIMEOUT_MS = 10_000

type EmptyObject = Record<string, never>

export type ApplicationIframeLaunchHints = {
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V2
  applicationId: string
  launchInstanceId: string
  hostOrigin: string
}

export type ApplicationIframeEnvelopeV2<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> = {
  channel: typeof APPLICATION_IFRAME_CHANNEL
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V2
  eventName: string
  payload: TPayload
}

export type ApplicationUiReadyPayloadV2 = {
  applicationId: string
  launchInstanceId: string
}

export type ApplicationIframeReadySignal = ApplicationUiReadyPayloadV2 & {
  iframeOrigin: string
}

export type ApplicationUiReadyEnvelopeV2 = ApplicationIframeEnvelopeV2<ApplicationUiReadyPayloadV2> & {
  eventName: typeof APPLICATION_IFRAME_READY_EVENT
}

export type ApplicationBootstrapPayloadV2 = {
  host: {
    origin: string
  }
  application: {
    applicationId: string
    localApplicationId: string
    packageId: string
    name: string
  }
  launch: {
    launchInstanceId: string
  }
  requestContext: {
    applicationId: string
    launchInstanceId: string
  }
  transport: ApplicationHostTransport
}

export type ApplicationHostBootstrapEnvelopeV2 = ApplicationIframeEnvelopeV2<ApplicationBootstrapPayloadV2> & {
  eventName: typeof APPLICATION_IFRAME_BOOTSTRAP_EVENT
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
)

export const isApplicationIframeEnvelopeV2 = (
  value: unknown,
): value is ApplicationIframeEnvelopeV2<Record<string, unknown>> => {
  if (!isObjectRecord(value)) {
    return false
  }

  return (
    value.channel === APPLICATION_IFRAME_CHANNEL
    && typeof value.contractVersion === 'string'
    && typeof value.eventName === 'string'
    && isObjectRecord(value.payload)
  )
}

const hasOnlyReadyPayloadKeys = (payload: Record<string, unknown>): payload is ApplicationUiReadyPayloadV2 => {
  const keys = Object.keys(payload)
  return (
    keys.length === 2
    && keys.includes('applicationId')
    && keys.includes('launchInstanceId')
    && typeof payload.applicationId === 'string'
    && payload.applicationId.trim().length > 0
    && typeof payload.launchInstanceId === 'string'
    && payload.launchInstanceId.trim().length > 0
  )
}

export const isApplicationUiReadyEnvelopeV2 = (
  value: unknown,
): value is ApplicationUiReadyEnvelopeV2 => {
  if (!isApplicationIframeEnvelopeV2(value)) {
    return false
  }

  return (
    value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION_V2
    && value.eventName === APPLICATION_IFRAME_READY_EVENT
    && hasOnlyReadyPayloadKeys(value.payload)
  )
}

export const createApplicationUiReadyEnvelopeV2 = (
  payload: ApplicationUiReadyPayloadV2,
): ApplicationUiReadyEnvelopeV2 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V2,
  eventName: APPLICATION_IFRAME_READY_EVENT,
  payload,
})

export const createApplicationHostBootstrapEnvelopeV2 = (
  payload: ApplicationBootstrapPayloadV2,
): ApplicationHostBootstrapEnvelopeV2 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V2,
  eventName: APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  payload,
})

export type { EmptyObject }
