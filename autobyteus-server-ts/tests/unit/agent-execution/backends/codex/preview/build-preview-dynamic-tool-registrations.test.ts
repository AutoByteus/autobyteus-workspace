import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CAPTURE_PREVIEW_SCREENSHOT_TOOL_NAME,
  CLOSE_PREVIEW_TOOL_NAME,
  EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
  LIST_PREVIEW_SESSIONS_TOOL_NAME,
  NAVIGATE_PREVIEW_TOOL_NAME,
  OPEN_PREVIEW_TOOL_NAME,
  PREVIEW_BRIDGE_BASE_URL_ENV,
  PREVIEW_BRIDGE_TOKEN_ENV,
  PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
  READ_PREVIEW_PAGE_TOOL_NAME,
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
      if (url.endsWith("/preview/list")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              sessions: [
                {
                  preview_session_id: "preview-session-1",
                  title: "Demo",
                  url: "http://localhost:3000/demo",
                },
              ],
            },
          }),
        };
      }
      if (url.endsWith("/preview/read-page")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              url: "http://localhost:3000/demo",
              cleaning_mode: "thorough",
              content: "<main>Demo</main>",
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
      if (url.endsWith("/preview/dom-snapshot")) {
        return {
          json: async () => ({
            ok: true,
            result: {
              preview_session_id: "preview-session-1",
              url: "http://localhost:3000/demo",
              schema_version: "autobyteus-preview-dom-snapshot-v1",
              total_candidates: 1,
              returned_elements: 1,
              truncated: false,
              elements: [
                {
                  element_id: "e1",
                  tag_name: "button",
                  dom_id: null,
                  css_selector: "button:nth-of-type(1)",
                  role: null,
                  name: null,
                  text: "Run",
                  href: null,
                  value: null,
                  bounding_box: { x: 10, y: 20, width: 100, height: 30 },
                },
              ],
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
    expect(registrations).toHaveLength(8);

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
    const listSessionsRegistration = registrations!.find(
      (registration) => registration.spec.name === LIST_PREVIEW_SESSIONS_TOOL_NAME,
    );
    const readPageRegistration = registrations!.find(
      (registration) => registration.spec.name === READ_PREVIEW_PAGE_TOOL_NAME,
    );
    const executeJavascriptRegistration = registrations!.find(
      (registration) => registration.spec.name === EXECUTE_PREVIEW_JAVASCRIPT_TOOL_NAME,
    );
    const domSnapshotRegistration = registrations!.find(
      (registration) => registration.spec.name === PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
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

    const listSessionsResult = await listSessionsRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-4",
      toolName: LIST_PREVIEW_SESSIONS_TOOL_NAME,
      arguments: {},
    });
    expect(JSON.parse(listSessionsResult.contentItems[0]!.text)).toEqual({
      sessions: [
        {
          preview_session_id: "preview-session-1",
          title: "Demo",
          url: "http://localhost:3000/demo",
        },
      ],
    });

    const readPageResult = await readPageRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-5",
      toolName: READ_PREVIEW_PAGE_TOOL_NAME,
      arguments: {
        preview_session_id: "preview-session-1",
      },
    });
    expect(JSON.parse(readPageResult.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      url: "http://localhost:3000/demo",
      cleaning_mode: "thorough",
      content: "<main>Demo</main>",
    });

    const domSnapshotResult = await domSnapshotRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-6",
      toolName: PREVIEW_DOM_SNAPSHOT_TOOL_NAME,
      arguments: {
        preview_session_id: "preview-session-1",
      },
    });
    expect(JSON.parse(domSnapshotResult.contentItems[0]!.text)).toEqual({
      preview_session_id: "preview-session-1",
      url: "http://localhost:3000/demo",
      schema_version: "autobyteus-preview-dom-snapshot-v1",
      total_candidates: 1,
      returned_elements: 1,
      truncated: false,
      elements: [
        {
          element_id: "e1",
          tag_name: "button",
          dom_id: null,
          css_selector: "button:nth-of-type(1)",
          role: null,
          name: null,
          text: "Run",
          href: null,
          value: null,
          bounding_box: { x: 10, y: 20, width: 100, height: 30 },
        },
      ],
    });

    const executeJavascriptResult = await executeJavascriptRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-7",
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

    const closeResult = await closePreviewRegistration!.handler({
      runId: "run-1",
      threadId: "thread-1",
      turnId: null,
      callId: "call-8",
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
