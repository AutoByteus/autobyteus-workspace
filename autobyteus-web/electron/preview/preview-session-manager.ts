import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import type {
  BrowserWindowConstructorOptions,
  Rectangle,
  WebContents,
  WebContentsView,
} from 'electron'
import { DEFAULT_PREVIEW_VIEW_BOUNDS } from './preview-view-factory'
import { PreviewSessionNavigation } from './preview-session-navigation'
import { PreviewSessionPageOperations } from './preview-session-page-operations'
import { logger } from '../logger'
import type {
  CapturePreviewScreenshotRequest,
  CapturePreviewScreenshotResult,
  ClosePreviewRequest,
  ClosePreviewResult,
  ExecutePreviewJavascriptRequest,
  ExecutePreviewJavascriptResult,
  ListPreviewSessionsResult,
  NavigatePreviewRequest,
  NavigatePreviewResult,
  OpenPreviewRequest,
  OpenPreviewResult,
  PreviewDomSnapshotRequest,
  PreviewDomSnapshotResult,
  PreviewPopupOpenedEvent,
  PreviewSessionManagerOptions,
  PreviewSessionRecord,
  PreviewSessionSummary,
  PreviewViewCreationOptions,
  ReadPreviewPageRequest,
  ReadPreviewPageResult,
} from './preview-session-types'
import {
  PreviewSessionError,
  type PreviewReadyState,
} from './preview-session-types'

export type {
  CapturePreviewScreenshotRequest,
  CapturePreviewScreenshotResult,
  ClosePreviewRequest,
  ClosePreviewResult,
  ExecutePreviewJavascriptRequest,
  ExecutePreviewJavascriptResult,
  ListPreviewSessionsResult,
  NavigatePreviewRequest,
  NavigatePreviewResult,
  OpenPreviewRequest,
  OpenPreviewResult,
  PreviewDomSnapshotRequest,
  PreviewDomSnapshotResult,
  PreviewPopupOpenedEvent,
  PreviewReadyState,
  PreviewSessionErrorCode,
  PreviewSessionManagerOptions,
  PreviewSessionSummary,
  ReadPreviewPageRequest,
  ReadPreviewPageResult,
} from './preview-session-types'
export { PreviewSessionError } from './preview-session-types'

const PREVIEW_SESSION_ID_LENGTH = 6
const MAX_CLOSED_SESSION_TOMBSTONES = 256
const MAX_POPUP_CHILD_SESSIONS_PER_OPENER = 8
type PreviewWindowOpenHandler = Parameters<WebContents['setWindowOpenHandler']>[0]
type PreviewWindowOpenDetails = Parameters<PreviewWindowOpenHandler>[0]
type PreviewWindowOpenResponse = ReturnType<PreviewWindowOpenHandler>
type PreviewWindowCreateOptions = BrowserWindowConstructorOptions & {
  webContents?: WebContents | null
}

export class PreviewSessionManager extends EventEmitter {
  private readonly sessions = new Map<string, PreviewSessionRecord>()
  private readonly closedSessionIds = new Set<string>()
  private readonly navigation = new PreviewSessionNavigation()
  private readonly pageOperations: PreviewSessionPageOperations

  constructor(private readonly options: PreviewSessionManagerOptions) {
    super()
    this.pageOperations = new PreviewSessionPageOperations(options.screenshotWriter)
  }

  async openSession(input: OpenPreviewRequest): Promise<OpenPreviewResult> {
    const normalizedUrl = this.navigation.normalizeUrl(input.url)

    if (input.reuse_existing) {
      const reusableSession = await this.navigation.findReusableSession(
        this.sessions,
        normalizedUrl,
        (candidate) => candidate.leasedShellId === null,
      )
      if (reusableSession) {
        this.updateSessionTitle(reusableSession, input.title ?? reusableSession.customTitle)
        this.emitSessionUpserted(reusableSession)
        return this.buildOpenPreviewResult(reusableSession, 'reused')
      }
    }

    const session = this.createSessionRecord({
      id: this.generateSessionId(),
      url: normalizedUrl,
      customTitle: input.title ?? null,
      openerSessionId: null,
      state: 'opening',
    })

    this.sessions.set(session.id, session)
    this.attachSessionObservers(session)
    session.view.setBounds(session.viewportBounds)
    session.openPromise = this.navigation
      .loadUrl(session, normalizedUrl, input.wait_until ?? 'load')
      .then(() => {
        session.state = 'open'
        this.updateSessionTitle(session, input.title ?? null)
        this.emitSessionUpserted(session)
      })

    try {
      await session.openPromise
      return this.buildOpenPreviewResult(session, 'opened')
    } catch (error) {
      this.sessions.delete(session.id)
      this.destroySessionView(session.view)
      throw error
    }
  }

