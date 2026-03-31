import { z } from "zod";
import type { ClaudeSdkClient } from "../../../../runtime-management/claude/client/claude-sdk-client.js";
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

const createClaudePreviewToolResult = (value: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: toPreviewJsonString(value) }],
});

const createClaudePreviewToolErrorResult = (error: unknown): Record<string, unknown> => ({
  content: [{ type: "text", text: toPreviewJsonString(toPreviewErrorPayload(error)) }],
  isError: true,
});

export const buildClaudePreviewToolDefinitions = async (options: {
  sdkClient: ClaudeSdkClient;
}): Promise<Record<string, unknown>[] | null> => {
  const previewToolService = getPreviewToolService();
  if (!previewToolService.isPreviewSupported()) {
    return null;
  }

  const openPreviewTool = await options.sdkClient.createToolDefinition({
    name: OPEN_PREVIEW_TOOL_NAME,
    description:
      "Open a frontend preview window and return a stable preview_session_id for follow-up operations.",
    inputSchema: {
      url: z.string().min(1, "url is required").describe(
        "Absolute http, https, or file URL to open in the preview window.",
      ),
      title: z.string().optional().describe("Optional preview window title override."),
      reuse_existing: z.boolean().optional().describe(
        "Reuse an existing preview session whose normalized URL matches.",
      ),
      wait_until: z.enum(PREVIEW_WAIT_UNTIL_VALUES).optional().describe(
        "Ready state to wait for before returning.",
      ),
    },
    handler: async (rawArguments) => {
      try {
        return createClaudePreviewToolResult(
          await previewToolService.openPreview(
            parseOpenPreviewInput((rawArguments as Record<string, unknown>) ?? {}),
          ),
        );
      } catch (error) {
        return createClaudePreviewToolErrorResult(error);
      }
    },
  });

  const navigatePreviewTool = await options.sdkClient.createToolDefinition({
    name: NAVIGATE_PREVIEW_TOOL_NAME,
    description:
      "Navigate an existing preview_session_id to a new URL and wait for the requested ready state.",
    inputSchema: {
      preview_session_id: z.string().min(1, "preview_session_id is required").describe(
        "Opaque preview session identifier returned by open_preview.",
      ),
      url: z.string().min(1, "url is required").describe(
        "Absolute http, https, or file URL to navigate the preview session to.",
      ),
      wait_until: z.enum(PREVIEW_WAIT_UNTIL_VALUES).optional().describe(
        "Ready state to wait for before returning.",
      ),
    },
    handler: async (rawArguments) => {
      try {
        return createClaudePreviewToolResult(
          await previewToolService.navigatePreview(
            parseNavigatePreviewInput((rawArguments as Record<string, unknown>) ?? {}),
          ),
        );
      } catch (error) {
        return createClaudePreviewToolErrorResult(error);
      }
    },
  });

  const capturePreviewScreenshotTool = await options.sdkClient.createToolDefinition({
    name: CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
    description:
      "Capture a screenshot from an existing preview session and return the artifact path.",
    inputSchema: {
      preview_session_id: z.string().min(1, "preview_session_id is required").describe(
        "Opaque preview session identifier returned by open_preview.",
      ),
      full_page: z.boolean().optional().describe(
        "When true, attempt a full-page screenshot capture.",
      ),
    },
    handler: async (rawArguments) => {
      try {
        return createClaudePreviewToolResult(
          await previewToolService.capturePreviewScreenshot(
            parseCapturePreviewScreenshotInput((rawArguments as Record<string, unknown>) ?? {}),
          ),
        );
      } catch (error) {
        return createClaudePreviewToolErrorResult(error);
      }
    },
  });

  const getPreviewConsoleLogsTool = await options.sdkClient.createToolDefinition({
    name: GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
    description:
      "Read console log entries from an existing preview session, optionally after a given sequence number.",
    inputSchema: {
      preview_session_id: z.string().min(1, "preview_session_id is required").describe(
        "Opaque preview session identifier returned by open_preview.",
      ),
      since_sequence: z.number().int().optional().describe(
        "Optional exclusive lower bound for log entry sequence numbers.",
      ),
    },
    handler: async (rawArguments) => {
      try {
        return createClaudePreviewToolResult(
          await previewToolService.getPreviewConsoleLogs(
            parseGetPreviewConsoleLogsInput((rawArguments as Record<string, unknown>) ?? {}),
          ),
        );
      } catch (error) {
        return createClaudePreviewToolErrorResult(error);
      }
    },
  });

  const closePreviewTool = await options.sdkClient.createToolDefinition({
    name: CLOSE_PREVIEW_TOOL_NAME,
    description:
      "Close an existing preview session and invalidate its preview_session_id for future use.",
    inputSchema: {
      preview_session_id: z.string().min(1, "preview_session_id is required").describe(
        "Opaque preview session identifier returned by open_preview.",
      ),
    },
    handler: async (rawArguments) => {
      try {
        return createClaudePreviewToolResult(
          await previewToolService.closePreview(
            parseClosePreviewInput((rawArguments as Record<string, unknown>) ?? {}),
          ),
        );
      } catch (error) {
        return createClaudePreviewToolErrorResult(error);
      }
    },
  });

  return [
    openPreviewTool,
    navigatePreviewTool,
    capturePreviewScreenshotTool,
    getPreviewConsoleLogsTool,
    closePreviewTool,
  ];
};
