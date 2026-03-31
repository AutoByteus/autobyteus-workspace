import { BrowserWindow, type Event as ElectronEvent } from 'electron'
import { randomUUID } from 'crypto'
import { PreviewConsoleLogBuffer } from './preview-console-log-buffer'
import { PreviewScreenshotArtifactWriter } from './preview-screenshot-artifact-writer'
import { PreviewWindowFactory } from './preview-window-factory'

export type PreviewReadyState = 'domcontentloaded' | 'load'

export type OpenPreviewRequest = {
  url: string
  title?: string | null
  reuse_existing?: boolean
  wait_until?: PreviewReadyState
}

export type OpenPreviewResult = {
  preview_session_id: string
  status: 'opened' | 'reused'
  url: string
  title: string | null
}

export type NavigatePreviewRequest = {
  preview_session_id: string
  url: string
  wait_until?: PreviewReadyState
}

export type NavigatePreviewResult = {
  preview_session_id: string
  status: 'navigated'
  url: string
}

export type CapturePreviewScreenshotRequest = {
  preview_session_id: string
  full_page?: boolean
}

export type CapturePreviewScreenshotResult = {
  preview_session_id: string
  artifact_path: string
  mime_type: 'image/png'
}

export type GetPreviewConsoleLogsRequest = {
  preview_session_id: string
  since_sequence?: number | null
}

export type GetPreviewConsoleLogsResult = {
  preview_session_id: string
  entries: ReturnType<PreviewConsoleLogBuffer['list']>['entries']
  next_sequence: number
}

export type ClosePreviewRequest = {
  preview_session_id: string
}

export type ClosePreviewResult = {
  preview_session_id: string
  status: 'closed'
}

export type PreviewSessionErrorCode =
  | 'preview_session_closed'
  | 'preview_session_not_found'
  | 'preview_navigation_failed'

export class PreviewSessionError extends Error {
  readonly code: PreviewSessionErrorCode

  constructor(code: PreviewSessionErrorCode, message: string) {
    super(message)
    this.name = 'PreviewSessionError'
    this.code = code
  }
}

type PreviewSessionRecord = {
  id: string
  url: string
  title: string | null
  customTitle: string | null
  state: 'opening' | 'open'
  openPromise: Promise<void> | null
  window: BrowserWindow
  logBuffer: PreviewConsoleLogBuffer
}

type PreviewSessionManagerOptions = {
  windowFactory: PreviewWindowFactory
  screenshotWriter: PreviewScreenshotArtifactWriter
}