  async navigateSession(input: NavigatePreviewRequest): Promise<NavigatePreviewResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    const normalizedUrl = this.navigation.normalizeUrl(input.url)
    await this.navigation.loadUrl(session, normalizedUrl, input.wait_until ?? 'load')
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
    return this.pageOperations.captureScreenshot(session, input.full_page ?? false)
  }

  listSessions(): ListPreviewSessionsResult {
    return {
      sessions: Array.from(this.sessions.values(), (session) => this.toSessionSummary(session)),
    }
  }

  async readPage(input: ReadPreviewPageRequest): Promise<ReadPreviewPageResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    return this.pageOperations.readPage(session, input.cleaning_mode ?? 'thorough')
  }

  async domSnapshot(
    input: PreviewDomSnapshotRequest,
  ): Promise<PreviewDomSnapshotResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    return this.pageOperations.domSnapshot(session, input)
  }

  async executeJavascript(
    input: ExecutePreviewJavascriptRequest,
  ): Promise<ExecutePreviewJavascriptResult> {
    const session = this.getOpenSessionOrThrow(input.preview_session_id)
    return this.pageOperations.executeJavascript(session, input.javascript)
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
    for (const session of Array.from(this.sessions.values())) {
      this.destroySession(session)
    }
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

  getSessionLeaseOwner(previewSessionId: string): number | null {
    return this.getOpenSessionOrThrow(previewSessionId).leasedShellId
  }

  claimSessionLease(previewSessionId: string, shellId: number): void {
    const session = this.getOpenSessionOrThrow(previewSessionId)
    if (session.leasedShellId !== null && session.leasedShellId !== shellId) {
      throw new Error(
        `Preview session '${previewSessionId}' is already attached to shell '${session.leasedShellId}'.`,
      )
    }
    session.leasedShellId = shellId
  }

  releaseSessionLease(previewSessionId: string, shellId: number): void {
    const session = this.sessions.get(previewSessionId)
    if (!session || session.leasedShellId !== shellId) {
      return
    }
    session.leasedShellId = null
  }

  updateSessionViewportBounds(previewSessionId: string, bounds: Rectangle): void {
    const session = this.getOpenSessionOrThrow(previewSessionId)
    this.pageOperations.updateViewportBounds(session, bounds)
  }

  onSessionUpserted(listener: (summary: PreviewSessionSummary) => void): () => void {
    this.on('session-upserted', listener)
    return () => this.off('session-upserted', listener)
  }

  onSessionClosed(listener: (previewSessionId: string) => void): () => void {
    this.on('session-closed', listener)
    return () => this.off('session-closed', listener)
  }

  onPopupOpened(listener: (event: PreviewPopupOpenedEvent) => void): () => void {
    this.on('popup-opened', listener)
    return () => this.off('popup-opened', listener)
  }

  private attachSessionObservers(session: PreviewSessionRecord): void {
    session.view.webContents.setWindowOpenHandler((details) =>
      this.handlePopupRequest(session, details),
    )

    session.view.webContents.on('page-title-updated', (_event, title) => {
      if (session.customTitle) {
        return
      }
      session.title = title?.trim() || session.url
      this.emitSessionUpserted(session)
    })

    session.view.webContents.on('did-navigate', (_event, url) => {
      session.url = url
      if (!session.customTitle) {
        session.title = session.view.webContents.getTitle()?.trim() || url
      }
      this.emitSessionUpserted(session)
    })

    session.view.webContents.on('did-navigate-in-page', (_event, url) => {
      session.url = url
      this.emitSessionUpserted(session)
    })

    session.view.webContents.on('destroyed', () => {
      this.handleWindowClosed(session.id)
    })
  }

  private handlePopupRequest(
    openerSession: PreviewSessionRecord,
    details: PreviewWindowOpenDetails,
  ): PreviewWindowOpenResponse {
    try {
      if (openerSession.leasedShellId === null) {
        throw new Error(
          `Popup requests require the opener session '${openerSession.id}' to be attached to a shell.`,
        )
      }

      if (
        this.countActivePopupChildren(openerSession.id) >=
        MAX_POPUP_CHILD_SESSIONS_PER_OPENER
      ) {
        throw new Error(
          `Popup request limit reached for opener session '${openerSession.id}'.`,
        )
      }

      const normalizedUrl = this.navigation.normalizePopupUrl(details.url)
      return {
        action: 'allow',
        createWindow: (options: PreviewWindowCreateOptions) =>
          this.createPopupChildWindow(openerSession, normalizedUrl, options),
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logger.warn(
        `Blocked preview popup request from '${openerSession.id}' to '${details.url}': ${reason}`,
      )
      return { action: 'deny' }
    }
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

  private updateSessionTitle(
    session: PreviewSessionRecord,
    customTitle: string | null | undefined,
  ): void {
    session.customTitle = customTitle?.trim() || null
    session.title =
      session.customTitle ||
      session.view.webContents.getTitle()?.trim() ||
      session.url
  }

  private createSessionRecord(input: {
    id: string
    url: string
    customTitle: string | null
    openerSessionId: string | null
    state: PreviewSessionRecord['state']
    viewOptions?: PreviewViewCreationOptions
  }): PreviewSessionRecord {
    const view = this.options.viewFactory.createPreviewView(input.viewOptions)
    const customTitle = input.customTitle?.trim() || null
    return {
      id: input.id,
      url: input.url,
      title: customTitle || input.url,
      customTitle,
      openerSessionId: input.openerSessionId,
      leasedShellId: null,
      state: input.state,
      openPromise: null,
      view,
      viewportBounds: { ...DEFAULT_PREVIEW_VIEW_BOUNDS },
    }
  }

  private createPopupChildWindow(
    openerSession: PreviewSessionRecord,
    normalizedUrl: string,
    options: PreviewWindowCreateOptions,
  ): WebContents {
    const childSession = this.createSessionRecord({
      id: this.generateSessionId(),
      url: normalizedUrl,
      customTitle: null,
      openerSessionId: openerSession.id,
      state: options.webContents ? 'open' : 'opening',
      viewOptions: {
        webContents: options.webContents ?? null,
      },
    })

    this.sessions.set(childSession.id, childSession)
    this.attachSessionObservers(childSession)
    childSession.view.setBounds(childSession.viewportBounds)

    if (!options.webContents) {
      childSession.openPromise = this.navigation
        .loadUrl(childSession, normalizedUrl, 'load')
        .then(() => {
          childSession.state = 'open'
          this.updateSessionTitle(childSession, childSession.customTitle)
          this.emitSessionUpserted(childSession)
        })
        .catch((error) => {
          this.sessions.delete(childSession.id)
          this.destroySessionView(childSession.view)
          logger.warn(
            `Popup preview child session '${childSession.id}' failed to load '${normalizedUrl}': ${String(error)}`,
          )
        })
    }

    this.emitSessionUpserted(childSession)
    this.emit('popup-opened', {
      opener_preview_session_id: openerSession.id,
      preview_session_id: childSession.id,
      url: childSession.url,
      title: childSession.title,
    } satisfies PreviewPopupOpenedEvent)

    return childSession.view.webContents
  }

  private countActivePopupChildren(openerSessionId: string): number {
    let total = 0
    for (const session of this.sessions.values()) {
      if (session.openerSessionId === openerSessionId) {
        total += 1
      }
    }
    return total
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

  private generateSessionId(): string {
    let candidate = ''
    do {
      candidate = randomUUID().replace(/-/g, '').slice(0, PREVIEW_SESSION_ID_LENGTH)
    } while (this.sessions.has(candidate) || this.closedSessionIds.has(candidate))
    return candidate
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
}
