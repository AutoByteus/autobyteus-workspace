import {
  ParameterDefinition,
  ParameterSchema,
  ParameterType,
} from "autobyteus-ts";
import { toJsonString } from "../json-utils.js";

export const PREVIEW_BRIDGE_BASE_URL_ENV = "AUTOBYTEUS_PREVIEW_BRIDGE_BASE_URL";
export const PREVIEW_BRIDGE_TOKEN_ENV = "AUTOBYTEUS_PREVIEW_BRIDGE_TOKEN";

export const OPEN_PREVIEW_TOOL_NAME = "open_preview";
export const NAVIGATE_PREVIEW_TOOL_NAME = "navigate_preview";
export const CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME = "capture_preview_screenshot";
export const GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME = "get_preview_console_logs";
export const EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME = "execute_preview_javascript";
export const OPEN_PREVIEW_DEVTOOLS_TOOL_NAME = "open_preview_devtools";
export const CLOSE_PREVIEW_TOOL_NAME = "close_preview";
export const PREVIEW_TOOL_NAMES = new Set<string>([
  OPEN_PREVIEW_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  OPEN_PREVIEW_DEVTOOLS_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
]);

export const isPreviewToolName = (value: string | null | undefined): boolean =>
  typeof value === "string" && PREVIEW_TOOL_NAMES.has(value.trim());

export const PREVIEW_WAIT_UNTIL_VALUES = ["domcontentloaded", "load"] as const;

export type PreviewReadyState = (typeof PREVIEW_WAIT_UNTIL_VALUES)[number];

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

export type CapturePreviewScreenshotInput = {
  preview_session_id: string;
  full_page?: boolean;
};

export type CapturePreviewScreenshotResult = {
  preview_session_id: string;
  artifact_path: string;
  mime_type: "image/png";
};

export type PreviewConsoleLogEntry = {
  sequence: number;
  level: "log" | "info" | "warn" | "error";
  message: string;
  timestamp_iso: string;
};

export type GetPreviewConsoleLogsInput = {
  preview_session_id: string;
  since_sequence?: number | null;
};

export type GetPreviewConsoleLogsResult = {
  preview_session_id: string;
  entries: PreviewConsoleLogEntry[];
  next_sequence: number;
};

export type ExecutePreviewJavascriptInput = {
  preview_session_id: string;
  javascript: string;
};

export type ExecutePreviewJavascriptResult = {
  preview_session_id: string;
  result_json: string;
};

export type OpenPreviewDevToolsInput = {
  preview_session_id: string;
  mode?: "detach";
};

export type OpenPreviewDevToolsResult = {
  preview_session_id: string;
  status: "opened";
};

export type ClosePreviewInput = {
  preview_session_id: string;
};

export type ClosePreviewResult = {
  preview_session_id: string;
  status: "closed";
};

export type PreviewErrorCode =
  | "preview_unsupported_in_current_environment"
  | "preview_session_closed"
  | "preview_session_not_found"
  | "preview_navigation_failed"
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

const normalizeWaitUntil = (value: unknown): PreviewReadyState | undefined => {
  const normalized = asTrimmedString(value);
  if (!normalized) {
    return undefined;
  }
  return PREVIEW_WAIT_UNTIL_VALUES.includes(normalized as PreviewReadyState)
    ? (normalized as PreviewReadyState)
    : undefined;
};

