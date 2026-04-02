import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  PreviewToolError,
  READ_PREVIEW_PAGE_TOOL_NAME,
  type CapturePreviewScreenshotInput,
  type ClosePreviewInput,
  type ExecutePreviewJavascriptInput,
  type ListPreviewSessionsInput,
  type NavigatePreviewInput,
  type OpenPreviewInput,
  type PreviewDomSnapshotInput,
  type ReadPreviewPageInput,
} from "./preview-tool-contract.js";
import {
  asTrimmedString,
} from "./preview-tool-input-primitives.js";

const assertPreviewSessionId = (
  toolName: string,
  previewSessionId: string | null,
): string => {
  if (!previewSessionId) {
    throw new PreviewToolError(
      "preview_session_not_found",
      `${toolName} requires a non-empty preview_session_id.`,
    );
  }
  return previewSessionId;
};

const assertUrl = (toolName: string, url: string | null): string => {
  if (!url) {
    throw new PreviewToolError(
      "preview_navigation_failed",
      `${toolName} requires a non-empty url.`,
    );
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "file:"].includes(parsed.protocol)) {
      throw new PreviewToolError(
        "preview_navigation_failed",
        `${toolName} does not support the '${parsed.protocol}' protocol.`,
      );
    }
  } catch (error) {
    if (error instanceof PreviewToolError) {
      throw error;
    }
    throw new PreviewToolError(
      "preview_navigation_failed",
      `${toolName} requires a valid absolute url.`,
    );
  }

  return url;
};

export const assertOpenPreviewSemantics = (input: OpenPreviewInput): void => {
  assertUrl(OPEN_PREVIEW_TOOL_NAME, asTrimmedString(input.url));
};

export const assertNavigatePreviewSemantics = (
  input: NavigatePreviewInput,
): void => {
  assertPreviewSessionId(
    NAVIGATE_PREVIEW_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
  assertUrl(NAVIGATE_PREVIEW_TOOL_NAME, asTrimmedString(input.url));
};

export const assertClosePreviewSemantics = (input: ClosePreviewInput): void => {
  assertPreviewSessionId(
    CLOSE_PREVIEW_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
};

export const assertListPreviewSessionsSemantics = (
  _input: ListPreviewSessionsInput,
): void => {};

export const assertReadPreviewPageSemantics = (
  input: ReadPreviewPageInput,
): void => {
  assertPreviewSessionId(
    READ_PREVIEW_PAGE_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
};

export const assertCapturePreviewScreenshotSemantics = (
  input: CapturePreviewScreenshotInput,
): void => {
  assertPreviewSessionId(
    CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
};

export const assertPreviewDomSnapshotSemantics = (
  input: PreviewDomSnapshotInput,
): void => {
  assertPreviewSessionId(
    PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
  if (
    input.max_elements !== undefined &&
    (input.max_elements < 1 || input.max_elements > 2000)
  ) {
    throw new PreviewToolError(
      "preview_dom_snapshot_failed",
      `${PREVIEW_DOM_SNAPSHOT_TOOL_NAME} requires max_elements to be between 1 and 2000.`,
    );
  }
};

export const assertExecutePreviewJavascriptSemantics = (
  input: ExecutePreviewJavascriptInput,
): void => {
  assertPreviewSessionId(
    EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
  if (!asTrimmedString(input.javascript)) {
    throw new PreviewToolError(
      "preview_javascript_execution_failed",
      `${EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME} requires a non-empty javascript string.`,
    );
  }
};
