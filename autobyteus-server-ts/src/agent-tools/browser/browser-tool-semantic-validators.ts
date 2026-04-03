import {
  SCREENSHOT_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  RUN_SCRIPT_TOOL_NAME,
  LIST_TABS_TOOL_NAME,
  NAVIGATE_TO_TOOL_NAME,
  OPEN_TAB_TOOL_NAME,
  DOM_SNAPSHOT_TOOL_NAME,
  BrowserToolError,
  READ_PAGE_TOOL_NAME,
  type ScreenshotInput,
  type CloseTabInput,
  type RunScriptInput,
  type ListTabsInput,
  type NavigateToInput,
  type OpenTabInput,
  type DomSnapshotInput,
  type ReadPageInput,
} from "./browser-tool-contract.js";
import {
  asTrimmedString,
} from "./browser-tool-input-primitives.js";

const assertBrowserTabId = (
  toolName: string,
  browserSessionId: string | null,
): string => {
  if (!browserSessionId) {
    throw new BrowserToolError(
      "browser_tab_not_found",
      `${toolName} requires a non-empty tab_id.`,
    );
  }
  return browserSessionId;
};

const assertUrl = (toolName: string, url: string | null): string => {
  if (!url) {
    throw new BrowserToolError(
      "browser_navigation_failed",
      `${toolName} requires a non-empty url.`,
    );
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:", "file:"].includes(parsed.protocol)) {
      throw new BrowserToolError(
        "browser_navigation_failed",
        `${toolName} does not support the '${parsed.protocol}' protocol.`,
      );
    }
  } catch (error) {
    if (error instanceof BrowserToolError) {
      throw error;
    }
    throw new BrowserToolError(
      "browser_navigation_failed",
      `${toolName} requires a valid absolute url.`,
    );
  }

  return url;
};

export const assertOpenTabSemantics = (input: OpenTabInput): void => {
  assertUrl(OPEN_TAB_TOOL_NAME, asTrimmedString(input.url));
};

export const assertNavigateToSemantics = (
  input: NavigateToInput,
): void => {
  assertBrowserTabId(
    NAVIGATE_TO_TOOL_NAME,
    asTrimmedString(input.tab_id),
  );
  assertUrl(NAVIGATE_TO_TOOL_NAME, asTrimmedString(input.url));
};

export const assertCloseTabSemantics = (input: CloseTabInput): void => {
  assertBrowserTabId(
    CLOSE_TAB_TOOL_NAME,
    asTrimmedString(input.tab_id),
  );
};

export const assertListTabsSemantics = (
  _input: ListTabsInput,
): void => {};

export const assertReadPageSemantics = (
  input: ReadPageInput,
): void => {
  assertBrowserTabId(
    READ_PAGE_TOOL_NAME,
    asTrimmedString(input.tab_id),
  );
};

export const assertScreenshotSemantics = (
  input: ScreenshotInput,
): void => {
  assertBrowserTabId(
    SCREENSHOT_TOOL_NAME,
    asTrimmedString(input.tab_id),
  );
};

export const assertDomSnapshotSemantics = (
  input: DomSnapshotInput,
): void => {
  assertBrowserTabId(
    DOM_SNAPSHOT_TOOL_NAME,
    asTrimmedString(input.tab_id),
  );
  if (
    input.max_elements !== undefined &&
    (input.max_elements < 1 || input.max_elements > 2000)
  ) {
    throw new BrowserToolError(
      "dom_snapshot_failed",
      `${DOM_SNAPSHOT_TOOL_NAME} requires max_elements to be between 1 and 2000.`,
    );
  }
};

export const assertRunScriptSemantics = (
  input: RunScriptInput,
): void => {
  assertBrowserTabId(
    RUN_SCRIPT_TOOL_NAME,
    asTrimmedString(input.tab_id),
  );
  if (!asTrimmedString(input.javascript)) {
    throw new BrowserToolError(
      "browser_javascript_execution_failed",
      `${RUN_SCRIPT_TOOL_NAME} requires a non-empty javascript string.`,
    );
  }
};
