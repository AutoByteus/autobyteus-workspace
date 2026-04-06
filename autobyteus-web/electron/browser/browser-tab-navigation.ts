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
    await this.waitForRequestedReadyState(session.view, waitUntil, {
      targetUrl: url,
      allowInPageNavigation: true,
      startNavigation: () => session.view.webContents.loadURL(url),
    })
    session.url = url
  }

  async reload(
    session: BrowserTabRecord,
    waitUntil: BrowserReadyState,
  ): Promise<void> {
    await this.waitForRequestedReadyState(session.view, waitUntil, {
      targetUrl: null,
      allowInPageNavigation: false,
      startNavigation: () => {
        session.view.webContents.reload()
      },
    })
    session.url = session.view.webContents.getURL() || session.url
  }

  private async waitForRequestedReadyState(
    view: WebContentsView,
    waitUntil: BrowserReadyState,
    input: {
      targetUrl: string | null
      allowInPageNavigation: boolean
      startNavigation: () => Promise<void> | void
    },
  ): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const isDomReadyWait = waitUntil === 'domcontentloaded'
      let settled = false

      const settle = (callback: () => void) => {
        if (settled) {
          return
        }

        settled = true
        cleanup()
        callback()
      }

      const cleanup = () => {
        if (isDomReadyWait) {
          view.webContents.removeListener('dom-ready', handleReady)
        } else {
          view.webContents.removeListener('did-finish-load', handleReady)
        }
        view.webContents.removeListener('did-fail-load', handleFail)
        view.webContents.removeListener('did-fail-provisional-load', handleFail)
        view.webContents.removeListener('did-navigate-in-page', handleInPageNavigate)
      }

      const handleReady = () => {
        settle(resolve)
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

        settle(() =>
          reject(
            new BrowserTabError(
              'browser_navigation_failed',
              `Failed to load '${validatedURL}' (${errorCode}): ${errorDescription}`,
            ),
          ),
        )
      }

      const handleInPageNavigate = (
        _event: ElectronEvent,
        url: string,
        isMainFrame?: boolean,
      ) => {
        if (!input.allowInPageNavigation) {
          return
        }

        if (isMainFrame === false) {
          return
        }

        if (input.targetUrl && !this.urlsMatch(input.targetUrl, url)) {
          return
        }

        settle(resolve)
      }

      const rejectFromNavigationStart = (error: unknown) => {
        const targetUrl = input.targetUrl ?? view.webContents.getURL() ?? 'unknown URL'
        const errorMessage =
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : String(error)
        settle(() =>
          reject(
            new BrowserTabError(
              'browser_navigation_failed',
              `Failed to load '${targetUrl}': ${errorMessage}`,
            ),
          ),
        )
      }

      if (isDomReadyWait) {
        view.webContents.once('dom-ready', handleReady)
      } else {
        view.webContents.once('did-finish-load', handleReady)
      }
      view.webContents.on('did-fail-load', handleFail)
      view.webContents.on('did-fail-provisional-load', handleFail)
      view.webContents.on('did-navigate-in-page', handleInPageNavigate)

      try {
        const navigationPromise = input.startNavigation()
        if (typeof navigationPromise?.then === 'function') {
          navigationPromise.then(
            () => {
              if (!isDomReadyWait) {
                settle(resolve)
              }
            },
            (error: unknown) => {
              rejectFromNavigationStart(error)
            },
          )
        }
      } catch (error) {
        rejectFromNavigationStart(error)
      }
    })
  }

  private urlsMatch(left: string, right: string): boolean {
    try {
      return new URL(left).toString() === new URL(right).toString()
    } catch {
      return left === right
    }
  }
}
