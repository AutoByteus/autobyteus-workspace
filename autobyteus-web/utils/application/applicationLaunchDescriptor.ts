import {
  APPLICATION_IFRAME_CONTRACT_VERSION_V2,
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
  contractVersion: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V2
  launchInstanceId: string
}

export type ApplicationIframeLaunchDescriptorInputs = {
  applicationId: string
  entryHtmlAssetPath: string
  restBaseUrl: string
  normalizedHostOrigin: string
  contractVersion?: typeof APPLICATION_IFRAME_CONTRACT_VERSION_V2
}

export const areApplicationIframeDescriptorInputsEqual = (
  left: ApplicationIframeLaunchDescriptorInputs | null,
  right: ApplicationIframeLaunchDescriptorInputs | null,
): boolean => (
  left?.applicationId === right?.applicationId
  && left?.entryHtmlAssetPath === right?.entryHtmlAssetPath
  && left?.restBaseUrl === right?.restBaseUrl
  && left?.normalizedHostOrigin === right?.normalizedHostOrigin
  && (left?.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V2)
    === (right?.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V2)
)

export const createApplicationLaunchInstanceId = (
  applicationId: string,
  generation: number,
): string => `${applicationId}::launch-${generation}`

export const buildApplicationIframeLaunchDescriptor = (
  inputs: ApplicationIframeLaunchDescriptorInputs,
  launchInstanceId: string,
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
    contractVersion: inputs.contractVersion ?? APPLICATION_IFRAME_CONTRACT_VERSION_V2,
    launchInstanceId,
  }
}

export const buildApplicationIframeLaunchHints = (
  descriptor: ApplicationIframeLaunchDescriptor,
): ApplicationIframeLaunchHints => ({
  contractVersion: descriptor.contractVersion,
  applicationId: descriptor.applicationId,
  launchInstanceId: descriptor.launchInstanceId,
  hostOrigin: descriptor.normalizedHostOrigin,
})

export const buildApplicationIframeSrc = (
  descriptor: ApplicationIframeLaunchDescriptor,
): string => appendApplicationIframeLaunchHints(
  descriptor.entryHtmlUrl,
  buildApplicationIframeLaunchHints(descriptor),
)
