import {
  APPLICATION_IFRAME_QUERY_APPLICATION_ID,
  APPLICATION_IFRAME_QUERY_CONTRACT_VERSION,
  APPLICATION_IFRAME_QUERY_HOST_ORIGIN,
  APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID,
  type ApplicationIframeLaunchHints,
} from '@autobyteus/application-sdk-contracts'

const stripTrailingSlashes = (value: string): string => value.replace(/\/+$/, '')

const normalizeRestBaseUrl = (restBaseUrl: string): string => {
  const normalized = stripTrailingSlashes(restBaseUrl.trim())
  if (!normalized) {
    throw new Error('The bound REST base URL is unavailable for application asset resolution.')
  }

  return new URL(normalized).toString().replace(/\/$/, '')
}

const normalizeApplicationAssetPath = (assetPath: string): string => {
  const normalized = assetPath.trim()
  if (!normalized) {
    throw new Error('The application asset path is missing.')
  }
  if (/^https?:\/\//i.test(normalized)) {
    throw new Error('Application asset paths must stay transport-neutral and must not be absolute URLs.')
  }

  const withoutLeadingSlash = normalized.replace(/^\/+/, '')
  if (/^rest(?:\/|$)/i.test(withoutLeadingSlash)) {
    throw new Error('Application asset paths must be REST-base-relative and must not include a /rest prefix.')
  }

  return withoutLeadingSlash
}

export const resolveApplicationAssetUrl = (
  assetPath: string,
  restBaseUrl: string,
): string => {
  const normalizedRestBaseUrl = normalizeRestBaseUrl(restBaseUrl)
  const normalizedAssetPath = normalizeApplicationAssetPath(assetPath)
  return `${normalizedRestBaseUrl}/${normalizedAssetPath}`
}

export const resolveApplicationAssetOrigin = (absoluteAssetUrl: string): string =>
  new URL(absoluteAssetUrl).origin

export const appendApplicationIframeLaunchHints = (
  absoluteEntryHtmlUrl: string,
  hints: ApplicationIframeLaunchHints,
): string => {
  const url = new URL(absoluteEntryHtmlUrl)
  url.searchParams.set(
    APPLICATION_IFRAME_QUERY_CONTRACT_VERSION,
    hints.contractVersion,
  )
  url.searchParams.set(
    APPLICATION_IFRAME_QUERY_APPLICATION_ID,
    hints.applicationId,
  )
  url.searchParams.set(
    APPLICATION_IFRAME_QUERY_IFRAME_LAUNCH_ID,
    hints.iframeLaunchId,
  )
  url.searchParams.set(
    APPLICATION_IFRAME_QUERY_HOST_ORIGIN,
    hints.hostOrigin,
  )
  return url.toString()
}
