import { type Event as ElectronEvent, type WebContentsView } from 'electron'
import {
  type PreviewReadyState,
  type PreviewSessionRecord,
  PreviewSessionError,
} from './preview-session-types'

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'file:'])

export class PreviewSessionNavigation {
  normalizeUrl(value: string): string {
    const normalizedValue = typeof value === 'string' ? value.trim() : ''
    if (!normalizedValue) {
      throw new PreviewSessionError(
        'preview_navigation_failed',
        'Preview URL is required.',
      )
    }

    let parsed: URL
    try {
      parsed = new URL(normalizedValue)
    } catch {
      throw new PreviewSessionError(
        'preview_navigation_failed',
        `Invalid preview URL '${normalizedValue}'.`,
      )
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      throw new PreviewSessionError(
        'preview_navigation_failed',
        `Unsupported preview URL protocol '${parsed.protocol}'.`,
      )
    }

    return parsed.toString()
  }

  async findReusableSession(
    sessions: Map<string, PreviewSessionRecord>,
    normalizedUrl: string,
  ): Promise<PreviewSessionRecord | null> {
    let openingSession: PreviewSessionRecord | null = null

    for (const session of sessions.values()) {
      if (session.url !== normalizedUrl) {
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
    session: PreviewSessionRecord,
    url: string,
    waitUntil: PreviewReadyState,
  ): Promise<void> {
    const waitPromise = this.waitForRequestedReadyState(session.view, waitUntil)
    const loadPromise = session.view.webContents.loadURL(url)
    void loadPromise.catch(() => undefined)
    await waitPromise
    session.url = url
  }

  private waitForRequestedReadyState(
    view: WebContentsView,
    waitUntil: PreviewReadyState,
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
          new PreviewSessionError(
            'preview_navigation_failed',
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
