import { randomUUID } from 'crypto'
import { EventEmitter } from 'events'
import type {
  BrowserWindowConstructorOptions,
  Rectangle,
  WebContents,
  WebContentsView,
} from 'electron'
import { DEFAULT_BROWSER_VIEW_BOUNDS } from './browser-view-factory'
import { BrowserTabNavigation } from './browser-tab-navigation'
import { BrowserTabPageOperations } from './browser-tab-page-operations'
import { logger } from '../logger'
import type {
  CaptureBrowserScreenshotRequest,
  CaptureBrowserScreenshotResult,
  CloseBrowserRequest,
  CloseBrowserResult,
  ExecuteBrowserJavascriptRequest,
  ExecuteBrowserJavascriptResult,
  ListBrowserTabsResult,
  NavigateBrowserRequest,
  NavigateBrowserResult,
  OpenBrowserRequest,
  OpenBrowserResult,
  ReloadBrowserRequest,
  ReloadBrowserResult,
  BrowserDomSnapshotRequest,
  BrowserDomSnapshotResult,
  BrowserPopupOpenedEvent,
  BrowserTabManagerOptions,
  BrowserTabRecord,
  BrowserTabSummary,
  BrowserViewCreationOptions,
  ReadBrowserPageRequest,
  ReadBrowserPageResult,
} from './browser-tab-types'
import {
  BrowserTabError,
  type BrowserReadyState,
} from './browser-tab-types'

export type {
  CaptureBrowserScreenshotRequest,
  CaptureBrowserScreenshotResult,
  CloseBrowserRequest,
  CloseBrowserResult,
  ExecuteBrowserJavascriptRequest,
  ExecuteBrowserJavascriptResult,
  ListBrowserTabsResult,
  NavigateBrowserRequest,
  NavigateBrowserResult,
  OpenBrowserRequest,
  OpenBrowserResult,
  ReloadBrowserRequest,
  ReloadBrowserResult,
  BrowserDomSnapshotRequest,
  BrowserDomSnapshotResult,
  BrowserPopupOpenedEvent,
  BrowserReadyState,
  BrowserTabErrorCode,
  BrowserTabManagerOptions,
  BrowserTabSummary,
  ReadBrowserPageRequest,
  ReadBrowserPageResult,
} from './browser-tab-types'
export { BrowserTabError } from './browser-tab-types'

const TAB_ID_LENGTH = 6
const MAX_CLOSED_SESSION_TOMBSTONES = 256
const MAX_POPUP_CHILD_SESSIONS_PER_OPENER = 8
type BrowserWindowOpenHandler = Parameters<WebContents['setWindowOpenHandler']>[0]
type BrowserWindowOpenDetails = Parameters<BrowserWindowOpenHandler>[0]
type BrowserWindowOpenResponse = ReturnType<BrowserWindowOpenHandler>
type BrowserWindowCreateOptions = BrowserWindowConstructorOptions & {
  webContents?: WebContents | null
}

export class BrowserTabManager extends EventEmitter {
  private readonly sessions = new Map<string, BrowserTabRecord>()
  private readonly closedSessionIds = new Set<string>()
  private readonly navigation = new BrowserTabNavigation()
  private readonly pageOperations: BrowserTabPageOperations

  constructor(private readonly options: BrowserTabManagerOptions) {
    super()
    this.pageOperations = new BrowserTabPageOperations(options.screenshotWriter)
  }

