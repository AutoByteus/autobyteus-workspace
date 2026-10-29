import type { BrowserTabRecord } from './browser-tab-types'

/** Native event projection only; registry, popup policy and cleanup stay with the manager. */
export function attachBrowserTabObservers(
  session: BrowserTabRecord,
  notifyUpdated: () => void,
  notifyDestroyed: () => void,
): void {
  const contents = session.view.webContents
  contents.on('page-title-updated', (_event, title) => {
    if (session.customTitle) return
    session.title = title?.trim() || session.url
    notifyUpdated()
  })
  contents.on('did-navigate', (_event, url) => {
    session.url = url
    if (!session.customTitle) session.title = contents.getTitle()?.trim() || url
    notifyUpdated()
  })
  contents.on('did-navigate-in-page', (_event, url, isMainFrame) => {
    if (isMainFrame) session.url = url
    // Child-frame joint history and same-URL entries can change capabilities too.
    notifyUpdated()
  })
  contents.on('did-stop-loading', () => {
    session.url = contents.getURL() || session.url
    notifyUpdated()
  })
  contents.on('destroyed', notifyDestroyed)
}
