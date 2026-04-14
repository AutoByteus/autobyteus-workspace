import { pathToFileURL } from 'node:url'

const APPLICATION_IFRAME_QUERY_CONTRACT_VERSION = 'autobyteusContractVersion'
const APPLICATION_IFRAME_QUERY_APPLICATION_SESSION_ID = 'autobyteusApplicationSessionId'
const APPLICATION_IFRAME_QUERY_HOST_ORIGIN = 'autobyteusHostOrigin'
const APPLICATION_IFRAME_CONTRACT_VERSION_V1 = '1'

const stripTrailingSlashes = (value) => value.replace(/\/+$/, '')
const normalizeRestBaseUrl = (restBaseUrl) => {
  const normalized = stripTrailingSlashes(restBaseUrl.trim())
  if (!normalized) throw new Error('missing rest base url')
  return new URL(normalized).toString().replace(/\/$/, '')
}
const normalizeApplicationAssetPath = (assetPath) => {
  const normalized = assetPath.trim()
  if (!normalized) throw new Error('missing asset path')
  if (/^https?:\/\//i.test(normalized)) throw new Error('asset path must stay transport-neutral')
  const withoutLeadingSlash = normalized.replace(/^\/+/, '')
  if (/^rest(?:\/|$)/i.test(withoutLeadingSlash)) throw new Error('asset path must not include rest prefix')
  return withoutLeadingSlash
}
const resolveApplicationAssetUrl = (assetPath, restBaseUrl) => {
  return `${normalizeRestBaseUrl(restBaseUrl)}/${normalizeApplicationAssetPath(assetPath)}`
}
const resolveApplicationAssetOrigin = (absoluteAssetUrl) => new URL(absoluteAssetUrl).origin
const serializeApplicationHostOrigin = (origin) => {
  const normalized = (origin ?? '').trim()
  return !normalized || normalized === 'null' ? 'null' : normalized
}
const appendApplicationIframeLaunchHints = (absoluteEntryHtmlUrl, hints) => {
  const url = new URL(absoluteEntryHtmlUrl)
  url.searchParams.set(APPLICATION_IFRAME_QUERY_CONTRACT_VERSION, hints.contractVersion)
  url.searchParams.set(APPLICATION_IFRAME_QUERY_APPLICATION_SESSION_ID, hints.applicationSessionId)
  url.searchParams.set(APPLICATION_IFRAME_QUERY_HOST_ORIGIN, hints.hostOrigin)
  return url.toString()
}

const packagedHostUrl = pathToFileURL('/Applications/AutoByteus/renderer/index.html').toString()
const packagedHostOrigin = new URL(packagedHostUrl).origin
const entryHtmlAssetPath = '/application-bundles/built-in%3Aapplications%3Asocratic-math-teacher/assets/ui/index.html'
const restBaseUrl = 'http://127.0.0.1:29695/rest'
const absoluteEntryHtmlUrl = resolveApplicationAssetUrl(entryHtmlAssetPath, restBaseUrl)
const expectedIframeOrigin = resolveApplicationAssetOrigin(absoluteEntryHtmlUrl)
const hostOrigin = serializeApplicationHostOrigin(packagedHostOrigin)
const iframeSrc = appendApplicationIframeLaunchHints(absoluteEntryHtmlUrl, {
  contractVersion: APPLICATION_IFRAME_CONTRACT_VERSION_V1,
  applicationSessionId: 'app-session-123',
  hostOrigin,
})

const iframeUrl = new URL(iframeSrc)
const report = {
  packagedHostUrl,
  packagedHostOrigin,
  entryHtmlAssetPath,
  restBaseUrl,
  absoluteEntryHtmlUrl,
  expectedIframeOrigin,
  hostOrigin,
  iframeSrc,
  queryHints: {
    contractVersion: iframeUrl.searchParams.get(APPLICATION_IFRAME_QUERY_CONTRACT_VERSION),
    applicationSessionId: iframeUrl.searchParams.get(APPLICATION_IFRAME_QUERY_APPLICATION_SESSION_ID),
    hostOrigin: iframeUrl.searchParams.get(APPLICATION_IFRAME_QUERY_HOST_ORIGIN),
  },
  priorFailureResolved: absoluteEntryHtmlUrl.startsWith('http://127.0.0.1:29695/rest/application-bundles/')
    && expectedIframeOrigin === 'http://127.0.0.1:29695'
    && hostOrigin === 'null',
}

console.log(JSON.stringify(report, null, 2))

if (!report.priorFailureResolved) {
  process.exitCode = 1
}
