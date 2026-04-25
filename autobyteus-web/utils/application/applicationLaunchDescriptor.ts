import {
  APPLICATION_IFRAME_CONTRACT_VERSION_V3,
  type ApplicationIframeLaunchHints,
} from '@autobyteus/application-sdk-contracts'
import {
  appendApplicationIframeLaunchHints,
  resolveApplicationAssetOrigin,
  resolveApplicationAssetUrl,
} from '~/utils/application/applicationAssetUrl'

export {
  doesApplicationHostOriginMatch,
  normalizeApplicationHostOrigin,
} from '@autobyteus/application-sdk-contracts'

export type ApplicationIframeLaunchDescriptor = {
  applicationId: string
  entryHtmlUrl: string
  expectedIframeOrigin: string
  normalizedHostOrigin: string
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V3
  iframeLaunchId: string
}

export type ApplicationIframeLaunchDescriptorInputs = {
  applicationId: string
  entryHtmlAssetPath: string
  restBaseUrl: string
  normalizedHostOrigin: string
  contractVersion?: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V3
}

export const areApplicationIframeDescriptorInputsEqual = (
  left: ApplicationIframeLaunchDescriptorInputs | null,
  right: ApplicationIframeLaunchDescriptorInputs | null,
): boolean => (
  left?.applicationId === right?.applicationId
  && left?.entryHtmlAssetPath === right?.entryHtmlAssetPath
  && left?.restBaseUrl === right?.restBaseUrl
  && left?.normalizedHostOrigin === right?.normalizedHostOrigin
  && (left?.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V3)
    === (right?.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V3)
)

export const createApplicationIframeLaunchId = (
  applicationId: string,
  generation: number,
): string => `${applicationId}::iframe-launch-${generation}`

export const buildApplicationIframeLaunchDescriptor = (
  inputs: ApplicationIframeLaunchDescriptorInputs,
  iframeLaunchId: string,
): ApplicationIframeLaunchDescriptor => {
  const entryHtmlUrl = resolveApplicationAssetUrl(
    inputs.entryHtmlAssetPath,
    inputs.restBaseUrl,
  )

  return {
    applicationId: inputs.applicationId,
    entryHtmlUrl,
    expectedIframeOrigin: resolveApplicationAssetOrigin(entryHtmlUrl),
    normalizedHostOrigin: inputs.normalizedHostOrigin,
    contractVersion: inputs.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V3,
    iframeLaunchId,
  }
}

export const buildApplicationIframeLaunchHints = (
  descriptor: ApplicationIframeLaunchDescriptor,
): ApplicationIframeLaunchHints => ({
  contractVersion: descriptor.contractVersion,
  applicationId: descriptor.applicationId,
  iframeLaunchId: descriptor.iframeLaunchId,
  hostOrigin: descriptor.normalizedHostOrigin,
})

export const buildApplicationIframeSrc = (
  descriptor: ApplicationIframeLaunchDescriptor,
): string => appendApplicationIframeLaunchHints(
  descriptor.entryHtmlUrl,
  buildApplicationIframeLaunchHints(descriptor),
)
