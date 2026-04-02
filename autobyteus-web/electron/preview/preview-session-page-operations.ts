import type { Rectangle } from 'electron'
import {
  PREVIEW_DOM_SNAPSHOT_SCRIPT,
  type PreviewDomSnapshotElement,
  type PreviewDomSnapshotScriptResult,
} from './preview-dom-snapshot-script'
import {
  cleanPreviewPageContent,
  type PreviewReadPageCleaningMode,
} from './preview-page-cleaner'
import type { PreviewScreenshotArtifactWriter } from './preview-screenshot-artifact-writer'
import {
  type CapturePreviewScreenshotResult,
  type ExecutePreviewJavascriptResult,
  type PreviewDomSnapshotRequest,
  type PreviewDomSnapshotResult,
  PreviewSessionError,
  type PreviewSessionRecord,
  type ReadPreviewPageResult,
} from './preview-session-types'

const MAX_FULL_PAGE_DIMENSION = 4000
const FULL_PAGE_CAPTURE_SETTLE_MS = 60
const READ_PAGE_SCRIPT = "document.documentElement?.outerHTML ?? ''"

const sleep = async (ms: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

const rectanglesEqual = (left: Rectangle, right: Rectangle): boolean => {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  )
}

export class PreviewSessionPageOperations {
  constructor(private readonly screenshotWriter: PreviewScreenshotArtifactWriter) {}

  async captureScreenshot(
    session: PreviewSessionRecord,
    fullPage: boolean,
  ): Promise<CapturePreviewScreenshotResult> {
    const image = await this.captureSessionPage(session, fullPage)
    const artifactPath = await this.screenshotWriter.write(image.toPNG(), session.id)

    return {
      preview_session_id: session.id,
      artifact_path: artifactPath,
      mime_type: 'image/png',
    }
  }

  async readPage(
    session: PreviewSessionRecord,
    cleaningMode: PreviewReadPageCleaningMode,
  ): Promise<ReadPreviewPageResult> {
    try {
      const rawHtml = await session.view.webContents.executeJavaScript(READ_PAGE_SCRIPT, true)
      return {
        preview_session_id: session.id,
        url: session.url,
        cleaning_mode: cleaningMode,
        content: cleanPreviewPageContent(
          typeof rawHtml === 'string' ? rawHtml : '',
          cleaningMode,
        ),
      }
    } catch (error) {
      throw new PreviewSessionError(
        'preview_page_read_failed',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  async domSnapshot(
    session: PreviewSessionRecord,
    input: PreviewDomSnapshotRequest,
  ): Promise<PreviewDomSnapshotResult> {
    const maxElements = Math.max(1, Math.min(input.max_elements ?? 200, 2000))

    try {
      const result = await session.view.webContents.executeJavaScript(
        `(${PREVIEW_DOM_SNAPSHOT_SCRIPT})(${JSON.stringify({
          includeNonInteractive: input.include_non_interactive ?? false,
          includeBoundingBoxes: input.include_bounding_boxes ?? true,
          maxElements,
        })})`,
        true,
      )
      const snapshot =
        result && typeof result === 'object'
          ? (result as Partial<PreviewDomSnapshotScriptResult>)
          : {}

      return {
        preview_session_id: session.id,
        url: session.url,
        schema_version: 'autobyteus-preview-dom-snapshot-v1',
        total_candidates:
          typeof snapshot.total_candidates === 'number'
            ? snapshot.total_candidates
            : Array.isArray(snapshot.elements)
              ? snapshot.elements.length
              : 0,
        returned_elements:
          typeof snapshot.returned_elements === 'number'
            ? snapshot.returned_elements
            : Array.isArray(snapshot.elements)
              ? snapshot.elements.length
              : 0,
        truncated:
          typeof snapshot.truncated === 'boolean'
            ? snapshot.truncated
            : Array.isArray(snapshot.elements)
              ? snapshot.elements.length >= maxElements
              : false,
        elements: Array.isArray(snapshot.elements)
          ? (snapshot.elements as PreviewDomSnapshotElement[])
          : [],
      }
    } catch (error) {
      throw new PreviewSessionError(
        'preview_dom_snapshot_failed',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  async executeJavascript(
    session: PreviewSessionRecord,
    javascriptSource: string,
  ): Promise<ExecutePreviewJavascriptResult> {
    const javascript =
      typeof javascriptSource === 'string' ? javascriptSource.trim() : ''
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

  updateViewportBounds(session: PreviewSessionRecord, bounds: Rectangle): void {
    const nextBounds = {
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height)),
    }

    if (rectanglesEqual(session.viewportBounds, nextBounds)) {
      return
    }

    session.viewportBounds = nextBounds
    session.view.setBounds(session.viewportBounds)
  }

  private async captureSessionPage(session: PreviewSessionRecord, fullPage: boolean) {
    if (!fullPage) {
      return session.view.webContents.capturePage()
    }

    const originalBounds = { ...session.viewportBounds }
    const documentBounds = (await session.view.webContents.executeJavaScript(
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
    )) as { width?: number; height?: number } | null

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
}
