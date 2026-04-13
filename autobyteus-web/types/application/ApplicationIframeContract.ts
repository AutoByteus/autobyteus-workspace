import type {
  ApplicationRuntimeTargetKind,
  ApplicationSessionTransport,
} from '~/types/application/ApplicationSession'

export const APPLICATION_IFRAME_CHANNEL = 'autobyteus.application.host' as const
export const APPLICATION_IFRAME_CONTRACT_VERSION_V1 = '1' as const
export const APPLICATION_IFRAME_READY_EVENT = 'autobyteus.application.ui.ready' as const
export const APPLICATION_IFRAME_BOOTSTRAP_EVENT = 'autobyteus.application.host.bootstrap' as const
export const APPLICATION_IFRAME_QUERY_CONTRACT_VERSION = 'autobyteusContractVersion' as const
export const APPLICATION_IFRAME_QUERY_APPLICATION_SESSION_ID = 'autobyteusApplicationSessionId' as const
export const APPLICATION_IFRAME_QUERY_HOST_ORIGIN = 'autobyteusHostOrigin' as const
export const APPLICATION_IFRAME_READY_TIMEOUT_MS = 10_000

type EmptyObject = Record<string, never>

export type ApplicationIframeLaunchHints = {
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V1
  applicationSessionId: string
  hostOrigin: string
}

export type ApplicationIframeEnvelopeV1<
  TPayload extends Record<string, unknown> = Record<string, unknown>,
> = {
  channel: typeof APPLICATION_IFRAME_CHANNEL
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V1
  eventName: string
  payload: TPayload
}

export type ApplicationUiReadyPayloadV1 = {
  applicationSessionId: string
}

export type ApplicationUiReadyEnvelopeV1 = ApplicationIframeEnvelopeV1<ApplicationUiReadyPayloadV1> & {
  eventName: typeof APPLICATION_IFRAME_READY_EVENT
}

export type ApplicationBootstrapPayloadV1 = {
  host: {
    origin: string
  }
  application: {
    applicationId: string
    localApplicationId: string
    packageId: string
    name: string
  }
  session: {
    applicationSessionId: string
  }
  runtime: {
    kind: ApplicationRuntimeTargetKind
    runId: string
    definitionId: string
  }
  transport: ApplicationSessionTransport
}

export type ApplicationHostBootstrapEnvelopeV1 = ApplicationIframeEnvelopeV1<ApplicationBootstrapPayloadV1> & {
  eventName: typeof APPLICATION_IFRAME_BOOTSTRAP_EVENT
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
)

export const serializeApplicationHostOrigin = (origin: string | null | undefined): string => {
  const normalized = (origin ?? '').trim()
  if (!normalized || normalized === 'null') {
    return 'null'
  }

  return normalized
}

export const isApplicationIframeEnvelopeV1 = (
  value: unknown,
): value is ApplicationIframeEnvelopeV1<Record<string, unknown>> => {
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

const hasOnlyReadyPayloadKeys = (payload: Record<string, unknown>): payload is ApplicationUiReadyPayloadV1 => {
  const keys = Object.keys(payload)
  return (
    keys.length === 1
    && keys[0] === 'applicationSessionId'
    && typeof payload.applicationSessionId === 'string'
    && payload.applicationSessionId.trim().length > 0
  )
}

export const isApplicationUiReadyEnvelopeV1 = (
  value: unknown,
): value is ApplicationUiReadyEnvelopeV1 => {
  if (!isApplicationIframeEnvelopeV1(value)) {
    return false
  }

  return (
    value.contractVersion === APPLICATION_IFRAME_CONTRACT_VERSION_V1
    && value.eventName === APPLICATION_IFRAME_READY_EVENT
    && hasOnlyReadyPayloadKeys(value.payload)
  )
}

export const createApplicationUiReadyEnvelopeV1 = (
  payload: ApplicationUiReadyPayloadV1,
): ApplicationUiReadyEnvelopeV1 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V1,
  eventName: APPLICATION_IFRAME_READY_EVENT,
  payload,
})

export const createApplicationHostBootstrapEnvelopeV1 = (
  payload: ApplicationBootstrapPayloadV1,
): ApplicationHostBootstrapEnvelopeV1 => ({
  channel: APPLICATION_IFRAME_CHANNEL,
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V1,
  eventName: APPLICATION_IFRAME_BOOTSTRAP_EVENT,
  payload,
})

export type { EmptyObject }
