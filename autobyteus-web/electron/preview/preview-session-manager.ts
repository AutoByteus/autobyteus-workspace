import { EventEmitter } from 'events'
import { WebContentsView, type Event as ElectronEvent, type Rectangle } from 'electron'
import { randomUUID } from 'crypto'
import { PreviewConsoleLogBuffer } from './preview-console-log-buffer'
import { PreviewScreenshotArtifactWriter } from './preview-screenshot-artifact-writer'
import { DEFAULT_PREVIEW_VIEW_BOUNDS, PreviewViewFactory } from './preview-view-factory'

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

export type ExecutePreviewJavascriptRequest = {
  preview_session_id: string
  javascript: string
}

export type ExecutePreviewJavascriptResult = {
  preview_session_id: string
  result_json: string
}

export type OpenPreviewDevToolsRequest = {
  preview_session_id: string
  mode?: 'detach'
}

export type OpenPreviewDevToolsResult = {
  preview_session_id: string
  status: 'opened'
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
  | 'preview_javascript_execution_failed'

export class PreviewSessionError extends Error {
  readonly code: PreviewSessionErrorCode

  constructor(code: PreviewSessionErrorCode, message: string) {
    super(message)
    this.name = 'PreviewSessionError'
    this.code = code
  }
}

export type PreviewSessionSummary = {
  preview_session_id: string
  title: string | null
  url: string
}

type PreviewSessionRecord = {
  id: string
  url: string
  title: string | null
  customTitle: string | null
  state: 'opening' | 'open'
  openPromise: Promise<void> | null
  view: WebContentsView
  logBuffer: PreviewConsoleLogBuffer
  viewportBounds: Rectangle
}

type PreviewSessionManagerOptions = {
  viewFactory: PreviewViewFactory
  screenshotWriter: PreviewScreenshotArtifactWriter
}

const MAX_FULL_PAGE_DIMENSION = 4000
const FULL_PAGE_CAPTURE_SETTLE_MS = 60
const MAX_CLOSED_SESSION_TOMBSTONES = 256
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'file:'])

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export class PreviewSessionManager extends EventEmitter {
  private readonly sessions = new Map<string, PreviewSessionRecord>()
  private readonly closedSessionIds = new Set<string>()

  constructor(private readonly options: PreviewSessionManagerOptions) {
    super()
  }

  async openSession(input: OpenPreviewRequest): Promise<OpenPreviewResult> {
    const normalizedUrl = this.normalizeUrl(input.url)

    if (input.reuse_existing) {
      const reusableSession = await this.findReusableSession(normalizedUrl)
      if (reusableSession) {
        this.updateSessionTitle(reusableSession, input.title ?? reusableSession.customTitle)
        this.emitSessionUpserted(reusableSession)
        return this.buildOpenPreviewResult(reusableSession, 'reused')
      }
    }

    const sessionId = randomUUID()
    const view = this.options.viewFactory.createPreviewView()
    const session: PreviewSessionRecord = {
      id: sessionId,
      url: normalizedUrl,
      title: input.title?.trim() || null,
      customTitle: input.title?.trim() || null,
      state: 'opening',
      openPromise: null,
      view,
      logBuffer: new PreviewConsoleLogBuffer(),
      viewportBounds: { ...DEFAULT_PREVIEW_VIEW_BOUNDS },
    }

    this.sessions.set(sessionId, session)
    this.attachSessionObservers(session)
    session.view.setBounds(session.viewportBounds)
    session.openPromise = this.loadUrl(session, normalizedUrl, input.wait_until ?? 'load').then(() => {
      session.state = 'open'
      this.updateSessionTitle(session, input.title ?? null)
      this.emitSessionUpserted(session)
    })

    try {
      await session.openPromise
      return this.buildOpenPreviewResult(session, 'opened')
    } catch (error) {
      this.sessions.delete(sessionId)
      this.destroySessionView(session.view)
      throw error
    }
  }

  async navigateSession(input: NavigatePreviewRequest): Promise<NavigatePreviewResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    const normalizedUrl = this.normalizeUrl(input.url)
    await this.loadUrl(session, normalizedUrl, input.wait_until ?? 'load')
    session.url = normalizedUrl
    this.updateSessionTitle(session, session.customTitle)
    this.emitSessionUpserted(session)

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

  async executeJavascript(
    input: ExecutePreviewJavascriptRequest,
  ): Promise<ExecutePreviewJavascriptResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    const javascript = typeof input.javascript === 'string' ? input.javascript.trim() : ''
    if (!javascript) {
      throw new PreviewSessionError(
        'preview_javascript_execution_failed',
        'javascript is required.',
      )
    }

    try {
      const result = await session.view.webContents.executeJavaScript(javascript, true)
      return {
        preview_session_id: session.id,
        result_json: JSON.stringify(result ?? null),
      }
    } catch (error) {
      throw new PreviewSessionError(
        'preview_javascript_execution_failed',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  openDevTools(input: OpenPreviewDevToolsRequest): OpenPreviewDevToolsResult {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    session.view.webContents.openDevTools({
      mode: input.mode ?? 'detach',
    })
    return {
      preview_session_id: session.id,
      status: 'opened',
    }
  }

  async closeSession(input: ClosePreviewRequest): Promise<ClosePreviewResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    this.destroySession(session)
    return {
      preview_session_id: session.id,
      status: 'closed',
    }
  }

  async closeAllSessions(): Promise<void> {
    const sessions = Array.from(this.sessions.values())
    for (const session of sessions) {
      this.destroySession(session)
    }
  }

  private attachSessionObservers(session: PreviewSessionRecord): void {
    session.view.webContents.on('console-message', (_event, level, message) => {
      session.logBuffer.append(level, message)
    })

    session.view.webContents.on('page-title-updated', (_event, title) => {
      if (session.customTitle) {
        return
      }
      session.title = title?.trim() || session.url
      this.emitSessionUpserted(session)
    })

    session.view.webContents.on('destroyed', () => {
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
    this.emit('session-closed', previewSessionId)
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

  private updateSessionTitle(session: PreviewSessionRecord, customTitle: string | null | undefined): void {
    session.customTitle = customTitle?.trim() || null
    session.title =
      session.customTitle ||
      session.view.webContents.getTitle()?.trim() ||
      session.url
  }

  private async captureSessionPage(session: PreviewSessionRecord, fullPage: boolean) {
    if (!fullPage) {
      return session.view.webContents.capturePage()
    }

    const originalBounds = { ...session.viewportBounds }
    const documentBounds = await session.view.webContents.executeJavaScript(
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
      session.viewportBounds = {
        ...originalBounds,
        width: nextWidth,
        height: nextHeight,
      }
      session.view.setBounds(session.viewportBounds)
      await sleep(FULL_PAGE_CAPTURE_SETTLE_MS)
    }

    try {
      return await session.view.webContents.capturePage()
    } finally {
      if (nextWidth !== originalBounds.width || nextHeight !== originalBounds.height) {
        session.viewportBounds = originalBounds
        session.view.setBounds(originalBounds)
      }
    }
  }

  private destroySession(session: PreviewSessionRecord): void {
    if (!this.sessions.has(session.id)) {
      return
    }

    this.sessions.delete(session.id)
    this.rememberClosedSessionId(session.id)
    this.destroySessionView(session.view)
    this.emit('session-closed', session.id)
  }

  private destroySessionView(view: WebContentsView): void {
    if (view.webContents.isDestroyed()) {
      return
    }
    view.webContents.close()
  }

  private emitSessionUpserted(session: PreviewSessionRecord): void {
    this.emit('session-upserted', this.toSessionSummary(session))
  }

  private toSessionSummary(session: PreviewSessionRecord): PreviewSessionSummary {
    return {
      preview_session_id: session.id,
      title: session.title,
      url: session.url,
    }
  }

  onSessionUpserted(listener: (summary: PreviewSessionSummary) => void): () => void {
    this.on('session-upserted', listener)
    return () => this.off('session-upserted', listener)
  }

  onSessionClosed(listener: (previewSessionId: string) => void): () => void {
    this.on('session-closed', listener)
    return () => this.off('session-closed', listener)
  }

  getSessionSummary(previewSessionId: string): PreviewSessionSummary | null {
    const session = this.sessions.get(previewSessionId)
    return session ? this.toSessionSummary(session) : null
  }

  getSessionSummaryOrThrow(previewSessionId: string): PreviewSessionSummary {
    return this.toSessionSummary(this.getOpenSessionOrThrow(previewSessionId))
  }

  getSessionView(previewSessionId: string): WebContentsView {
    return this.getOpenSessionOrThrow(previewSessionId).view
  }

  updateSessionViewportBounds(previewSessionId: string, bounds: Rectangle): void {
    const session = this.getOpenSessionOrThrow(previewSessionId)
    session.viewportBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height)),
    }
    session.view.setBounds(session.viewportBounds)
  }
}
