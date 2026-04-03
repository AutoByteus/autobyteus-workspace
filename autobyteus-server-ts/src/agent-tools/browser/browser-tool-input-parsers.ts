import {
  SCREENSHOT_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  type ScreenshotInput,
  RUN_SCRIPT_TOOL_NAME,
  type RunScriptInput,
  LIST_TABS_TOOL_NAME,
  type ListTabsInput,
  NAVIGATE_TO_TOOL_NAME,
  type NavigateToInput,
  OPEN_TAB_TOOL_NAME,
  type OpenTabInput,
  DOM_SNAPSHOT_TOOL_NAME,
  type DomSnapshotInput,
  READ_PAGE_TOOL_NAME,
  type ReadPageInput,
  type CloseTabInput,
} from "./browser-tool-contract.js";
import {
  asString,
  asTrimmedString,
  assertNoAliasKeys,
  readOptionalBoolean,
  readOptionalCleaningMode,
  readOptionalInteger,
  readOptionalWaitUntil,
} from "./browser-tool-input-primitives.js";

export const parseOpenTabInput = (
  rawArguments: Record<string, unknown>,
): OpenTabInput => {
  assertNoAliasKeys(OPEN_TAB_TOOL_NAME, rawArguments, {
    window_title: "title",
    reuseExisting: "reuse_existing",
    waitUntil: "wait_until",
  });

  return {
    url: asString(rawArguments.url) ?? "",
    title: asTrimmedString(rawArguments.title) ?? null,
    reuse_existing: readOptionalBoolean(
      OPEN_TAB_TOOL_NAME,
      rawArguments,
      "reuse_existing",
      false,
    ),
    wait_until: readOptionalWaitUntil(OPEN_TAB_TOOL_NAME, rawArguments),
  };
};

export const parseNavigateToInput = (
  rawArguments: Record<string, unknown>,
): NavigateToInput => {
  assertNoAliasKeys(NAVIGATE_TO_TOOL_NAME, rawArguments, {
    browserSessionId: "tab_id",
    waitUntil: "wait_until",
  });

  return {
    tab_id: asTrimmedString(rawArguments.tab_id) ?? "",
    url: asString(rawArguments.url) ?? "",
    wait_until: readOptionalWaitUntil(NAVIGATE_TO_TOOL_NAME, rawArguments),
  };
};

export const parseCloseTabInput = (
  rawArguments: Record<string, unknown>,
): CloseTabInput => {
  assertNoAliasKeys(CLOSE_TAB_TOOL_NAME, rawArguments, {
    browserSessionId: "tab_id",
  });

  return {
    tab_id: asTrimmedString(rawArguments.tab_id) ?? "",
  };
};

export const parseListTabsInput = (): ListTabsInput => ({});

export const parseReadPageInput = (
  rawArguments: Record<string, unknown>,
): ReadPageInput => {
  assertNoAliasKeys(READ_PAGE_TOOL_NAME, rawArguments, {
    browserSessionId: "tab_id",
    cleaningMode: "cleaning_mode",
  });

  return {
    tab_id: asTrimmedString(rawArguments.tab_id) ?? "",
    cleaning_mode: readOptionalCleaningMode(rawArguments),
  };
};

export const parseScreenshotInput = (
  rawArguments: Record<string, unknown>,
): ScreenshotInput => {
  assertNoAliasKeys(SCREENSHOT_TOOL_NAME, rawArguments, {
    browserSessionId: "tab_id",
    fullPage: "full_page",
  });

  return {
    tab_id: asTrimmedString(rawArguments.tab_id) ?? "",
    full_page: readOptionalBoolean(
      SCREENSHOT_TOOL_NAME,
      rawArguments,
      "full_page",
      false,
    ),
  };
};

export const parseDomSnapshotInput = (
  rawArguments: Record<string, unknown>,
): DomSnapshotInput => {
  assertNoAliasKeys(DOM_SNAPSHOT_TOOL_NAME, rawArguments, {
    browserSessionId: "tab_id",
    includeNonInteractive: "include_non_interactive",
    includeBoundingBoxes: "include_bounding_boxes",
    maxElements: "max_elements",
  });

  return {
    tab_id: asTrimmedString(rawArguments.tab_id) ?? "",
    include_non_interactive: readOptionalBoolean(
      DOM_SNAPSHOT_TOOL_NAME,
      rawArguments,
      "include_non_interactive",
      false,
    ),
    include_bounding_boxes: readOptionalBoolean(
      DOM_SNAPSHOT_TOOL_NAME,
      rawArguments,
      "include_bounding_boxes",
      true,
    ),
    max_elements: readOptionalInteger(
      DOM_SNAPSHOT_TOOL_NAME,
      rawArguments,
      "max_elements",
      200,
    ),
  };
};

export const parseRunScriptInput = (
  rawArguments: Record<string, unknown>,
): RunScriptInput => {
  assertNoAliasKeys(RUN_SCRIPT_TOOL_NAME, rawArguments, {
    browserSessionId: "tab_id",
  });

  return {
    tab_id: asTrimmedString(rawArguments.tab_id) ?? "",
    javascript: asString(rawArguments.javascript) ?? "",
  };
};
