import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import type { Rectangle, WebContentsView } from 'electron'
import { DEFAULT_PREVIEW_VIEW_BOUNDS } from './preview-view-factory'
import { PreviewSessionNavigation } from './preview-session-navigation'
import { PreviewSessionPageOperations } from './preview-session-page-operations'
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
  PreviewSessionManagerOptions,
  PreviewSessionRecord,
  PreviewSessionSummary,
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

    const sessionId = this.generateSessionId()
    const view = this.options.viewFactory.createPreviewView()
    const session: PreviewSessionRecord = {
      id: sessionId,
      url: normalizedUrl,
      title: input.title?.trim() || null,
      customTitle: input.title?.trim() || null,
      leasedShellId: null,
      state: 'opening',
      openPromise: null,
      view,
      viewportBounds: { ...DEFAULT_PREVIEW_VIEW_BOUNDS },
    }

    this.sessions.set(sessionId, session)
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
      this.sessions.delete(sessionId)
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

  private attachSessionObservers(session: PreviewSessionRecord): void {
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
