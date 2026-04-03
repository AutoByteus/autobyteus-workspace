import { type Event as ElectronEvent, type WebContentsView } from 'electron'
import {
  type BrowserReadyState,
  type BrowserTabRecord,
  BrowserTabError,
} from './browser-tab-types'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'file:'])
const POPUP_ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'file:', 'about:'])

export class BrowserTabNavigation {
  normalizeUrl(value: string): string {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''
    if (!normalizedValue) {
      throw new BrowserTabError(
        'browser_navigation_failed',
        'Browser URL is required.',
      )
    }

    let parsed: URL
    try {
      parsed = new URL(normalizedValue)
    } catch {
      throw new BrowserTabError(
        'browser_navigation_failed',
        `Invalid browser URL '${normalizedValue}'.`,
      )
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      throw new BrowserTabError(
        'browser_navigation_failed',
        `Unsupported browser URL protocol '${parsed.protocol}'.`,
      )
    }

    return parsed.toString()
  }

  normalizePopupUrl(value: string): string {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''
    if (!normalizedValue) {
      return 'about:blank'
    }

    let parsed: URL
    try {
      parsed = new URL(normalizedValue)
    } catch {
      throw new BrowserTabError(
        'browser_navigation_failed',
        `Invalid browser popup URL '${normalizedValue}'.`,
      )
    }

    if (!POPUP_ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      throw new BrowserTabError(
        'browser_navigation_failed',
        `Unsupported browser popup URL protocol '${parsed.protocol}'.`,
      )
    }

    if (parsed.protocol === 'about:' && parsed.toString() !== 'about:blank') {
      throw new BrowserTabError(
        'browser_navigation_failed',
        `Unsupported browser popup URL '${parsed.toString()}'.`,
      )
    }

    return parsed.toString()
  }

  async findReusableSession(
    sessions: Map<string, BrowserTabRecord>,
    normalizedUrl: string,
    canReuse: (session: BrowserTabRecord) => boolean = () => true,
  ): Promise<BrowserTabRecord | null> {
    let openingSession: BrowserTabRecord | null = null

    for (const session of sessions.values()) {
      if (session.url !== normalizedUrl || !canReuse(session)) {
        continue
      }

      if (session.state === 'open') {
        return session
      }

      if (!openingSession) {
        openingSession = session
      }
    }

    if (!openingSession?.openPromise) {
      return null
    }

    await openingSession.openPromise
    const openedSession = sessions.get(openingSession.id)
    if (openedSession?.state === 'open') {
      return openedSession
    }

    return null
  }

  async loadUrl(
    session: BrowserTabRecord,
    url: string,
    waitUntil: BrowserReadyState,
  ): Promise<void> {
    const waitPromise = this.waitForRequestedReadyState(session.view, waitUntil)
    const loadPromise = session.view.webContents.loadURL(url)
    void loadPromise.catch(() => undefined)
    await waitPromise
    session.url = url
  }

  async reload(
    session: BrowserTabRecord,
    waitUntil: BrowserReadyState,
  ): Promise<void> {
    const waitPromise = this.waitForRequestedReadyState(session.view, waitUntil)
    session.view.webContents.reload()
    await waitPromise
    session.url = session.view.webContents.getURL() || session.url
  }

  private waitForRequestedReadyState(
    view: WebContentsView,
    waitUntil: BrowserReadyState,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const isDomReadyWait = waitUntil === 'domcontentloaded'

      const cleanup = () => {
        if (isDomReadyWait) {
          view.webContents.removeListener('dom-ready', handleReady)
        } else {
          view.webContents.removeListener('did-finish-load', handleReady)
        }
        view.webContents.removeListener('did-fail-load', handleFail)
      }

      const handleReady = () => {
        cleanup()
        resolve()
      }

      const handleFail = (
        _event: ElectronEvent,
        errorCode: number,
        errorDescription: string,
        validatedURL: string,
        isMainFrame: boolean,
        _frameProcessId: number,
        _frameRoutingId: number,
      ) => {
        if (!isMainFrame) {
          return
        }

        cleanup()
        reject(
          new BrowserTabError(
            'browser_navigation_failed',
            `Failed to load '${validatedURL}' (${errorCode}): ${errorDescription}`,
          ),
        )
      }

      if (isDomReadyWait) {
        view.webContents.once('dom-ready', handleReady)
      } else {
        view.webContents.once('did-finish-load', handleReady)
      }
      view.webContents.on('did-fail-load', handleFail)
    })
  }
}