  async openSession(input: OpenBrowserRequest): Promise<OpenBrowserResult> {
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
        return this.buildOpenBrowserResult(reusableSession, 'reused')
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
      return this.buildOpenBrowserResult(session, 'opened')
    } catch (error) {
      this.sessions.delete(session.id)
      this.destroySessionView(session.view)
      throw error
    }
  }

  async navigateSession(input: NavigateBrowserRequest): Promise<NavigateBrowserResult> {
    const session = this.getOpenSessionOrThrow(input.tab_id)
    const normalizedUrl = this.navigation.normalizeUrl(input.url)
    await this.navigation.loadUrl(session, normalizedUrl, input.wait_until ?? 'load')
    this.updateSessionTitle(session, session.customTitle)
    this.emitSessionUpserted(session)

    return {
      tab_id: session.id,
      status: 'navigated',
      url: normalizedUrl,
    }
  }

  async reloadSession(input: ReloadBrowserRequest): Promise<ReloadBrowserResult> {
    const session = this.getOpenSessionOrThrow(input.tab_id)
    await this.navigation.reload(session, input.wait_until ?? 'load')
    this.updateSessionTitle(session, session.customTitle)
    this.emitSessionUpserted(session)

    return {
      tab_id: session.id,
      status: 'reloaded',
      url: session.url,
    }
  }

  async captureScreenshot(
    input: CaptureBrowserScreenshotRequest,
  ): Promise<CaptureBrowserScreenshotResult> {
    const session = this.getOpenSessionOrThrow(input.tab_id)
    return this.pageOperations.captureScreenshot(session, input.full_page ?? false)
  }

  listSessions(): ListBrowserTabsResult {
    return {
      sessions: Array.from(this.sessions.values(), (session) => this.toSessionSummary(session)),
    }
  }

  async readPage(input: ReadBrowserPageRequest): Promise<ReadBrowserPageResult> {
    const session = this.getOpenSessionOrThrow(input.tab_id)
    return this.pageOperations.readPage(session, input.cleaning_mode ?? 'thorough')
  }

  async domSnapshot(
    input: BrowserDomSnapshotRequest,
  ): Promise<BrowserDomSnapshotResult> {
    const session = this.getOpenSessionOrThrow(input.tab_id)
    return this.pageOperations.domSnapshot(session, input)
  }

  async executeJavascript(
    input: ExecuteBrowserJavascriptRequest,
  ): Promise<ExecuteBrowserJavascriptResult> {
    const session = this.getOpenSessionOrThrow(input.tab_id)
    return this.pageOperations.executeJavascript(session, input.javascript)
  }

  async closeSession(input: CloseBrowserRequest): Promise<CloseBrowserResult> {
    const session = this.getOpenSessionOrThrow(input.tab_id)
    this.destroySession(session)
    return {
      tab_id: session.id,
      status: 'closed',
    }
  }

  async closeAllSessions(): Promise<void> {
    for (const session of Array.from(this.sessions.values())) {
      this.destroySession(session)
    }
  }

  getSessionSummary(browserSessionId: string): BrowserTabSummary | null {
    const session = this.sessions.get(browserSessionId)
    return session ? this.toSessionSummary(session) : null
  }

  getSessionSummaryOrThrow(browserSessionId: string): BrowserTabSummary {
    return this.toSessionSummary(this.getOpenSessionOrThrow(browserSessionId))
  }

  getSessionView(browserSessionId: string): WebContentsView {
    return this.getOpenSessionOrThrow(browserSessionId).view
  }

  getSessionLeaseOwner(browserSessionId: string): number | null {
    return this.getOpenSessionOrThrow(browserSessionId).leasedShellId
  }

  claimSessionLease(browserSessionId: string, shellId: number): void {
    const session = this.getOpenSessionOrThrow(browserSessionId)
    if (session.leasedShellId !== null && session.leasedShellId !== shellId) {
      throw new Error(
        `Browser session '${browserSessionId}' is already attached to shell '${session.leasedShellId}'.`,
      )
    }
    session.leasedShellId = shellId
  }

  releaseSessionLease(browserSessionId: string, shellId: number): void {
    const session = this.sessions.get(browserSessionId)
    if (!session || session.leasedShellId !== shellId) {
      return
    }
    session.leasedShellId = null
  }

  updateSessionViewportBounds(browserSessionId: string, bounds: Rectangle): void {
    const session = this.getOpenSessionOrThrow(browserSessionId)
    this.pageOperations.updateViewportBounds(session, bounds)
  }

  onSessionUpserted(listener: (summary: BrowserTabSummary) => void): () => void {
    this.on('session-upserted', listener)
    return () => this.off('session-upserted', listener)
  }

  onSessionClosed(listener: (browserSessionId: string) => void): () => void {
    this.on('session-closed', listener)
    return () => this.off('session-closed', listener)
  }

  onPopupOpened(listener: (event: BrowserPopupOpenedEvent) => void): () => void {
    this.on('popup-opened', listener)
    return () => this.off('popup-opened', listener)
  }

  private attachSessionObservers(session: BrowserTabRecord): void {
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
    openerSession: BrowserTabRecord,
    details: BrowserWindowOpenDetails,
  ): BrowserWindowOpenResponse {
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
        createWindow: (options: BrowserWindowCreateOptions) =>
          this.createPopupChildWindow(openerSession, normalizedUrl, options),
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      logger.warn(
        `Blocked browser popup request from '${openerSession.id}' to '${details.url}': ${reason}`,
      )
      return { action: 'deny' }
    }
  }

  private handleWindowClosed(browserSessionId: string): void {
    const session = this.sessions.get(browserSessionId)
    if (!session) {
      return
    }

    this.sessions.delete(browserSessionId)
    this.rememberClosedSessionId(browserSessionId)
    this.emit('session-closed', browserSessionId)
  }

  private getOpenSessionOrThrow(browserSessionId: string): BrowserTabRecord {
    const normalizedId = typeof browserSessionId === 'string' ? browserSessionId.trim() : ''
    if (!normalizedId) {
      throw new BrowserTabError(
        'browser_session_not_found',
        'tab_id is required.',
      )
    }

    const session = this.sessions.get(normalizedId)
    if (session) {
      return session
    }

    if (this.closedSessionIds.has(normalizedId)) {
      throw new BrowserTabError(
        'browser_session_closed',
        `Browser session '${normalizedId}' has already been closed.`,
      )
    }

    throw new BrowserTabError(
      'browser_session_not_found',
      `Browser session '${normalizedId}' was not found.`,
    )
  }

  private rememberClosedSessionId(browserSessionId: string): void {
    this.closedSessionIds.add(browserSessionId)
    while (this.closedSessionIds.size > MAX_CLOSED_SESSION_TOMBSTONES) {
      const oldestClosedSessionId = this.closedSessionIds.values().next().value
      if (!oldestClosedSessionId) {
        return
      }
      this.closedSessionIds.delete(oldestClosedSessionId)
    }
  }

  private buildOpenBrowserResult(
    session: BrowserTabRecord,
    status: OpenBrowserResult['status'],
  ): OpenBrowserResult {
    return {
      tab_id: session.id,
      status,
      url: session.url,
      title: session.title,
    }
  }

  private updateSessionTitle(
    session: BrowserTabRecord,
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
    state: BrowserTabRecord['state']
    viewOptions?: BrowserViewCreationOptions
  }): BrowserTabRecord {
    const view = this.options.viewFactory.createBrowserView(input.viewOptions)
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
      viewportBounds: { ...DEFAULT_BROWSER_VIEW_BOUNDS },
    }
  }

  private createPopupChildWindow(
    openerSession: BrowserTabRecord,
    normalizedUrl: string,
    options: BrowserWindowCreateOptions,
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
            `Popup browser child session '${childSession.id}' failed to load '${normalizedUrl}': ${String(error)}`,
          )
        })
    }

    this.emitSessionUpserted(childSession)
    this.emit('popup-opened', {
      opener_tab_id: openerSession.id,
      tab_id: childSession.id,
      url: childSession.url,
      title: childSession.title,
    } satisfies BrowserPopupOpenedEvent)

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

  private destroySession(session: BrowserTabRecord): void {
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
      candidate = randomUUID().replace(/-/g, '').slice(0, TAB_ID_LENGTH)
    } while (this.sessions.has(candidate) || this.closedSessionIds.has(candidate))
    return candidate
  }

  private emitSessionUpserted(session: BrowserTabRecord): void {
    this.emit('session-upserted', this.toSessionSummary(session))
  }

  private toSessionSummary(session: BrowserTabRecord): BrowserTabSummary {
    return {
      tab_id: session.id,
      title: session.title,
      url: session.url,
    }
  }
}
