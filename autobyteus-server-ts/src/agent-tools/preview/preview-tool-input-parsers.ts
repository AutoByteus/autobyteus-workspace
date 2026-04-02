import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  type CapturePreviewScreenshotInput,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  type ExecutePreviewJavascriptInput,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  type ListPreviewSessionsInput,
  NAVIGATE_PREVIEW_TOOL_NAME,
  type NavigatePreviewInput,
  OPEN_PREVIEW_TOOL_NAME,
  type OpenPreviewInput,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  type PreviewDomSnapshotInput,
  READ_PREVIEW_PAGE_TOOL_NAME,
  type ReadPreviewPageInput,
  type ClosePreviewInput,
} from "./preview-tool-contract.js";
import {
  asString,
  asTrimmedString,
  assertNoAliasKeys,
  readOptionalBoolean,
  readOptionalCleaningMode,
  readOptionalInteger,
  readOptionalWaitUntil,
} from "./preview-tool-input-primitives.js";

export const parseOpenPreviewInput = (
  rawArguments: Record<string, unknown>,
): OpenPreviewInput => {
  assertNoAliasKeys(OPEN_PREVIEW_TOOL_NAME, rawArguments, {
    window_title: "title",
    reuseExisting: "reuse_existing",
    waitUntil: "wait_until",
  });

  return {
    url: asString(rawArguments.url) ?? "",
    title: asTrimmedString(rawArguments.title) ?? null,
    reuse_existing: readOptionalBoolean(
      OPEN_PREVIEW_TOOL_NAME,
      rawArguments,
      "reuse_existing",
      false,
    ),
    wait_until: readOptionalWaitUntil(OPEN_PREVIEW_TOOL_NAME, rawArguments),
  };
};

export const parseNavigatePreviewInput = (
  rawArguments: Record<string, unknown>,
): NavigatePreviewInput => {
  assertNoAliasKeys(NAVIGATE_PREVIEW_TOOL_NAME, rawArguments, {
    previewSessionId: "preview_session_id",
    waitUntil: "wait_until",
  });

  return {
    preview_session_id: asTrimmedString(rawArguments.preview_session_id) ?? "",
    url: asString(rawArguments.url) ?? "",
    wait_until: readOptionalWaitUntil(NAVIGATE_PREVIEW_TOOL_NAME, rawArguments),
  };
};

export const parseClosePreviewInput = (
  rawArguments: Record<string, unknown>,
): ClosePreviewInput => {
  assertNoAliasKeys(CLOSE_PREVIEW_TOOL_NAME, rawArguments, {
    previewSessionId: "preview_session_id",
  });

  return {
    preview_session_id: asTrimmedString(rawArguments.preview_session_id) ?? "",
  };
};

export const parseListPreviewSessionsInput = (): ListPreviewSessionsInput => ({});

export const parseReadPreviewPageInput = (
  rawArguments: Record<string, unknown>,
): ReadPreviewPageInput => {
  assertNoAliasKeys(READ_PREVIEW_PAGE_TOOL_NAME, rawArguments, {
    previewSessionId: "preview_session_id",
    cleaningMode: "cleaning_mode",
  });

  return {
    preview_session_id: asTrimmedString(rawArguments.preview_session_id) ?? "",
    cleaning_mode: readOptionalCleaningMode(rawArguments),
  };
};

export const parseCapturePreviewScreenshotInput = (
  rawArguments: Record<string, unknown>,
): CapturePreviewScreenshotInput => {
  assertNoAliasKeys(CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME, rawArguments, {
    previewSessionId: "preview_session_id",
    fullPage: "full_page",
  });

  return {
    preview_session_id: asTrimmedString(rawArguments.preview_session_id) ?? "",
    full_page: readOptionalBoolean(
      CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
      rawArguments,
      "full_page",
      false,
    ),
  };
};

export const parsePreviewDomSnapshotInput = (
  rawArguments: Record<string, unknown>,
): PreviewDomSnapshotInput => {
  assertNoAliasKeys(PREVIEW_DOM_SNAPSHOT_TOOL_NAME, rawArguments, {
    previewSessionId: "preview_session_id",
    includeNonInteractive: "include_non_interactive",
    includeBoundingBoxes: "include_bounding_boxes",
    maxElements: "max_elements",
  });

  return {
    preview_session_id: asTrimmedString(rawArguments.preview_session_id) ?? "",
    include_non_interactive: readOptionalBoolean(
      PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
      rawArguments,
      "include_non_interactive",
      false,
    ),
    include_bounding_boxes: readOptionalBoolean(
      PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
      rawArguments,
      "include_bounding_boxes",
      true,
    ),
    max_elements: readOptionalInteger(
      PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
      rawArguments,
      "max_elements",
      200,
    ),
  };
};

export const parseExecutePreviewJavascriptInput = (
  rawArguments: Record<string, unknown>,
): ExecutePreviewJavascriptInput => {
  assertNoAliasKeys(EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME, rawArguments, {
    previewSessionId: "preview_session_id",
  });

  return {
    preview_session_id: asTrimmedString(rawArguments.preview_session_id) ?? "",
    javascript: asString(rawArguments.javascript) ?? "",
  };
};