const assertPreviewSessionId = (toolName: string, previewSessionId: string | null): string => {
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

export const parseOpenPreviewInput = (
  rawArguments: Record<string, unknown>,
): OpenPreviewInput => ({
  url: asString(rawArguments.url) ?? "",
  title:
    asTrimmedString(rawArguments.title) ??
    asTrimmedString(rawArguments.window_title) ??
    null,
  reuse_existing:
    asBoolean(rawArguments.reuse_existing ?? rawArguments.reuseExisting) ?? false,
  wait_until:
    normalizeWaitUntil(rawArguments.wait_until ?? rawArguments.waitUntil) ?? "load",
});

export const parseNavigatePreviewInput = (
  rawArguments: Record<string, unknown>,
): NavigatePreviewInput => ({
  preview_session_id:
    asTrimmedString(rawArguments.preview_session_id) ??
    asTrimmedString(rawArguments.previewSessionId) ??
    "",
  url: asString(rawArguments.url) ?? "",
  wait_until:
    normalizeWaitUntil(rawArguments.wait_until ?? rawArguments.waitUntil) ?? "load",
});

export const parseCapturePreviewScreenshotInput = (
  rawArguments: Record<string, unknown>,
): CapturePreviewScreenshotInput => ({
  preview_session_id:
    asTrimmedString(rawArguments.preview_session_id) ??
    asTrimmedString(rawArguments.previewSessionId) ??
    "",
  full_page: asBoolean(rawArguments.full_page ?? rawArguments.fullPage) ?? false,
});

export const parseGetPreviewConsoleLogsInput = (
  rawArguments: Record<string, unknown>,
): GetPreviewConsoleLogsInput => ({
  preview_session_id:
    asTrimmedString(rawArguments.preview_session_id) ??
    asTrimmedString(rawArguments.previewSessionId) ??
    "",
  since_sequence:
    asInteger(rawArguments.since_sequence ?? rawArguments.sinceSequence) ?? null,
});

export const parseClosePreviewInput = (
  rawArguments: Record<string, unknown>,
): ClosePreviewInput => ({
  preview_session_id:
    asTrimmedString(rawArguments.preview_session_id) ??
    asTrimmedString(rawArguments.previewSessionId) ??
    "",
});

export const parseExecutePreviewJavascriptInput = (
  rawArguments: Record<string, unknown>,
): ExecutePreviewJavascriptInput => ({
  preview_session_id:
    asTrimmedString(rawArguments.preview_session_id) ??
    asTrimmedString(rawArguments.previewSessionId) ??
    "",
  javascript: asString(rawArguments.javascript) ?? "",
});

export const parseOpenPreviewDevToolsInput = (
  rawArguments: Record<string, unknown>,
): OpenPreviewDevToolsInput => ({
  preview_session_id:
    asTrimmedString(rawArguments.preview_session_id) ??
    asTrimmedString(rawArguments.previewSessionId) ??
    "",
  mode: asTrimmedString(rawArguments.mode) === "detach" ? "detach" : "detach",
});

export const assertOpenPreviewSemantics = (input: OpenPreviewInput): void => {
  assertUrl(OPEN_PREVIEW_TOOL_NAME, asTrimmedString(input.url));
};

export const assertNavigatePreviewSemantics = (input: NavigatePreviewInput): void => {
  assertPreviewSessionId(
    NAVIGATE_PREVIEW_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
  assertUrl(NAVIGATE_PREVIEW_TOOL_NAME, asTrimmedString(input.url));
};

export const assertCapturePreviewScreenshotSemantics = (
  input: CapturePreviewScreenshotInput,
): void => {
  assertPreviewSessionId(
    CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
};

export const assertGetPreviewConsoleLogsSemantics = (
  input: GetPreviewConsoleLogsInput,
): void => {
  assertPreviewSessionId(
    GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
  if (
    input.since_sequence !== null &&
    input.since_sequence !== undefined &&
    input.since_sequence < 0
  ) {
    throw new PreviewToolError(
      "preview_navigation_failed",
      `${GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME} requires since_sequence to be zero or greater.`,
    );
  }
};

export const assertClosePreviewSemantics = (input: ClosePreviewInput): void => {
  assertPreviewSessionId(
    CLOSE_PREVIEW_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
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

export const assertOpenPreviewDevToolsSemantics = (
  input: OpenPreviewDevToolsInput,
): void => {
  assertPreviewSessionId(
    OPEN_PREVIEW_DEVTOOLS_TOOL_NAME,
    asTrimmedString(input.preview_session_id),
  );
  if (input.mode && input.mode !== "detach") {
    throw new PreviewToolError(
      "preview_navigation_failed",
      `${OPEN_PREVIEW_DEVTOOLS_TOOL_NAME} only supports mode='detach'.`,
    );
  }
};

const buildWaitUntilParameter = () =>
  new ParameterDefinition({
    name: "wait_until",
    type: ParameterType.ENUM,
    description:
      "Ready-state to wait for before returning. Allowed values: domcontentloaded or load.",
    required: false,
    enumValues: [...PREVIEW_WAIT_UNTIL_VALUES],
    defaultValue: "load",
  });

const buildPreviewSessionIdParameter = () =>
  new ParameterDefinition({
    name: "preview_session_id",
    type: ParameterType.STRING,
    description: "Opaque preview session identifier returned by open_preview.",
    required: true,
  });

export const buildOpenPreviewParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    new ParameterDefinition({
      name: "url",
      type: ParameterType.STRING,
      description: "Absolute http, https, or file URL to open in the preview window.",
      required: true,
    }),
    new ParameterDefinition({
      name: "title",
      type: ParameterType.STRING,
      description: "Optional window title override for the preview session.",
      required: false,
    }),
    new ParameterDefinition({
      name: "reuse_existing",
      type: ParameterType.BOOLEAN,
      description:
        "When true, reuse an existing open preview session whose normalized URL matches.",
      required: false,
      defaultValue: false,
    }),
    buildWaitUntilParameter(),
  ]);

export const buildNavigatePreviewParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    buildPreviewSessionIdParameter(),
    new ParameterDefinition({
      name: "url",
      type: ParameterType.STRING,
      description: "Absolute http, https, or file URL to navigate the preview session to.",
      required: true,
    }),
    buildWaitUntilParameter(),
  ]);

export const buildCapturePreviewScreenshotParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    buildPreviewSessionIdParameter(),
    new ParameterDefinition({
      name: "full_page",
      type: ParameterType.BOOLEAN,
      description: "When true, attempt a full-page screenshot capture.",
      required: false,
      defaultValue: false,
    }),
  ]);

export const buildGetPreviewConsoleLogsParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    buildPreviewSessionIdParameter(),
    new ParameterDefinition({
      name: "since_sequence",
      type: ParameterType.INTEGER,
      description:
        "Optional exclusive lower bound for log entry sequence numbers.",
      required: false,
    }),
  ]);

export const buildExecutePreviewJavascriptParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    buildPreviewSessionIdParameter(),
    new ParameterDefinition({
      name: "javascript",
      type: ParameterType.STRING,
      description: "JavaScript source code to evaluate inside the preview session.",
      required: true,
    }),
  ]);

export const buildOpenPreviewDevToolsParameterSchema = (): ParameterSchema =>
  new ParameterSchema([
    buildPreviewSessionIdParameter(),
    new ParameterDefinition({
      name: "mode",
      type: ParameterType.ENUM,
      description: "DevTools opening mode. Only detach is supported in the shell-tab preview.",
      required: false,
      enumValues: ["detach"],
      defaultValue: "detach",
    }),
  ]);

export const buildClosePreviewParameterSchema = (): ParameterSchema =>
  new ParameterSchema([buildPreviewSessionIdParameter()]);

export const toPreviewErrorPayload = (error: unknown): PreviewErrorPayload => {
  if (error instanceof PreviewToolError) {
    return {
      error: {
        code: error.code,
        message: error.message,
      },
    };
  }
  return {
    error: {
      code: "preview_bridge_unavailable",
      message: error instanceof Error ? error.message : String(error),
    },
  };
};

export const toPreviewJsonString = (value: unknown): string => toJsonString(value, 2);
