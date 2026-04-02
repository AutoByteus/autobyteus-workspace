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
  type PreviewErrorCode,
  PREVIEW_READ_PAGE_CLEANING_MODES,
  type PreviewReadPageCleaningMode,
  PREVIEW_WAIT_UNTIL_VALUES,
  type PreviewReadyState,
  PreviewToolError,
  READ_PREVIEW_PAGE_TOOL_NAME,
  type ReadPreviewPageInput,
  type PreviewToolName,
  type ClosePreviewInput,
} from "./preview-tool-contract.js";

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const asTrimmedString = (value: unknown): string | null => {
  const normalized = asString(value)?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }
    if (normalized === "false") {
      return false;
    }
  }
  return null;
};

const asInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const normalized = Number.parseInt(value, 10);
    if (Number.isInteger(normalized)) {
      return normalized;
    }
  }
  return null;
};

const previewInputErrorCodeByToolName: Record<PreviewToolName, PreviewErrorCode> = {
  [OPEN_PREVIEW_TOOL_NAME]: "preview_navigation_failed",
  [NAVIGATE_PREVIEW_TOOL_NAME]: "preview_navigation_failed",
  [CLOSE_PREVIEW_TOOL_NAME]: "preview_session_not_found",
  [LIST_PREVIEW_SESSIONS_TOOL_NAME]: "preview_bridge_unavailable",
  [READ_PREVIEW_PAGE_TOOL_NAME]: "preview_page_read_failed",
  [CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME]: "preview_session_not_found",
  [PREVIEW_DOM_SNAPSHOT_TOOL_NAME]: "preview_dom_snapshot_failed",
  [EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME]: "preview_javascript_execution_failed",
};

const invalidInputError = (
  toolName: PreviewToolName,
  message: string,
): PreviewToolError =>
  new PreviewToolError(previewInputErrorCodeByToolName[toolName], message);

const assertNoAliasKeys = (
  toolName: PreviewToolName,
  rawArguments: Record<string, unknown>,
  aliases: Record<string, string>,
): void => {
  for (const [aliasKey, canonicalKey] of Object.entries(aliases)) {
    if (hasOwn(rawArguments, aliasKey)) {
      throw invalidInputError(
        toolName,
        `${toolName} requires the canonical '${canonicalKey}' parameter and does not accept '${aliasKey}'.`,
      );
    }
  }
};

const readOptionalBoolean = (
  toolName: PreviewToolName,
  rawArguments: Record<string, unknown>,
  key: string,
  defaultValue: boolean,
): boolean => {
  if (!hasOwn(rawArguments, key)) {
    return defaultValue;
  }

  const normalized = asBoolean(rawArguments[key]);
  if (normalized === null) {
    throw invalidInputError(toolName, `${toolName} requires '${key}' to be a boolean.`);
  }
  return normalized;
};

const readOptionalInteger = (
  toolName: PreviewToolName,
  rawArguments: Record<string, unknown>,
  key: string,
  defaultValue: number,
): number => {
  if (!hasOwn(rawArguments, key)) {
    return defaultValue;
  }

  const normalized = asInteger(rawArguments[key]);
  if (normalized === null) {
    throw invalidInputError(toolName, `${toolName} requires '${key}' to be an integer.`);
  }
  return normalized;
};

const readOptionalWaitUntil = (
  toolName: PreviewToolName,
  rawArguments: Record<string, unknown>,
): PreviewReadyState => {
  if (!hasOwn(rawArguments, "wait_until")) {
    return "load";
  }

  const normalized = asTrimmedString(rawArguments.wait_until);
  if (!normalized) {
    return "load";
  }
  if (PREVIEW_WAIT_UNTIL_VALUES.includes(normalized as PreviewReadyState)) {
    return normalized as PreviewReadyState;
  }

  throw invalidInputError(
    toolName,
    `${toolName} requires 'wait_until' to be one of: ${PREVIEW_WAIT_UNTIL_VALUES.join(", ")}.`,
  );
};

const readOptionalCleaningMode = (
  rawArguments: Record<string, unknown>,
): PreviewReadPageCleaningMode => {
  if (!hasOwn(rawArguments, "cleaning_mode")) {
    return "thorough";
  }

  const normalized = asTrimmedString(rawArguments.cleaning_mode);
  if (!normalized) {
    return "thorough";
  }
  if (
    PREVIEW_READ_PAGE_CLEANING_MODES.includes(
      normalized as PreviewReadPageCleaningMode,
    )
  ) {
    return normalized as PreviewReadPageCleaningMode;
  }

  throw invalidInputError(
    READ_PREVIEW_PAGE_TOOL_NAME,
    `${READ_PREVIEW_PAGE_TOOL_NAME} requires 'cleaning_mode' to be one of: ${PREVIEW_READ_PAGE_CLEANING_MODES.join(", ")}.`,
  );
};

const assertPreviewSessionId = (
  toolName: PreviewToolName,
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

const assertUrl = (toolName: PreviewToolName, url: string | null): string => {
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
