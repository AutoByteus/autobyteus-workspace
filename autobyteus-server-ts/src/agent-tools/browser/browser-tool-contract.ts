export const BROWSER_BRIDGE_BASE_URL_ENV = "AUTOBYTEUS_BROWSER_BRIDGE_BASE_URL";
export const BROWSER_BRIDGE_TOKEN_ENV = "AUTOBYTEUS_BROWSER_BRIDGE_TOKEN";

export const OPEN_TAB_TOOL_NAME = "open_tab";
export const NAVIGATE_TO_TOOL_NAME = "navigate_to";
export const CLOSE_TAB_TOOL_NAME = "close_tab";
export const LIST_TABS_TOOL_NAME = "list_tabs";
export const READ_PAGE_TOOL_NAME = "read_page";
export const SCREENSHOT_TOOL_NAME = "screenshot";
export const DOM_SNAPSHOT_TOOL_NAME = "dom_snapshot";
export const RUN_SCRIPT_TOOL_NAME = "run_script";

export const BROWSER_TOOL_NAME_LIST = [
  OPEN_TAB_TOOL_NAME,
  NAVIGATE_TO_TOOL_NAME,
  CLOSE_TAB_TOOL_NAME,
  LIST_TABS_TOOL_NAME,
  READ_PAGE_TOOL_NAME,
  SCREENSHOT_TOOL_NAME,
  DOM_SNAPSHOT_TOOL_NAME,
  RUN_SCRIPT_TOOL_NAME,
] as const;

export type BrowserToolName = (typeof BROWSER_TOOL_NAME_LIST)[number];

export const BROWSER_TOOL_NAMES = new Set<string>(BROWSER_TOOL_NAME_LIST);

export const isBrowserToolName = (value: string | null | undefined): boolean =>
  typeof value === "string" && BROWSER_TOOL_NAMES.has(value.trim());

export const BROWSER_WAIT_UNTIL_VALUES = ["domcontentloaded", "load"] as const;
export const BROWSER_READ_PAGE_CLEANING_MODES = ["none", "light", "thorough"] as const;

export type BrowserReadyState = (typeof BROWSER_WAIT_UNTIL_VALUES)[number];
export type BrowserReadPageCleaningMode =
  (typeof BROWSER_READ_PAGE_CLEANING_MODES)[number];

export type BrowserToolParameterType = "string" | "boolean" | "integer" | "enum";

export type BrowserToolParameterSpec = {
  name: string;
  type: BrowserToolParameterType;
  description: string;
  required: boolean;
  enum_values?: readonly string[];
  default_value?: string | boolean | number;
  minimum?: number;
  maximum?: number;
};

export type BrowserTabSummary = {
  tab_id: string;
  title: string | null;
  url: string;
};

export type OpenTabInput = {
  url: string;
  title?: string | null;
  reuse_existing?: boolean;
  wait_until?: BrowserReadyState;
};

export type OpenTabResult = {
  tab_id: string;
  status: "opened" | "reused";
  url: string;
  title: string | null;
};

export type NavigateToInput = {
  tab_id: string;
  url: string;
  wait_until?: BrowserReadyState;
};

export type NavigateToResult = {
  tab_id: string;
  status: "navigated";
  url: string;
};

export type CloseTabInput = {
  tab_id: string;
};

export type CloseTabResult = {
  tab_id: string;
  status: "closed";
};

export type ListTabsInput = Record<string, never>;

export type ListTabsResult = {
  tabs: BrowserTabSummary[];
};

export type ReadPageInput = {
  tab_id: string;
  cleaning_mode?: BrowserReadPageCleaningMode;
};

export type ReadPageResult = {
  tab_id: string;
  url: string;
  cleaning_mode: BrowserReadPageCleaningMode;
  content: string;
};

export type ScreenshotInput = {
  tab_id: string;
  full_page?: boolean;
};

export type ScreenshotResult = {
  tab_id: string;
  artifact_path: string;
  mime_type: "image/png";
};

export type DomSnapshotBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DomSnapshotElement = {
  element_id: string;
  tag_name: string;
  dom_id: string | null;
  css_selector: string;
  role: string | null;
  name: string | null;
  text: string | null;
  href: string | null;
  value: string | null;
  bounding_box: DomSnapshotBoundingBox | null;
};

export type DomSnapshotInput = {
  tab_id: string;
  include_non_interactive?: boolean;
  include_bounding_boxes?: boolean;
  max_elements?: number;
};

export type DomSnapshotResult = {
  tab_id: string;
  url: string;
  schema_version: "autobyteus-dom-snapshot-v1";
  total_candidates: number;
  returned_elements: number;
  truncated: boolean;
  elements: DomSnapshotElement[];
};

export type RunScriptInput = {
  tab_id: string;
  javascript: string;
};

export type RunScriptResult = {
  tab_id: string;
  result_json: string;
};

export type BrowserToolErrorCode =
  | "browser_unsupported_in_current_environment"
  | "browser_tab_closed"
  | "browser_tab_not_found"
  | "browser_navigation_failed"
  | "browser_page_read_failed"
  | "dom_snapshot_failed"
  | "browser_javascript_execution_failed"
  | "browser_bridge_unavailable";

export type BrowserToolErrorPayload = {
  error: {
    code: BrowserToolErrorCode;
    message: string;
  };
};

export class BrowserToolError extends Error {
  readonly code: BrowserToolErrorCode;

  constructor(code: BrowserToolErrorCode, message: string) {
    super(message);
    this.name = "BrowserToolError";
    this.code = code;
  }
}