const MAX_FULL_PAGE_DIMENSION = 4000
const FULL_PAGE_CAPTURE_SETTLE_MS = 60
const MAX_CLOSED_SESSION_TOMBSTONES = 256
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'file:'])

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export class PreviewSessionManager {
  private readonly sessions = new Map<string, PreviewSessionRecord>()
  private readonly closedSessionIds = new Set<string>()

  constructor(private readonly options: PreviewSessionManagerOptions) {}

  async openSession(input: OpenPreviewRequest): Promise<OpenPreviewResult> {
    const normalizedUrl = this.normalizeUrl(input.url)

    if (input.reuse_existing) {
      const reusableSession = await this.findReusableSession(normalizedUrl)
      if (reusableSession) {
        this.updateSessionTitle(reusableSession, input.title ?? reusableSession.customTitle)
        this.focusWindow(reusableSession.window)
        return this.buildOpenPreviewResult(reusableSession, 'reused')
      }
    }

    const sessionId = randomUUID()
    const window = this.options.windowFactory.createPreviewWindow(input.title ?? null)
    const session: PreviewSessionRecord = {
      id: sessionId,
      url: normalizedUrl,
      title: input.title?.trim() || null,
      customTitle: input.title?.trim() || null,
      state: 'opening',
      openPromise: null,
      window,
      logBuffer: new PreviewConsoleLogBuffer(),
    }

    this.sessions.set(sessionId, session)
    this.attachSessionObservers(session)
    session.openPromise = this.loadUrl(session, normalizedUrl, input.wait_until ?? 'load').then(() => {
      session.state = 'open'
      this.updateSessionTitle(session, input.title ?? null)
    })

    try {
      await session.openPromise
      return this.buildOpenPreviewResult(session, 'opened')
    } catch (error) {
      this.sessions.delete(sessionId)
      if (!window.isDestroyed()) {
        window.destroy()
      }
      throw error
    }
  }

  async navigateSession(input: NavigatePreviewRequest): Promise<NavigatePreviewResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    const normalizedUrl = this.normalizeUrl(input.url)
    await this.loadUrl(session, normalizedUrl, input.wait_until ?? 'load')
    session.url = normalizedUrl
    this.updateSessionTitle(session, session.customTitle)

    return {
      preview_session_id: session.id,
      status: 'navigated',
      url: normalizedUrl,
    }
  }

  async captureScreenshot(
    input: CapturePreviewScreenshotRequest,
  ): Promise<CapturePreviewScreenshotResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    const image = await this.captureSessionPage(session, input.full_page ?? false)
    const artifactPath = await this.options.screenshotWriter.write(image.toPNG(), session.id)

    return {
      preview_session_id: session.id,
      artifact_path: artifactPath,
      mime_type: 'image/png',
    }
  }

  getConsoleLogs(input: GetPreviewConsoleLogsRequest): GetPreviewConsoleLogsResult {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    const result = session.logBuffer.list(input.since_sequence)

    return {
      preview_session_id: session.id,
      entries: result.entries,
      next_sequence: result.nextSequence,
    }
  }

  async closeSession(input: ClosePreviewRequest): Promise<ClosePreviewResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    await this.closeWindow(session.window)
    return {
      preview_session_id: session.id,
      status: 'closed',
    }
  }

  async closeAllSessions(): Promise<void> {
    const sessions = Array.from(this.sessions.values())
    await Promise.all(
      sessions.map(async (session) => {
        await this.closeWindow(session.window)
      }),
    )
  }

  private attachSessionObservers(session: PreviewSessionRecord): void {
    session.window.webContents.on('console-message', (_event, level, message) => {
      session.logBuffer.append(level, message)
    })

    session.window.on('page-title-updated', (_event, title) => {
      if (session.customTitle) {
        return
      }
      session.title = title?.trim() || session.url
    })

    session.window.on('closed', () => {
      this.handleWindowClosed(session.id)
    })
  }

  private handleWindowClosed(previewSessionId: string): void {
    const session = this.sessions.get(previewSessionId)
    if (!session) {
      return
    }

    this.sessions.delete(previewSessionId)
    this.rememberClosedSessionId(previewSessionId)
  }

  private getOpenSessionOrThrow(previewSessionId: string): PreviewSessionRecord {
    const normalizedId = typeof previewSessionId === 'string' ? previewSessionId.trim() : ''
    if (!normalizedId) {
      throw new PreviewSessionError(
        'preview_session_not_found',
        'preview_session_id is required.',
      )
    }

    const session = this.sessions.get(normalizedId)
    if (session) {
      return session
    }

    if (this.closedSessionIds.has(normalizedId)) {
      throw new PreviewSessionError(
        'preview_session_closed',
        `Preview session '${normalizedId}' has already been closed.`,
      )
    }

    throw new PreviewSessionError(
      'preview_session_not_found',
      `Preview session '${normalizedId}' was not found.`,
    )
  }

  private async findReusableSession(normalizedUrl: string): Promise<PreviewSessionRecord | null> {
    let openingSession: PreviewSessionRecord | null = null

    for (const session of this.sessions.values()) {
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
    const openedSession = this.sessions.get(openingSession.id)
    if (openedSession?.state === 'open') {
      return openedSession
    }

    return null
  }

  private rememberClosedSessionId(previewSessionId: string): void {
    this.closedSessionIds.add(previewSessionId)
    while (this.closedSessionIds.size > MAX_CLOSED_SESSION_TOMBSTONES) {
      const oldestClosedSessionId = this.closedSessionIds.values().next().value
      if (!oldestClosedSessionId) {
        return
      }
      this.closedSessionIds.delete(oldestClosedSessionId)
    }
  }

  private buildOpenPreviewResult(
    session: PreviewSessionRecord,
    status: OpenPreviewResult['status'],
  ): OpenPreviewResult {
    return {
      preview_session_id: session.id,
      status,
      url: session.url,
      title: session.title,
    }
  }

  private normalizeUrl(value: string): string {
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

  private async loadUrl(
    session: PreviewSessionRecord,
    url: string,
    waitUntil: PreviewReadyState,
  ): Promise<void> {
    const waitPromise = this.waitForRequestedReadyState(session.window, waitUntil)
    const loadPromise = session.window.loadURL(url)
    void loadPromise.catch(() => undefined)
    await waitPromise
    session.url = url
  }

  private waitForRequestedReadyState(
    window: BrowserWindow,
    waitUntil: PreviewReadyState,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const isDomReadyWait = waitUntil === 'domcontentloaded'

      const cleanup = () => {
        if (isDomReadyWait) {
          window.webContents.removeListener('dom-ready', handleReady)
        } else {
          window.webContents.removeListener('did-finish-load', handleReady)
        }
        window.webContents.removeListener('did-fail-load', handleFail)
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
        window.webContents.once('dom-ready', handleReady)
      } else {
        window.webContents.once('did-finish-load', handleReady)
      }
      window.webContents.on('did-fail-load', handleFail)
    })
  }

  private updateSessionTitle(session: PreviewSessionRecord, customTitle: string | null | undefined): void {
    session.customTitle = customTitle?.trim() || null
    session.title =
      session.customTitle ||
      session.window.webContents.getTitle()?.trim() ||
      session.url
    if (session.title) {
      session.window.setTitle(session.title)
    }
  }

  private focusWindow(window: BrowserWindow): void {
    if (window.isDestroyed()) {
      return
    }
    if (window.isMinimized()) {
      window.restore()
    }
    window.show()
    window.focus()
  }

  private async closeWindow(window: BrowserWindow): Promise<void> {
    if (window.isDestroyed()) {
      return
    }

    await new Promise<void>((resolve) => {
      window.once('closed', () => resolve())
      window.close()
    })
  }

  private async captureSessionPage(session: PreviewSessionRecord, fullPage: boolean) {
    if (!fullPage) {
      return session.window.webContents.capturePage()
    }

    const originalBounds = session.window.getContentBounds()
    const documentBounds = await session.window.webContents.executeJavaScript(
      `(() => ({
        width: Math.ceil(Math.max(
          document.documentElement.scrollWidth,
          document.body?.scrollWidth ?? 0,
          window.innerWidth
        )),
        height: Math.ceil(Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight ?? 0,
          window.innerHeight
        ))
      }))()`,
      true,
    ) as { width?: number; height?: number } | null

    const nextWidth = Math.max(
      originalBounds.width,
      Math.min(documentBounds?.width ?? originalBounds.width, MAX_FULL_PAGE_DIMENSION),
    )
    const nextHeight = Math.max(
      originalBounds.height,
      Math.min(documentBounds?.height ?? originalBounds.height, MAX_FULL_PAGE_DIMENSION),
    )

    if (nextWidth !== originalBounds.width || nextHeight !== originalBounds.height) {
      session.window.setContentSize(nextWidth, nextHeight)
      await sleep(FULL_PAGE_CAPTURE_SETTLE_MS)
    }

    try {
      return await session.window.webContents.capturePage()
    } finally {
      if (nextWidth !== originalBounds.width || nextHeight !== originalBounds.height) {
        session.window.setContentSize(originalBounds.width, originalBounds.height)
      }
    }
  }
}
