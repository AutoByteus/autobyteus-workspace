import type { Rectangle, WebContentsView } from 'electron'
import type { PreviewReadPageCleaningMode } from './preview-page-cleaner'
import type { PreviewDomSnapshotElement } from './preview-dom-snapshot-script'
import type { PreviewScreenshotArtifactWriter } from './preview-screenshot-artifact-writer'
import type { PreviewViewFactory } from './preview-view-factory'

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

export type PreviewSessionSummary = {
  preview_session_id: string
  title: string | null
  url: string
}

export type ListPreviewSessionsResult = {
  sessions: PreviewSessionSummary[]
}

export type ReadPreviewPageRequest = {
  preview_session_id: string
  cleaning_mode?: PreviewReadPageCleaningMode
}

export type ReadPreviewPageResult = {
  preview_session_id: string
  url: string
  cleaning_mode: PreviewReadPageCleaningMode
  content: string
}

export type PreviewDomSnapshotRequest = {
  preview_session_id: string
  include_non_interactive?: boolean
  include_bounding_boxes?: boolean
  max_elements?: number
}

export type PreviewDomSnapshotResult = {
  preview_session_id: string
  url: string
  schema_version: 'autobyteus-preview-dom-snapshot-v1'
  total_candidates: number
  returned_elements: number
  truncated: boolean
  elements: PreviewDomSnapshotElement[]
}

export type ExecutePreviewJavascriptRequest = {
  preview_session_id: string
  javascript: string
}

export type ExecutePreviewJavascriptResult = {
  preview_session_id: string
  result_json: string
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
  | 'preview_page_read_failed'
  | 'preview_dom_snapshot_failed'
  | 'preview_javascript_execution_failed'

export class PreviewSessionError extends Error {
  readonly code: PreviewSessionErrorCode

  constructor(code: PreviewSessionErrorCode, message: string) {
    super(message)
    this.name = 'PreviewSessionError'
    this.code = code
  }
}

export type PreviewSessionRecord = {
  id: string
  url: string
  title: string | null
  customTitle: string | null
  state: 'opening' | 'open'
  openPromise: Promise<void> | null
  view: WebContentsView
  viewportBounds: Rectangle
}

export type PreviewSessionManagerOptions = {
  viewFactory: PreviewViewFactory
  screenshotWriter: PreviewScreenshotArtifactWriter
}
