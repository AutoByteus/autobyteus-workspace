import {
  APPLICATION_IFRAME_CONTRACT_VERSION_V1,
  type ApplicationIframeLaunchHints,
} from '~/types/application/ApplicationIframeContract'
import {
  appendApplicationIframeLaunchHints,
  resolveApplicationAssetOrigin,
  resolveApplicationAssetUrl,
} from '~/utils/application/applicationAssetUrl'

export type ApplicationIframeLaunchDescriptor = {
  applicationSessionId: string
  entryHtmlUrl: string
  expectedIframeOrigin: string
  normalizedHostOrigin: string
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V1
  launchInstanceId: string
}

export type ApplicationIframeLaunchDescriptorInputs = {
  applicationSessionId: string
  entryHtmlAssetPath: string
  restBaseUrl: string
  normalizedHostOrigin: string
  contractVersion?: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V1
}

const PACKAGED_HOST_ORIGIN = 'file://'

export const normalizeApplicationHostOrigin = (
  origin: string | null | undefined,
  protocol?: string | null,
): string => {
  const normalizedOrigin = (origin ?? '').trim()
  const normalizedProtocol = (protocol ?? '').trim().toLowerCase()

  if (
    normalizedProtocol === 'file:'
    || normalizedOrigin === PACKAGED_HOST_ORIGIN
    || normalizedOrigin.startsWith('file://')
  ) {
    return PACKAGED_HOST_ORIGIN
  }

  if (!normalizedOrigin || normalizedOrigin === 'null') {
    return 'null'
  }

  return normalizedOrigin
}

export const doesApplicationHostOriginMatch = (
  expectedNormalizedHostOrigin: string,
  actualOrigin: string | null | undefined,
): boolean => {
  const normalizedActualOrigin = (actualOrigin ?? '').trim()
  if (expectedNormalizedHostOrigin === PACKAGED_HOST_ORIGIN) {
    return normalizedActualOrigin === PACKAGED_HOST_ORIGIN || normalizedActualOrigin === 'null'
  }

  return normalizedActualOrigin === expectedNormalizedHostOrigin
}

export const areApplicationIframeDescriptorInputsEqual = (
  left: ApplicationIframeLaunchDescriptorInputs | null,
  right: ApplicationIframeLaunchDescriptorInputs | null,
): boolean => (
  left?.applicationSessionId === right?.applicationSessionId
  && left?.entryHtmlAssetPath === right?.entryHtmlAssetPath
  && left?.restBaseUrl === right?.restBaseUrl
  && left?.normalizedHostOrigin === right?.normalizedHostOrigin
  && (left?.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V1)
    === (right?.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V1)
)

export const createApplicationLaunchInstanceId = (
  applicationSessionId: string,
  generation: number,
): string => `${applicationSessionId}::launch-${generation}`

export const buildApplicationIframeLaunchDescriptor = (
  inputs: ApplicationIframeLaunchDescriptorInputs,
  launchInstanceId: string,
): ApplicationIframeLaunchDescriptor => {
  const entryHtmlUrl = resolveApplicationAssetUrl(
    inputs.entryHtmlAssetPath,
    inputs.restBaseUrl,
  )

  return {
    applicationSessionId: inputs.applicationSessionId,
    entryHtmlUrl,
    expectedIframeOrigin: resolveApplicationAssetOrigin(entryHtmlUrl),
    normalizedHostOrigin: inputs.normalizedHostOrigin,
    contractVersion: inputs.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V1,
    launchInstanceId,
  }
}

export const buildApplicationIframeLaunchHints = (
  descriptor: ApplicationIframeLaunchDescriptor,
): ApplicationIframeLaunchHints => ({
  contractVersion: descriptor.contractVersion,
  applicationSessionId: descriptor.applicationSessionId,
  launchInstanceId: descriptor.launchInstanceId,
  hostOrigin: descriptor.normalizedHostOrigin,
})

export const buildApplicationIframeSrc = (
  descriptor: ApplicationIframeLaunchDescriptor,
): string => appendApplicationIframeLaunchHints(
  descriptor.entryHtmlUrl,
  buildApplicationIframeLaunchHints(descriptor),
)
