import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  PREVIEW_READ_PAGE_CLEANING_MODES,
  PREVIEW_WAIT_UNTIL_VALUES,
  PreviewToolError,
  READ_PREVIEW_PAGE_TOOL_NAME,
  type PreviewErrorCode,
  type PreviewReadPageCleaningMode,
  type PreviewReadyState,
  type PreviewToolName,
} from "./preview-tool-contract.js";

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

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

export const invalidInputError = (
  toolName: PreviewToolName,
  message: string,
): PreviewToolError =>
  new PreviewToolError(previewInputErrorCodeByToolName[toolName], message);

export const asString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

export const asTrimmedString = (value: unknown): string | null => {
  const normalized = asString(value)?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
};

export const asBoolean = (value: unknown): boolean | null => {
  if (typeof value === "boolean") {
    return value;
  }
  return null;
};

export const asInteger = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  return null;
};

export const assertNoAliasKeys = (
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

export const readOptionalBoolean = (
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

export const readOptionalInteger = (
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

export const readOptionalWaitUntil = (
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

export const readOptionalCleaningMode = (
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
