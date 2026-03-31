import {
  createCodexDynamicToolTextResult,
  type CodexDynamicToolCallResult,
  type CodexDynamicToolRegistration,
} from "../codex-dynamic-tool.js";
import type { JsonObject } from "../codex-app-server-json.js";
import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  PREVIEW_WAIT_UNTIL_VALUES,
  parseCapturePreviewScreenshotInput,
  parseClosePreviewInput,
  parseGetPreviewConsoleLogsInput,
  parseNavigatePreviewInput,
  parseOpenPreviewInput,
  toPreviewErrorPayload,
  toPreviewJsonString,
} from "../../../../agent-tools/preview/preview-tool-contract.js";
import { getPreviewToolService } from "../../../../agent-tools/preview/preview-tool-service.js";

const buildOpenPreviewToolSpec = (): JsonObject => ({
  name: OPEN_PREVIEW_TOOL_NAME,
  description:
    "Open a frontend preview window and return a stable preview_session_id for follow-up operations.",
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "Absolute http, https, or file URL to open in the preview window.",
      },
      title: {
        type: "string",
        description: "Optional preview window title override.",
      },
      reuse_existing: {
        type: "boolean",
        description: "Reuse an existing preview session whose normalized URL matches.",
      },
      wait_until: {
        type: "string",
        enum: [...PREVIEW_WAIT_UNTIL_VALUES],
        description: "Ready state to wait for before returning.",
      },
    },
    required: ["url"],
    additionalProperties: false,
  },
});

const buildNavigatePreviewToolSpec = (): JsonObject => ({
  name: NAVIGATE_PREVIEW_TOOL_NAME,
  description:
    "Navigate an existing preview_session_id to a new URL and wait for the requested ready state.",
  inputSchema: {
    type: "object",
    properties: {
      preview_session_id: {
        type: "string",
        description: "Opaque preview session identifier returned by open_preview.",
      },
      url: {
        type: "string",
        description: "Absolute http, https, or file URL to navigate the preview session to.",
      },
      wait_until: {
        type: "string",
        enum: [...PREVIEW_WAIT_UNTIL_VALUES],
        description: "Ready state to wait for before returning.",
      },
    },
    required: ["preview_session_id", "url"],
    additionalProperties: false,
  },
});

const buildCapturePreviewScreenshotToolSpec = (): JsonObject => ({
  name: CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  description:
    "Capture a screenshot from an existing preview session and return the artifact path.",
  inputSchema: {
    type: "object",
    properties: {
      preview_session_id: {
        type: "string",
        description: "Opaque preview session identifier returned by open_preview.",
      },
      full_page: {
        type: "boolean",
        description: "When true, attempt a full-page screenshot capture.",
      },
    },
    required: ["preview_session_id"],
    additionalProperties: false,
  },
});

const buildGetPreviewConsoleLogsToolSpec = (): JsonObject => ({
  name: GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
  description:
    "Read console log entries from an existing preview session, optionally after a given sequence number.",
  inputSchema: {
    type: "object",
    properties: {
      preview_session_id: {
        type: "string",
        description: "Opaque preview session identifier returned by open_preview.",
      },
      since_sequence: {
        type: "integer",
        description: "Optional exclusive lower bound for log entry sequence numbers.",
      },
    },
    required: ["preview_session_id"],
    additionalProperties: false,
  },
});

const buildClosePreviewToolSpec = (): JsonObject => ({
  name: CLOSE_PREVIEW_TOOL_NAME,
  description:
    "Close an existing preview session and invalidate its preview_session_id for future use.",
  inputSchema: {
    type: "object",
    properties: {
      preview_session_id: {
        type: "string",
        description: "Opaque preview session identifier returned by open_preview.",
      },
    },
    required: ["preview_session_id"],
    additionalProperties: false,
  },
});

const runPreviewOperation = async <T>(operation: () => Promise<T>): Promise<CodexDynamicToolCallResult> => {
  try {
    const result = await operation();
    return createCodexDynamicToolTextResult(toPreviewJsonString(result), true);
  } catch (error) {
    return createCodexDynamicToolTextResult(
      toPreviewJsonString(toPreviewErrorPayload(error)),
      false,
    );
  }
};

export const buildPreviewDynamicToolRegistrations = (): CodexDynamicToolRegistration[] | null => {
  const previewToolService = getPreviewToolService();
  if (!previewToolService.isPreviewSupported()) {
    return null;
  }

  return [
    {
      spec: buildOpenPreviewToolSpec(),
      handler: async ({ arguments: toolArguments }) =>
        runPreviewOperation(async () =>
          previewToolService.openPreview(parseOpenPreviewInput(toolArguments)),
        ),
    },
    {
      spec: buildNavigatePreviewToolSpec(),
      handler: async ({ arguments: toolArguments }) =>
        runPreviewOperation(async () =>
          previewToolService.navigatePreview(parseNavigatePreviewInput(toolArguments)),
        ),
    },
    {
      spec: buildCapturePreviewScreenshotToolSpec(),
      handler: async ({ arguments: toolArguments }) =>
        runPreviewOperation(async () =>
          previewToolService.capturePreviewScreenshot(
            parseCapturePreviewScreenshotInput(toolArguments),
          ),
        ),
    },
    {
      spec: buildGetPreviewConsoleLogsToolSpec(),
      handler: async ({ arguments: toolArguments }) =>
        runPreviewOperation(async () =>
          previewToolService.getPreviewConsoleLogs(
            parseGetPreviewConsoleLogsInput(toolArguments),
          ),
        ),
    },
    {
      spec: buildClosePreviewToolSpec(),
      handler: async ({ arguments: toolArguments }) =>
        runPreviewOperation(async () =>
          previewToolService.closePreview(parseClosePreviewInput(toolArguments)),
        ),
    },
  ];
};
