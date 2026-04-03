import type { Rectangle, WebContentsView } from 'electron'
import type { BrowserReadPageCleaningMode } from './browser-page-cleaner'
import type { BrowserDomSnapshotElement } from './browser-dom-snapshot-script'
import type { BrowserScreenshotArtifactWriter } from './browser-screenshot-artifact-writer'
import type {
  BrowserViewCreationOptions,
  BrowserViewFactory,
} from './browser-view-factory'

export type BrowserReadyState = 'domcontentloaded' | 'load'

export type OpenBrowserRequest = {
  url: string
  title?: string | null
  reuse_existing?: boolean
  wait_until?: BrowserReadyState
}

export type OpenBrowserResult = {
  tab_id: string
  status: 'opened' | 'reused'
  url: string
  title: string | null
}

export type NavigateBrowserRequest = {
  tab_id: string
  url: string
  wait_until?: BrowserReadyState
}

export type NavigateBrowserResult = {
  tab_id: string
  status: 'navigated'
  url: string
}

export type ReloadBrowserRequest = {
  tab_id: string
  wait_until?: BrowserReadyState
}

export type ReloadBrowserResult = {
  tab_id: string
  status: 'reloaded'
  url: string
}

export type CaptureBrowserScreenshotRequest = {
  tab_id: string
  full_page?: boolean
}

export type CaptureBrowserScreenshotResult = {
  tab_id: string
  artifact_path: string
  mime_type: 'image/png'
}

export type BrowserTabSummary = {
  tab_id: string
  title: string | null
  url: string
}

export type BrowserPopupOpenedEvent = {
  opener_tab_id: string
  tab_id: string
  url: string
  title: string | null
}

export type ListBrowserTabsResult = {
  sessions: BrowserTabSummary[]
}

export type ReadBrowserPageRequest = {
  tab_id: string
  cleaning_mode?: BrowserReadPageCleaningMode
}

export type ReadBrowserPageResult = {
  tab_id: string
  url: string
  cleaning_mode: BrowserReadPageCleaningMode
  content: string
}

export type BrowserDomSnapshotRequest = {
  tab_id: string
  include_non_interactive?: boolean
  include_bounding_boxes?: boolean
  max_elements?: number
}

export type BrowserDomSnapshotResult = {
  tab_id: string
  url: string
  schema_version: 'autobyteus-browser-dom-snapshot-v1'
  total_candidates: number
  returned_elements: number
  truncated: boolean
  elements: BrowserDomSnapshotElement[]
}

export type ExecuteBrowserJavascriptRequest = {
  tab_id: string
  javascript: string
}

export type ExecuteBrowserJavascriptResult = {
  tab_id: string
  result_json: string
}

export type CloseBrowserRequest = {
  tab_id: string
}

export type CloseBrowserResult = {
  tab_id: string
  status: 'closed'
}

export type BrowserTabErrorCode =
  | 'browser_session_closed'
  | 'browser_session_not_found'
  | 'browser_navigation_failed'
  | 'browser_page_read_failed'
  | 'dom_snapshot_failed'
  | 'browser_javascript_execution_failed'

export class BrowserTabError extends Error {
  readonly code: BrowserTabErrorCode

  constructor(code: BrowserTabErrorCode, message: string) {
    super(message)
    this.name = 'BrowserTabError'
    this.code = code
  }
}

export type BrowserTabRecord = {
  id: string
  url: string
  title: string | null
  customTitle: string | null
  openerSessionId: string | null
  leasedShellId: number | null
  state: 'opening' | 'open'
  openPromise: Promise<void> | null
  view: WebContentsView
  viewportBounds: Rectangle
}

export type BrowserTabManagerOptions = {
  viewFactory: BrowserViewFactory
  screenshotWriter: BrowserScreenshotArtifactWriter
}

export type { BrowserViewCreationOptions }
