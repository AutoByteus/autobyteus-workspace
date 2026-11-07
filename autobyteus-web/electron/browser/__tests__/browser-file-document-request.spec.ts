import { describe, expect, it } from 'vitest'
import { isFileDocumentRequest, type BrowserRequestDetails } from '../browser-file-document-request'

// autobyteus-416 D6: the in-app browser's rule for "made by a file:// document", over the design's
// Entry-Form Table rows and the http-page control rows (details shaped as Electron 42 reported them in
// evidence/SR-003-d6-file-origin-forms.json and SR-003-d6-http-page-control.json).

const NODE = 'http://127.0.0.1:29695'
const FILE_FRAME = { origin: 'file://' }
const HTTP_FRAME = { origin: 'http://127.0.0.1:5173' }

const request = (overrides: Partial<BrowserRequestDetails>): BrowserRequestDetails => ({
  url: `${NODE}/graphql`,
  method: 'POST',
  resourceType: 'xhr',
  frame: FILE_FRAME,
  requestHeaders: {},
  ...overrides,
})

describe('isFileDocumentRequest', () => {
  it.each([
    ['top-level file page fetch POST (no Origin)', request({})],
    ['top-level file page XHR POST', request({ resourceType: 'xhr' })],
    ['top-level file page WebSocket (Origin: file://)', request({ url: 'ws://127.0.0.1:29695/ws/terminal/x', method: 'GET', resourceType: 'webSocket', requestHeaders: { Origin: 'file://' } })],
    ['about:blank iframe WebSocket (frame origin file://)', request({ url: 'ws://127.0.0.1:29695/ws/terminal/x', method: 'GET', resourceType: 'webSocket', requestHeaders: { Origin: 'file://' } })],
    ['srcdoc iframe POST without Origin', request({ frame: FILE_FRAME, requestHeaders: {} })],
    ['blob: iframe POST', request({ frame: FILE_FRAME })],
    ['about:blank popup POST', request({ frame: FILE_FRAME })],
    ['dedicated worker fetch POST', request({ resourceType: 'xhr', frame: FILE_FRAME })],
    ['GET subresource from a file document (R-7: also marked)', request({ method: 'GET', resourceType: 'image' })],
    ['form-POST navigation from a file page', request({ url: `${NODE}/rest/x`, resourceType: 'mainFrame', method: 'POST' })],
    ['sendBeacon on pagehide, frame gone', request({ resourceType: 'ping', frame: null })],
    ['keepalive fetch on pagehide, frame gone', request({ resourceType: 'xhr', frame: undefined })],
    ['Origin: file:// without a frame', request({ frame: null, method: 'GET', resourceType: 'webSocket', requestHeaders: { Origin: 'file://' } })],
  ])('marks %s', (_label, details) => {
    expect(isFileDocumentRequest(details)).toBe(true)
  })

  it.each([
    ['address-bar GET navigation from a file tab (AR-002)', request({ url: `${NODE}/rest/workspaces/w/content?path=a.pdf`, method: 'GET', resourceType: 'mainFrame' })],
    ['HEAD navigation from a file tab', request({ method: 'HEAD', resourceType: 'mainFrame' })],
    ['iframe src GET navigation from a file page', request({ method: 'GET', resourceType: 'subFrame' })],
    ['a request for a file: URL', request({ url: 'file:///tmp/page.html', method: 'GET', resourceType: 'mainFrame' })],
    // Control rows: an http page in the same session keeps its own Origin.
    ['http page fetch POST', request({ frame: HTTP_FRAME, requestHeaders: { Origin: HTTP_FRAME.origin } })],
    ['http page cross-origin POST', request({ url: 'http://localhost:29695/graphql', frame: HTTP_FRAME, requestHeaders: { Origin: HTTP_FRAME.origin } })],
    ['http page WebSocket', request({ url: 'ws://127.0.0.1:29695/ws/x', method: 'GET', resourceType: 'webSocket', frame: HTTP_FRAME, requestHeaders: { Origin: HTTP_FRAME.origin } })],
    ['http page form-POST navigation', request({ resourceType: 'mainFrame', frame: HTTP_FRAME, requestHeaders: { Origin: HTTP_FRAME.origin } })],
    ['http page sendBeacon', request({ resourceType: 'ping', frame: HTTP_FRAME, requestHeaders: { Origin: HTTP_FRAME.origin } })],
    ['http page same-origin GET (no Origin)', request({ method: 'GET', resourceType: 'xhr', frame: HTTP_FRAME })],
    ['http page beacon after its frame is gone (keeps its Origin)', request({ resourceType: 'ping', frame: null, requestHeaders: { Origin: HTTP_FRAME.origin } })],
  ])('leaves %s unchanged', (_label, details) => {
    expect(isFileDocumentRequest(details)).toBe(false)
  })

  it('treats a disposed frame (Electron throws on access) as no frame', () => {
    const disposed = Object.defineProperty({}, 'origin', { get: () => { throw new Error('Render frame was disposed') } })
    expect(isFileDocumentRequest(request({ frame: disposed as { origin: string } }))).toBe(true)
    expect(isFileDocumentRequest(request({ frame: disposed as { origin: string }, requestHeaders: { Origin: HTTP_FRAME.origin } }))).toBe(false)
  })
})
