import {
  SCREENSHOT_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  RUN_SCRIPT_TOOL_NAME,
  LIST_TABS_TOOL_NAME,
  NAVIGATE_TO_TOOL_NAME,
  OPEN_TAB_TOOL_NAME,
  DOM_SNAPSHOT_TOOL_NAME,
  BROWSER_READ_PAGE_CLEANING_MODES,
  BROWSER_WAIT_UNTIL_VALUES,
  BrowserToolError,
  READ_PAGE_TOOL_NAME,
  type BrowserToolErrorCode,
  type BrowserReadPageCleaningMode,
  type BrowserReadyState,
  type BrowserToolName,
} from "./browser-tool-contract.js";

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const browserInputErrorCodeByToolName: Record<BrowserToolName, BrowserToolErrorCode> = {
  [OPEN_TAB_TOOL_NAME]: "browser_navigation_failed",
  [NAVIGATE_TO_TOOL_NAME]: "browser_navigation_failed",
  [CLOSE_TAB_TOOL_NAME]: "browser_tab_not_found",
  [LIST_TABS_TOOL_NAME]: "browser_bridge_unavailable",
  [READ_PAGE_TOOL_NAME]: "browser_page_read_failed",
  [SCREENSHOT_TOOL_NAME]: "browser_tab_not_found",
  [DOM_SNAPSHOT_TOOL_NAME]: "dom_snapshot_failed",
  [RUN_SCRIPT_TOOL_NAME]: "browser_javascript_execution_failed",
};

export const invalidInputError = (
  toolName: BrowserToolName,
  message: string,
): BrowserToolError =>
  new BrowserToolError(browserInputErrorCodeByToolName[toolName], message);

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
  toolName: BrowserToolName,
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
  toolName: BrowserToolName,
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
  toolName: BrowserToolName,
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
  toolName: BrowserToolName,
  rawArguments: Record<string, unknown>,
): BrowserReadyState => {
  if (!hasOwn(rawArguments, "wait_until")) {
    return "load";
  }

  const normalized = asTrimmedString(rawArguments.wait_until);
  if (!normalized) {
    return "load";
  }
  if (BROWSER_WAIT_UNTIL_VALUES.includes(normalized as BrowserReadyState)) {
    return normalized as BrowserReadyState;
  }

  throw invalidInputError(
    toolName,
    `${toolName} requires 'wait_until' to be one of: ${BROWSER_WAIT_UNTIL_VALUES.join(", ")}.`,
  );
};

export const readOptionalCleaningMode = (
  rawArguments: Record<string, unknown>,
): BrowserReadPageCleaningMode => {
  if (!hasOwn(rawArguments, "cleaning_mode")) {
    return "thorough";
  }

  const normalized = asTrimmedString(rawArguments.cleaning_mode);
  if (!normalized) {
    return "thorough";
  }
  if (
    BROWSER_READ_PAGE_CLEANING_MODES.includes(
      normalized as BrowserReadPageCleaningMode,
    )
  ) {
    return normalized as BrowserReadPageCleaningMode;
  }

  throw invalidInputError(
    READ_PAGE_TOOL_NAME,
    `${READ_PAGE_TOOL_NAME} requires 'cleaning_mode' to be one of: ${BROWSER_READ_PAGE_CLEANING_MODES.join(", ")}.`,
  );
};
