import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_DEVTOOLS_TOOL_NAME,
  PREVIEW_BRIDGE_BASE_URL_ENV,
  PREVIEW_BRIDGE_TOKEN_ENV,
} from "../../../../../../src/agent-tools/preview/preview-tool-contract.js";
import { buildPreviewDynamicToolRegistrations } from "../../../../../../src/agent-execution/backends/codex/preview/build-preview-dynamic-tool-registrations.js";

describe("buildPreviewDynamicToolRegistrations", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env[PREVIEW_BRIDGE_BASE_URL_ENV];
    delete process.env[PREVIEW_BRIDGE_TOKEN_ENV];
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns null when the preview bridge is not configured", () => {
    expect(buildPreviewDynamicToolRegistrations()).toBeNull();
  });

  it("builds preview tool handlers and returns Codex text results", async () => {
    process.env[PREVIEW_BRIDGE_BASE_URL_ENV] = "http://127.0.0.1:39001";
    process.env[PREVIEW_BRIDGE_TOKEN_ENV] = "preview-token";

    globalThis.fetch = vi.fn(async (input) => {
      const url = String(input);
      if (url.endsWith("/preview/open")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              status: "opened",
              url: "http://localhost:3000/demo",
              title: "Demo",
            },
          }),
        };
      }
      if (url.endsWith("/preview/navigate")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              status: "navigated",
              url: "http://localhost:3000/other",
            },
          }),
        };
      }
      if (url.endsWith("/preview/screenshot")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              artifact_path: "/tmp/preview-session-1.png",
              mime_type: "image/png",
            },
          }),
        };
      }
      if (url.endsWith("/preview/console-logs")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              entries: [{ sequence: 1, level: "log", message: "ready", timestamp_iso: "2026-01-01T00:00:00.000Z" }],
              next_sequence: 2,
            },
          }),
        };
      }
      if (url.endsWith("/preview/javascript")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              result_json: "{\"ready\":true}",
            },
          }),
        };
      }
      if (url.endsWith("/preview/devtools")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              status: "opened",
            },
          }),
        };
      }
      if (url.endsWith("/preview/close")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              status: "closed",
            },
          }),
        };
      }
      throw new Error(`Unexpected preview bridge url: ${url}`);
    }) as typeof globalThis.fetch;

    const registrations = buildPreviewDynamicToolRegistrations();
    expect(registrations).not.toBeNull();
    expect(registrations).toHaveLength(7);

    const openPreviewRegistration = registrations!.find(
      (registration) => registration.spec.name === OPEN_PREVIEW_TOOL_NAME,
    );
    expect(openPreviewRegistration).toBeDefined();

    const result = await openPreviewRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-1",
      toolName: OPEN_PREVIEW_TOOL_NAME,
      arguments: {
        url: "http://localhost:3000/demo",
      },
    });

    expect(result.success).toBe(true);
    expect(result.contentItems).toHaveLength(1);
    expect(JSON.parse(result.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      status: "opened",
      url: "http://localhost:3000/demo",
      title: "Demo",
    });

    const navigatePreviewRegistration = registrations!.find(
      (registration) => registration.spec.name === NAVIGATE_PREVIEW_TOOL_NAME,
    );
    const screenshotRegistration = registrations!.find(
      (registration) => registration.spec.name === CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
    );
    const consoleLogsRegistration = registrations!.find(
      (registration) => registration.spec.name === GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
    );
    const executeJavascriptRegistration = registrations!.find(
      (registration) => registration.spec.name === EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
    );
    const openDevToolsRegistration = registrations!.find(
      (registration) => registration.spec.name === OPEN_PREVIEW_DEVTOOLS_TOOL_NAME,
    );
    const closePreviewRegistration = registrations!.find(
      (registration) => registration.spec.name === CLOSE_PREVIEW_TOOL_NAME,
    );

    const navigateResult = await navigatePreviewRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-2",
      toolName: NAVIGATE_PREVIEW_TOOL_NAME,
      arguments: {
        preview_session_id: "preview-session-1",
        url: "http://localhost:3000/other",
      },
    });
    expect(JSON.parse(navigateResult.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      status: "navigated",
      url: "http://localhost:3000/other",
    });

    const screenshotResult = await screenshotRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-3",
      toolName: CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
      arguments: {
        preview_session_id: "preview-session-1",
      },
    });
    expect(JSON.parse(screenshotResult.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      artifact_path: "/tmp/preview-session-1.png",
      mime_type: "image/png",
    });

    const consoleLogsResult = await consoleLogsRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-4",
      toolName: GET_PREVIEW_CONSOLE_LOGS_TOOL_NAME,
      arguments: {
        preview_session_id: "preview-session-1",
      },
    });
    expect(JSON.parse(consoleLogsResult.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      entries: [{ sequence: 1, level: "log", message: "ready", timestamp_iso: "2026-01-01T00:00:00.000Z" }],
      next_sequence: 2,
    });

    const executeJavascriptResult = await executeJavascriptRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-5",
      toolName: EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
      arguments: {
        preview_session_id: "preview-session-1",
        javascript: "JSON.stringify({ ready: true })",
      },
    });
    expect(JSON.parse(executeJavascriptResult.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      result_json: "{\"ready\":true}",
    });

    const openDevToolsResult = await openDevToolsRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-6",
      toolName: OPEN_PREVIEW_DEVTOOLS_TOOL_NAME,
      arguments: {
        preview_session_id: "preview-session-1",
      },
    });
    expect(JSON.parse(openDevToolsResult.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      status: "opened",
    });

    const closeResult = await closePreviewRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-7",
      toolName: CLOSE_PREVIEW_TOOL_NAME,
      arguments: {
        preview_session_id: "preview-session-1",
      },
    });
    expect(JSON.parse(closeResult.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      status: "closed",
    });
  });
});
