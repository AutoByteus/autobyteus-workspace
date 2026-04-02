export const PREVIEW_BRIDGE_BASE_URL_ENV = "AUTOBYTEUS_PREVIEW_BRIDGE_BASE_URL";
export const PREVIEW_BRIDGE_TOKEN_ENV = "AUTOBYTEUS_PREVIEW_BRIDGE_TOKEN";

export const OPEN_PREVIEW_TOOL_NAME = "open_preview";
export const NAVIGATE_PREVIEW_TOOL_NAME = "navigate_preview";
export const CLOSE_PREVIEW_TOOL_NAME = "close_preview";
export const LIST_PREVIEW_SESSIONS_TOOL_NAME = "list_preview_sessions";
export const READ_PREVIEW_PAGE_TOOL_NAME = "read_preview_page";
export const CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME = "capture_preview_screenshot";
export const PREVIEW_DOM_SNAPSHOT_TOOL_NAME = "preview_dom_snapshot";
export const EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME = "execute_preview_javascript";

export const PREVIEW_TOOL_NAME_LIST = [
  OPEN_PREVIEW_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  READ_PREVIEW_PAGE_TOOL_NAME,
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
] as const;

export type PreviewToolName = (typeof PREVIEW_TOOL_NAME_LIST)[number];

export const PREVIEW_TOOL_NAMES = new Set<string>(PREVIEW_TOOL_NAME_LIST);

export const isPreviewToolName = (value: string | null | undefined): boolean =>
  typeof value === "string" && PREVIEW_TOOL_NAMES.has(value.trim());

export const PREVIEW_WAIT_UNTIL_VALUES = ["domcontentloaded", "load"] as const;
export const PREVIEW_READ_PAGE_CLEANING_MODES = ["none", "light", "thorough"] as const;

export type PreviewReadyState = (typeof PREVIEW_WAIT_UNTIL_VALUES)[number];
export type PreviewReadPageCleaningMode =
  (typeof PREVIEW_READ_PAGE_CLEANING_MODES)[number];

export type PreviewToolParameterType = "string" | "boolean" | "integer" | "enum";

export type PreviewToolParameterSpec = {
  name: string;
  type: PreviewToolParameterType;
  description: string;
  required: boolean;
  enum_values?: readonly string[];
  default_value?: string | boolean | number;
  minimum?: number;
  maximum?: number;
};

export type PreviewSessionSummary = {
  preview_session_id: string;
  title: string | null;
  url: string;
};

export type OpenPreviewInput = {
  url: string;
  title?: string | null;
  reuse_existing?: boolean;
  wait_until?: PreviewReadyState;
};

export type OpenPreviewResult = {
  preview_session_id: string;
  status: "opened" | "reused";
  url: string;
  title: string | null;
};

export type NavigatePreviewInput = {
  preview_session_id: string;
  url: string;
  wait_until?: PreviewReadyState;
};

export type NavigatePreviewResult = {
  preview_session_id: string;
  status: "navigated";
  url: string;
};

export type ClosePreviewInput = {
  preview_session_id: string;
};

export type ClosePreviewResult = {
  preview_session_id: string;
  status: "closed";
};

export type ListPreviewSessionsInput = Record<string, never>;

export type ListPreviewSessionsResult = {
  sessions: PreviewSessionSummary[];
};

export type ReadPreviewPageInput = {
  preview_session_id: string;
  cleaning_mode?: PreviewReadPageCleaningMode;
};

export type ReadPreviewPageResult = {
  preview_session_id: string;
  url: string;
  cleaning_mode: PreviewReadPageCleaningMode;
  content: string;
};

export type CapturePreviewScreenshotInput = {
  preview_session_id: string;
  full_page?: boolean;
};

export type CapturePreviewScreenshotResult = {
  preview_session_id: string;
  artifact_path: string;
  mime_type: "image/png";
};

export type PreviewDomSnapshotBoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PreviewDomSnapshotElement = {
  element_id: string;
  tag_name: string;
  dom_id: string | null;
  css_selector: string;
  role: string | null;
  name: string | null;
  text: string | null;
  href: string | null;
  value: string | null;
  bounding_box: PreviewDomSnapshotBoundingBox | null;
};

export type PreviewDomSnapshotInput = {
  preview_session_id: string;
  include_non_interactive?: boolean;
  include_bounding_boxes?: boolean;
  max_elements?: number;
};

export type PreviewDomSnapshotResult = {
  preview_session_id: string;
  url: string;
  schema_version: "autobyteus-preview-dom-snapshot-v1";
  total_candidates: number;
  returned_elements: number;
  truncated: boolean;
  elements: PreviewDomSnapshotElement[];
};

export type ExecutePreviewJavascriptInput = {
  preview_session_id: string;
  javascript: string;
};

export type ExecutePreviewJavascriptResult = {
  preview_session_id: string;
  result_json: string;
};

export type PreviewErrorCode =
  | "preview_unsupported_in_current_environment"
  | "preview_session_closed"
  | "preview_session_not_found"
  | "preview_navigation_failed"
  | "preview_page_read_failed"
  | "preview_dom_snapshot_failed"
  | "preview_javascript_execution_failed"
  | "preview_bridge_unavailable";

export type PreviewErrorPayload = {
  error: {
    code: PreviewErrorCode;
    message: string;
  };
};

export class PreviewToolError extends Error {
  readonly code: PreviewErrorCode;

  constructor(code: PreviewErrorCode, message: string) {
    super(message);
    this.name = "PreviewToolError";
    this.code = code;
  }
}
