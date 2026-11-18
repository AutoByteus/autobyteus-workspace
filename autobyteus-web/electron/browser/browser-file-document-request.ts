/**
 * The origin of a document loaded from a `file:` URL. Every document it creates (`about:blank`, `srcdoc` and
 * `blob:` frames, `about:blank` popups, workers) inherits it; their URLs differ, their origin does not.
 */
const FILE_DOCUMENT_ORIGIN = 'file://'

/** The fields of Electron's `OnBeforeSendHeadersListenerDetails` the rule reads. */
export type BrowserRequestDetails = Readonly<{
  url: string
  method: string
  resourceType: string
  frame?: Readonly<{ origin: string }> | null
  requestHeaders: Readonly<Record<string, string>>
}>

const isGetOrHead = (method: string): boolean => method === 'GET' || method === 'HEAD'

/**
 * A frame's origin, or `null` when the request has no frame or its frame is gone: Electron throws when a
 * disposed frame's properties are read, and the listener must always answer.
 */
const readFrameOrigin = (frame: BrowserRequestDetails['frame']): string | null => {
  try {
    return frame?.origin ?? null
  } catch {
    return null
  }
}

/**
 * Whether a request in the in-app browser was made by a `file://` document, which a node must treat as a
 * foreign page (autobyteus-416 D6). GET/HEAD navigations are never such requests: the new document takes the
 * target's origin, so a node URL opened from a tab showing a local file displays. Otherwise the request is
 * from a `file://` document when its frame's origin or its own `Origin` is `file://`, or when it is a
 * non-GET/HEAD request without `Origin`: Chromium adds `Origin` to every such request from a web page, and
 * only a `file://` document omits it (this covers `sendBeacon` and `keepalive` requests whose frame is gone).
 */
export const isFileDocumentRequest = (details: BrowserRequestDetails): boolean => {
  if (details.url.startsWith('file:')) return false
  const isNavigation = details.resourceType === 'mainFrame' || details.resourceType === 'subFrame'
  if (isNavigation && isGetOrHead(details.method)) return false
  const origin = details.requestHeaders.Origin
  if (readFrameOrigin(details.frame) === FILE_DOCUMENT_ORIGIN || origin === FILE_DOCUMENT_ORIGIN) return true
  return origin === undefined && !isGetOrHead(details.method)
}
